// Cuentas de usuario (apartado Administrador): alta, edición, contraseña temporal y desbloqueo
// Las contraseñas se guardan solo como hash bcrypt (costo 12). La temporal se devuelve una sola vez, al generarla
import bcrypt from 'bcrypt';
import { prisma } from '../db.js';
import { generarClaveTemporal, validarCuenta, venceTemporal } from '../reglas/usuarios.js';

const NO_EXISTE = { error: 'La cuenta no existe.' };
// Lo que ve el administrador: nunca el hash ni los intentos fallidos
const CAMPOS = {
  id: true, nombre: true, apellido: true, email: true, rolId: true, rol: { select: { nombre: true } },
  claveTemporalVence: true, bloqueadaHasta: true, ultimoIngreso: true,
};

// "actual" marca la cuenta de quien hace el pedido
const aRespuesta = ({ rol, ...usuario }, req) => ({ ...usuario, rol: rol.nombre, actual: usuario.id === req.usuario.id });

function buscar(req, select = CAMPOS) {
  const id = Number(req.params.id);
  return Number.isInteger(id) ? prisma.usuario.findUnique({ where: { id }, select }) : null;
}

// Valida el pedido completo: forma, rol existente, correo único y que quede al menos un administrador. Devuelve { estado, cuerpo } o { datos }
async function revisar(req, previa) {
  const { errores, datos } = validarCuenta(req.body);
  if (errores) return { estado: 400, cuerpo: { errores } };
  if (!(await prisma.rol.findUnique({ where: { id: datos.rolId } }))) {
    return { estado: 400, cuerpo: { errores: { rolId: 'El rol no existe.' } } };
  }
  const repetido = await prisma.usuario.findFirst({ where: { email: { equals: datos.email, mode: 'insensitive' }, ...(previa && { id: { not: previa.id } }) } });
  if (repetido) return { estado: 409, cuerpo: { errores: { email: 'Ya existe una cuenta con ese correo' } } };
  if (previa?.rolId === 'administrador' && datos.rolId !== 'administrador' && (await prisma.usuario.count({ where: { rolId: 'administrador' } })) === 1) {
    return { estado: 400, cuerpo: { errores: { rolId: 'Tiene que quedar al menos un administrador' } } };
  }
  return { datos };
}

// Contraseña temporal nueva: hash, vencimiento a las 24 h y cuenta desbloqueada
async function nuevaTemporal() {
  const clave = generarClaveTemporal();
  return { clave, acceso: { claveHash: await bcrypt.hash(clave, 12), claveTemporalVence: venceTemporal(), intentosFallidos: 0, bloqueadaHasta: null } };
}

// GET /api/usuarios: todas las cuentas, ordenadas por rol y apellido
export async function listar(req, res) {
  const usuarios = await prisma.usuario.findMany({ select: CAMPOS, orderBy: [{ rol: { nombre: 'asc' } }, { apellido: 'asc' }, { nombre: 'asc' }] });
  res.json(usuarios.map((u) => aRespuesta(u, req)));
}

// POST /api/usuarios: alta con contraseña temporal
export async function crear(req, res) {
  const { estado, cuerpo, datos } = await revisar(req);
  if (estado) return res.status(estado).json(cuerpo);
  const { clave, acceso } = await nuevaTemporal();
  const usuario = await prisma.usuario.create({ data: { ...datos, ...acceso }, select: CAMPOS });
  res.status(201).json({ usuario: aRespuesta(usuario, req), claveTemporal: clave });
}

// PUT /api/usuarios/:id: nombre, apellido, correo y rol. No toca la contraseña
export async function editar(req, res) {
  const previa = await buscar(req);
  if (!previa) return res.status(404).json(NO_EXISTE);
  const { estado, cuerpo, datos } = await revisar(req, previa);
  if (estado) return res.status(estado).json(cuerpo);
  res.json(aRespuesta(await prisma.usuario.update({ where: { id: previa.id }, data: datos, select: CAMPOS }), req));
}

// POST /api/usuarios/:id/clave-temporal: blanqueo. La contraseña anterior deja de funcionar y pasa al historial
export async function asignarClaveTemporal(req, res) {
  const previa = await buscar(req, { id: true, claveHash: true });
  if (!previa) return res.status(404).json(NO_EXISTE);
  const { clave, acceso } = await nuevaTemporal();
  const usuario = await prisma.usuario.update({
    where: { id: previa.id },
    data: { ...acceso, clavesAnteriores: { create: { claveHash: previa.claveHash } } },
    select: CAMPOS,
  });
  res.json({ usuario: aRespuesta(usuario, req), claveTemporal: clave });
}

// POST /api/usuarios/:id/desbloquear: borra el bloqueo por intentos fallidos
export async function desbloquear(req, res) {
  const previa = await buscar(req);
  if (!previa) return res.status(404).json(NO_EXISTE);
  res.json(aRespuesta(await prisma.usuario.update({ where: { id: previa.id }, data: { intentosFallidos: 0, bloqueadaHasta: null }, select: CAMPOS }), req));
}
