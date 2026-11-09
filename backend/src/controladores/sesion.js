// Inicio de sesión (HU-001), consulta de la sesión, salida y cambio de la propia contraseña
import bcrypt from 'bcrypt';
import { prisma } from '../db.js';
import { CAMPOS_SESION, abrirSesion, cerrarSesion, usuarioDeSesion } from '../middlewares/sesion.js';
import { CLAVES_SIN_REPETIR, INTENTOS_MAXIMOS, MINUTOS_BLOQUEO, bloqueada, faltasDeClave, temporalVencida } from '../reglas/acceso.js';

const GENERICO = { error: 'Correo o contraseña incorrectos.' };
const HASH_FICTICIO = await bcrypt.hash('cuenta-inexistente', 12); // misma demora cuando el correo no existe
const texto = (valor) => (typeof valor === 'string' ? valor : '');

// Lo que la interfaz necesita: el rol, para mostrar los apartados, y si tiene que cambiar la contraseña temporal
const aSesion = ({ rol, claveTemporalVence, ...usuario }) => ({ ...usuario, rol: rol.nombre, claveTemporal: claveTemporalVence !== null });

// POST /api/sesion: mismo mensaje si el correo no existe, si la contraseña falla, si la temporal venció o si la cuenta está bloqueada
// 5 fallos seguidos bloquean la cuenta 15 minutos. Durante el bloqueo no se verifica la contraseña
export async function ingresar(req, res) {
  const email = texto(req.body?.email).trim().toLowerCase();
  const clave = texto(req.body?.clave);
  if (!email || !clave) return res.status(400).json({ error: 'Completá el correo y la contraseña.' });
  const usuario = await prisma.usuario.findUnique({ where: { email } });
  if (!usuario || bloqueada(usuario)) {
    await bcrypt.compare(clave, HASH_FICTICIO);
    return res.status(401).json(GENERICO);
  }
  if (!(await bcrypt.compare(clave, usuario.claveHash)) || temporalVencida(usuario)) {
    // La suma la hace la base: dos intentos al mismo tiempo no se pisan
    const { intentosFallidos } = await prisma.usuario.update({ where: { id: usuario.id }, data: { intentosFallidos: { increment: 1 } } });
    if (intentosFallidos >= INTENTOS_MAXIMOS) {
      await prisma.usuario.update({
        where: { id: usuario.id },
        data: { intentosFallidos: 0, bloqueadaHasta: new Date(Date.now() + MINUTOS_BLOQUEO * 60_000) },
      });
    }
    return res.status(401).json(GENERICO);
  }
  const actual = await prisma.usuario.update({
    where: { id: usuario.id },
    data: { intentosFallidos: 0, bloqueadaHasta: null, ultimoIngreso: new Date() },
    select: CAMPOS_SESION,
  });
  abrirSesion(res, actual.id);
  res.json({ usuario: aSesion(actual) });
}

// GET /api/sesion: quién ingresó. La interfaz lo pregunta al abrirse, porque no puede leer la cookie. Sin sesión: usuario null
export async function consultar(req, res) {
  const usuario = await usuarioDeSesion(req);
  res.json({ usuario: usuario && aSesion(usuario) });
}

// DELETE /api/sesion: salir
export function salir(req, res) {
  cerrarSesion(res);
  res.status(204).end();
}

// PUT /api/sesion/clave: con contraseña temporal es obligatorio y no pide la actual
// La nueva cumple la política y no repite ninguna de las últimas cinco (la actual y las cuatro anteriores)
export async function cambiarClave(req, res) {
  const actual = texto(req.body?.actual);
  const nueva = texto(req.body?.nueva);
  const usuario = await prisma.usuario.findUnique({
    where: { id: req.usuario.id },
    include: { clavesAnteriores: { orderBy: { fecha: 'desc' }, take: CLAVES_SIN_REPETIR - 1 } },
  });
  if (temporalVencida(usuario)) return res.status(400).json({ error: 'La contraseña temporal venció. Pedí una nueva al administrador.' });
  if (!usuario.claveTemporalVence && !(await bcrypt.compare(actual, usuario.claveHash))) {
    return res.status(400).json({ errores: { actual: 'La contraseña actual no es correcta.' } });
  }
  const falta = faltasDeClave(nueva);
  if (falta) return res.status(400).json({ errores: { nueva: falta } });
  if (nueva !== texto(req.body?.repetida)) return res.status(400).json({ errores: { repetida: 'Las contraseñas no coinciden.' } });
  for (const hash of [usuario.claveHash, ...usuario.clavesAnteriores.map((c) => c.claveHash)]) {
    if (await bcrypt.compare(nueva, hash)) {
      return res.status(400).json({ errores: { nueva: `Tiene que ser distinta de tus últimas ${CLAVES_SIN_REPETIR} contraseñas.` } });
    }
  }
  const actualizado = await prisma.usuario.update({
    where: { id: usuario.id },
    data: { claveHash: await bcrypt.hash(nueva, 12), claveTemporalVence: null, clavesAnteriores: { create: { claveHash: usuario.claveHash } } },
    select: CAMPOS_SESION,
  });
  res.json({ usuario: aSesion(actualizado) });
}
