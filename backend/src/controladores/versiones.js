// Estándares de sala (HU-004): versiones de cada tipo de sala. El colaborador propone y el líder aprueba o rechaza.
// Una sola versión Vigente y una sola Pendiente por tipo de sala (índices únicos parciales de la base).
import { prisma } from '../db.js';
import { ESTADOS_VERSION, mismosItems, validarMotivo, validarPropuesta } from '../reglas/versiones.js';

// Cada versión viaja con su tipo de sala, quién la propuso, quién la resolvió y sus tecnologías (con su categoría).
const DETALLE = {
  tipoSala: { select: { id: true, estandar: true, tamano: true } },
  autor: { select: { nombre: true, apellido: true } },
  resueltaPor: { select: { nombre: true, apellido: true } },
  items: { include: { tecnologia: { include: { categoria: true } } }, orderBy: { tecnologia: { categoria: { orden: 'asc' } } } },
};

// Versión pendiente de la dirección (/:id). Devuelve { version } o { estado, cuerpo } con el error.
async function buscarPendiente(req) {
  const id = Number(req.params.id);
  const version = Number.isInteger(id) ? await prisma.versionEstandar.findUnique({ where: { id } }) : null;
  if (!version) return { estado: 404, cuerpo: { error: 'La versión no existe.' } };
  if (version.estado !== 'Pendiente') return { estado: 409, cuerpo: { error: 'La versión no está pendiente de aprobación.' } };
  return { version };
}

// GET /api/versiones?tipoSalaId=vc-mediana&estado=Pendiente: versiones, de la más nueva a la más vieja. Los dos filtros son opcionales.
export async function listar(req, res) {
  const { tipoSalaId, estado } = req.query;
  if (estado !== undefined && !ESTADOS_VERSION.includes(estado)) return res.status(400).json({ error: 'Estado no válido.' });
  res.json(await prisma.versionEstandar.findMany({
    where: { ...(typeof tipoSalaId === 'string' && { tipoSalaId }), ...(estado && { estado }) },
    include: DETALLE,
    orderBy: [{ tipoSalaId: 'asc' }, { numero: 'desc' }],
  }));
}

// POST /api/versiones: propone la siguiente versión del tipo de sala. Queda Pendiente hasta que el líder la resuelva.
export async function proponer(req, res) {
  const { errores, datos } = validarPropuesta(req.body);
  if (errores) return res.status(400).json({ errores });
  const { tipoSalaId, items, observaciones } = datos;
  if (!(await prisma.tipoSala.findUnique({ where: { id: tipoSalaId } }))) {
    return res.status(400).json({ errores: { tipoSalaId: 'El tipo de sala no existe' } });
  }
  const activas = await prisma.tecnologia.count({ where: { id: { in: items.map((i) => i.tecnologiaId) }, estado: 'Activa' } });
  if (activas !== items.length) return res.status(400).json({ errores: { items: 'Solo se pueden incluir tecnologías activas del catálogo' } });
  if (await prisma.versionEstandar.findFirst({ where: { tipoSalaId, estado: 'Pendiente' } })) {
    return res.status(409).json({ error: 'Ya hay una versión pendiente de aprobación para este tipo de sala' });
  }
  const vigente = await prisma.versionEstandar.findFirst({ where: { tipoSalaId, estado: 'Vigente' }, include: { items: true } });
  if (vigente && mismosItems(vigente.items, items)) return res.status(400).json({ error: 'No hay cambios respecto de la versión vigente' });
  const { _max } = await prisma.versionEstandar.aggregate({ where: { tipoSalaId }, _max: { numero: true } });
  const version = await prisma.versionEstandar.create({
    data: { tipoSalaId, numero: (_max.numero ?? 0) + 1, observaciones, autorId: req.usuario.id, items: { create: items } },
    include: DETALLE,
  });
  res.status(201).json(version);
}

// POST /api/versiones/:id/aprobar: la pendiente pasa a Vigente y la vigente anterior a Histórica, en una sola transacción.
// Los proyectos guardados conservan la versión con la que se crearon.
export async function aprobar(req, res) {
  const { estado, cuerpo, version } = await buscarPendiente(req);
  if (estado) return res.status(estado).json(cuerpo);
  const aprobada = await prisma.$transaction(async (tx) => {
    await tx.versionEstandar.updateMany({ where: { tipoSalaId: version.tipoSalaId, estado: 'Vigente' }, data: { estado: 'Historica' } });
    return tx.versionEstandar.update({
      where: { id: version.id },
      data: { estado: 'Vigente', resueltaPorId: req.usuario.id, fechaResolucion: new Date() },
      include: DETALLE,
    });
  });
  res.json(aprobada);
}

// POST /api/versiones/:id/rechazar: la pendiente pasa a Rechazada; la vigente no cambia. El motivo es opcional.
export async function rechazar(req, res) {
  const { estado, cuerpo, version } = await buscarPendiente(req);
  if (estado) return res.status(estado).json(cuerpo);
  const { error, motivo } = validarMotivo(req.body?.motivo);
  if (error) return res.status(400).json({ error });
  res.json(await prisma.versionEstandar.update({
    where: { id: version.id },
    data: { estado: 'Rechazada', motivoRechazo: motivo, resueltaPorId: req.usuario.id, fechaResolucion: new Date() },
    include: DETALLE,
  }));
}
