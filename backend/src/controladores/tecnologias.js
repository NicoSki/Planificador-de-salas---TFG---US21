import { prisma } from '../db.js';
import { ESTADOS, validarTecnologia } from '../reglas/tecnologias.js';

const CON_CATEGORIA = { categoria: true };
const NO_EXISTE = { error: 'La tecnología no existe.' };



function buscar(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) ? prisma.tecnologia.findUnique({ where: { id } }) : null;
}

// Valida el pedido completo: forma, categoría y tipo de sala existentes. Devuelve { estado, cuerpo } o { datos }
async function revisar(req, { alta }) {
  const { errores, datos } = validarTecnologia(req.body, { alta });
  if (errores) return { estado: 400, cuerpo: { errores } };
  if (!(await prisma.categoria.findUnique({ where: { id: datos.categoriaId } }))) {
    return { estado: 400, cuerpo: { errores: { categoriaId: 'La categoría no existe' } } };
  }
  if (alta && !(await prisma.tipoSala.findUnique({ where: { id: req.body.tipoSalaId } }))) {
    return { estado: 400, cuerpo: { errores: { tipoSalaId: 'El tipo de sala no existe.' } } };
  }
  return { datos };
}


// Suma la tecnología nueva al estándar del tipo de sala, con cantidad máxima 1, para que el líder la apruebe
// Si ya hay una versión pendiente, entra ahí. Si no, se crea la siguiente versión a partir de la vigente (sin sus tecnologías inactivas)
async function sumarAVersionPendiente(tx, tipoSalaId, tecnologia, autorId) {
  const pendiente = await tx.versionEstandar.findFirst({ where: { tipoSalaId, estado: 'Pendiente' } });
  if (pendiente) {
    await tx.versionItem.create({ data: { versionId: pendiente.id, tecnologiaId: tecnologia.id } });
    return pendiente.numero;
  }
  const vigente = await tx.versionEstandar.findFirst({
    where: { tipoSalaId, estado: 'Vigente' },
    include: { items: { where: { tecnologia: { estado: 'Activa' } } } },
  });
  const { _max } = await tx.versionEstandar.aggregate({ where: { tipoSalaId }, _max: { numero: true } });
  const base = (vigente?.items ?? []).map(({ tecnologiaId, cantidadMaxima }) => ({ tecnologiaId, cantidadMaxima }));
  const nueva = await tx.versionEstandar.create({
    data: {
      tipoSalaId,
      numero: (_max.numero ?? 0) + 1,
      autorId,
      observaciones: `Se agrega ${tecnologia.marca} ${tecnologia.modelo} desde el catálogo`,
      items: { create: [...base, { tecnologiaId: tecnologia.id, cantidadMaxima: 1 }] },
    },
  });
  return nueva.numero;
}

// GET /api/tecnologias: catálogo completo. La interfaz busca y filtra sobre esta lista
export async function listar(req, res) {
  res.json(await prisma.tecnologia.findMany({ include: CON_CATEGORIA, orderBy: { id: 'asc' } }));
}

// POST /api/tecnologias: alta. Nace activa y entra en la versión pendiente de su tipo de sala
// Todo o nada: si no se puede sumar al estándar, tampoco se guarda la tecnología
export async function crear(req, res) {
  const { estado, cuerpo, datos } = await revisar(req, { alta: true });
  if (estado) return res.status(estado).json(cuerpo);
  const resultado = await prisma.$transaction(async (tx) => {
    const tecnologia = await tx.tecnologia.create({ data: datos, include: CON_CATEGORIA });
    const versionPendiente = await sumarAVersionPendiente(tx, req.body.tipoSalaId, tecnologia, req.usuario.id);
    return { ...tecnologia, versionPendiente };
  });
  res.status(201).json(resultado);
}

// PUT /api/tecnologias/:id: edición. Si cambia el precio, registra la fecha; los proyectos guardados conservan el suyo
export async function editar(req, res) {
  const previa = await buscar(req);
  if (!previa) return res.status(404).json(NO_EXISTE);
  const { estado, cuerpo, datos } = await revisar(req, { alta: false });
  if (estado) return res.status(estado).json(cuerpo);
  const fechaPrecio = datos.precioCentavos === previa.precioCentavos ? previa.fechaPrecio : new Date();
  res.json(await prisma.tecnologia.update({ where: { id: previa.id }, data: { ...datos, fechaPrecio }, include: CON_CATEGORIA }));
}

// PATCH /api/tecnologias/:id/estado: activa o desactiva. No se borra: estándares y proyectos la referencian
export async function cambiarEstado(req, res) {
  const previa = await buscar(req);
  if (!previa) return res.status(404).json(NO_EXISTE);
  if (!ESTADOS.includes(req.body?.estado)) return res.status(400).json({ error: 'Estado no válido.' });
  res.json(await prisma.tecnologia.update({ where: { id: previa.id }, data: { estado: req.body.estado }, include: CON_CATEGORIA }));
}
