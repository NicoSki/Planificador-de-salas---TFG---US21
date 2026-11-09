import { prisma } from '../db.js';

//Las medidas son Decimal en la base: se mandan como número (4.5), no como texto ("4.5").
const conMedidas = (t) => ({ ...t, ancho: t.ancho.toNumber(), largo: t.largo.toNumber() });

//GET /api/categorias: las 9 categorías, en el orden de los grupos del catálogo y el configurador
export async function listarCategorias(req, res) {
  res.json(await prisma.categoria.findMany({ orderBy: { orden: 'asc' } }));
}

//GET /api/tipos-sala: los 6 tipos de sala con medidas y capacidad de referencia
export async function listarTiposSala(req, res) {
  res.json((await prisma.tipoSala.findMany({ orderBy: { orden: 'asc' } })).map(conMedidas));
}

//GET /api/sitios: las 3 sedes
export async function listarSitios(req, res) {
  res.json(await prisma.sitio.findMany({ orderBy: { nombre: 'asc' } }));
}

//GET /api/roles: los 7 roles, para el formulario de cuentas del Administrador
export async function listarRoles(req, res) {
  res.json(await prisma.rol.findMany({ orderBy: { nombre: 'asc' } }));
}
