// Sesión (HU-001): JWT de 8 horas en una cookie HttpOnly, Secure y SameSite=Strict, y autorización por rol en el servidor
// El usuario y su rol se leen de la base en cada pedido: un cambio de rol hecho por el administrador rige al instante
import jwt from 'jsonwebtoken';
import { prisma } from '../db.js';
import { HORAS_SESION, puede } from '../reglas/acceso.js';

if (!process.env.JWT_SECRETO) throw new Error('Falta JWT_SECRETO en backend/.env');

const OPCIONES_COOKIE = { httpOnly: true, secure: true, sameSite: 'strict', path: '/' };
// Datos de quien hace el pedido: nunca el hash
export const CAMPOS_SESION = { id: true, nombre: true, apellido: true, email: true, rolId: true, rol: { select: { nombre: true } }, claveTemporalVence: true };

// Firma el JWT y lo deja en la cookie. JavaScript del navegador no la puede leer
export function abrirSesion(res, id) {
  const token = jwt.sign({ sub: String(id) }, process.env.JWT_SECRETO, { algorithm: 'HS256', expiresIn: `${HORAS_SESION}h` });
  res.cookie('sesion', token, { ...OPCIONES_COOKIE, maxAge: HORAS_SESION * 3_600_000 });
}

export const cerrarSesion = (res) => res.clearCookie('sesion', OPCIONES_COOKIE);

// Usuario de la cookie, o null si falta, venció, fue alterada o la cuenta ya no existe
export async function usuarioDeSesion(req) {
  const token = req.headers.cookie?.match(/(?:^|;\s*)sesion=([^;]+)/)?.[1];
  let id;
  try {
    id = Number(jwt.verify(token ?? '', process.env.JWT_SECRETO, { algorithms: ['HS256'] }).sub);
  } catch {
    return null;
  }
  return Number.isInteger(id) ? prisma.usuario.findUnique({ where: { id }, select: CAMPOS_SESION }) : null;
}

// Exige una sesión válida
export async function autenticar(req, res, next) {
  req.usuario = await usuarioDeSesion(req);
  if (!req.usuario) return res.status(401).json({ error: 'Tu sesión venció. Ingresá de nuevo.' });
  next();
}

// Con contraseña temporal solo se puede cambiar la contraseña (rutas de /api/sesion)
export function exigirClaveDefinitiva(req, res, next) {
  if (req.usuario.claveTemporalVence) return res.status(403).json({ error: 'Primero cambiá la contraseña temporal.' });
  next();
}

// Deja pasar si el rol tiene alguno de los permisos
export const permitir = (...permisos) => (req, res, next) =>
  permisos.some((p) => puede(req.usuario.rolId, p)) ? next() : res.status(403).json({ error: 'Tu rol no tiene permiso para esta acción.' });
