// Proyectos de sala (HU-005 a HU-013): historial, alta, edición y aprobación presupuestaria.
import { prisma } from '../db.js';
import { calcularPresupuesto } from '../reglas/presupuesto.js';
import { puedeResolver } from '../reglas/acceso.js';
import { datosDocumento, generarDocumento, nombreArchivo } from '../reglas/documento.js';
import { medidasMinimas, opcionesDe, validarItems, validarMotivoDenegacion, validarProyecto, validarSeleccion } from '../reglas/proyectos.js';

const ESTADOS = ['Pendiente', 'Aprobado', 'Denegado'];
const CON_TECNOLOGIA = { include: { tecnologia: { include: { categoria: true } } } };
const PERSONA = { select: { nombre: true, apellido: true, rol: { select: { nombre: true } } } };
const DETALLE = {
  sitio: true,
  gestor: PERSONA,
  version: { include: { tipoSala: true } },
  items: CON_TECNOLOGIA,
  registros: { include: { usuario: PERSONA }, orderBy: { fecha: 'desc' } }, // del más nuevo al más viejo
};
const nombreDe = (u) => `${u.nombre} ${u.apellido}`;

// Número de la versión vigente de cada tipo de sala: sirve para la etiqueta "Estándar desactualizado".
async function vigentesPorTipo() {
  const vigentes = await prisma.versionEstandar.findMany({ where: { estado: 'Vigente' }, select: { tipoSalaId: true, numero: true } });
  return new Map(vigentes.map((v) => [v.tipoSalaId, v.numero]));
}

// Proyecto en la forma que usa la interfaz: medidas como número, total calculado, última edición y resolución vigente.
function aRespuesta(p, vigentes) {
  const ultimo = (acciones) => p.registros.find((r) => acciones.includes(r.accion));
  const edicion = ultimo(['Editado']);
  const resolucion = p.estado === 'Pendiente' ? null : ultimo(['Aprobado', 'Denegado']);
  const items = p.items.map(({ tecnologiaId, cantidad, precioCentavos, tecnologia }) => ({ tecnologiaId, cantidad, precioCentavos, tecnologia }));
  const { tipoSala } = p.version;
  return {
    id: p.id,
    nombre: p.nombre,
    estado: p.estado,
    sitioId: p.sitioId,
    sitio: p.sitio.nombre,
    gestorId: p.gestorId,
    gestor: nombreDe(p.gestor),
    tipoSalaId: tipoSala.id,
    tipoSala: { ...tipoSala, ancho: tipoSala.ancho.toNumber(), largo: tipoSala.largo.toNumber() },
    versionId: p.versionId,
    version: p.version.numero,
    versionVigente: vigentes.get(tipoSala.id) ?? null,
    ancho: p.ancho.toNumber(),
    largo: p.largo.toNumber(),
    creacion: p.fechaCreacion,
    edicion: edicion ? { usuario: nombreDe(edicion.usuario), fecha: edicion.fecha } : null,
    resolucion: resolucion
      ? { usuario: `${nombreDe(resolucion.usuario)} (${resolucion.usuario.rol.nombre})`, fecha: resolucion.fecha, motivo: resolucion.motivo, totalCentavos: resolucion.totalCentavos }
      : null,
    items,
    total: calcularPresupuesto(items).total,
  };
}

// Proyecto de la dirección (/:id) con todo su detalle, o null si el id no es válido o no existe.
async function buscar(req) {
  const id = Number(req.params.id);
  return Number.isInteger(id) ? prisma.proyecto.findUnique({ where: { id }, include: DETALLE }) : null;
}

const enviarDetalle = async (res, id, estado = 200) =>
  res.status(estado).json(aRespuesta(await prisma.proyecto.findUnique({ where: { id }, include: DETALLE }), await vigentesPorTipo()));

// GET /api/proyectos?estado=Pendiente: historial completo, del más reciente al más viejo. La interfaz filtra por sitio, tipo y gestor.
export async function listar(req, res) {
  const { estado } = req.query;
  if (estado !== undefined && !ESTADOS.includes(estado)) return res.status(400).json({ error: 'Estado no válido.' });
  const [proyectos, vigentes] = await Promise.all([
    prisma.proyecto.findMany({ where: estado ? { estado } : {}, include: DETALLE, orderBy: { fechaCreacion: 'desc' } }),
    vigentesPorTipo(),
  ]);
  res.json(proyectos.map((p) => aRespuesta(p, vigentes)));
}

// GET /api/proyectos/:id
export async function obtener(req, res) {
  const proyecto = await buscar(req);
  if (!proyecto) return res.status(404).json({ error: 'El proyecto no existe.' });
  res.json(aRespuesta(proyecto, await vigentesPorTipo()));
}

// POST /api/proyectos: alta con la versión vigente del estándar. Cada ítem guarda el precio del catálogo en ese momento.
// Las medidas tienen que dejar lugar a las sillas del tipo de sala (4, 8 o 16).
// Queda Pendiente de aprobación y el registro de cambios anota "Creado" con el total.
export async function crear(req, res) {
  const { errores, datos } = validarProyecto(req.body);
  if (errores) return res.status(400).json({ errores });
  if (!(await prisma.sitio.findUnique({ where: { id: datos.sitioId } }))) return res.status(400).json({ errores: { sitioId: 'El sitio no existe.' } });
  const vigente = await prisma.versionEstandar.findFirst({
    where: { tipoSalaId: datos.tipoSalaId, estado: 'Vigente' },
    include: { items: CON_TECNOLOGIA, tipoSala: true },
  });
  if (!vigente) return res.status(400).json({ errores: { tipoSalaId: 'Este tipo de sala todavía no tiene una versión vigente del estándar.' } });
  const minimas = medidasMinimas(vigente.tipoSala.capacidad);
  const chicas = ['ancho', 'largo'].filter((m) => datos[m] < minimas[m]);
  if (chicas.length) {
    return res.status(400).json({ errores: Object.fromEntries(chicas.map((m) => [m, `Mínimo ${minimas[m]} m para ${vigente.tipoSala.capacidad} personas.`])) });
  }
  const { opciones } = opcionesDe(vigente.items);
  const problema = validarSeleccion(datos.items, opciones);
  if (problema) return res.status(400).json({ error: problema });

  const precio = new Map(opciones.map((o) => [o.tecnologia.id, o.tecnologia.precioCentavos]));
  const items = datos.items.map((i) => ({ ...i, precioCentavos: precio.get(i.tecnologiaId) }));
  const { id } = await prisma.proyecto.create({
    data: {
      nombre: datos.nombre,
      sitioId: datos.sitioId,
      versionId: vigente.id,
      ancho: datos.ancho,
      largo: datos.largo,
      gestorId: req.usuario.id,
      items: { create: items },
      registros: { create: { usuarioId: req.usuario.id, accion: 'Creado', totalCentavos: calcularPresupuesto(items).total } },
    },
  });
  await enviarDetalle(res, id, 201);
}

// PUT /api/proyectos/:id: edita las tecnologías. Un aprobado es de solo lectura; un denegado vuelve a Pendiente.
// Los ítems que ya estaban conservan su precio cotizado; los nuevos toman el del catálogo.
// Si no le queda nada fuera de la versión vigente, pasa a esa versión y se quita la etiqueta de estándar desactualizado.
export async function editar(req, res) {
  const proyecto = await buscar(req);
  if (!proyecto) return res.status(404).json({ error: 'El proyecto no existe.' });
  if (proyecto.estado === 'Aprobado') return res.status(409).json({ error: 'Un proyecto aprobado es de solo lectura.' });
  const { error, items } = validarItems(req.body?.items);
  if (error) return res.status(400).json({ error });
  const vigente = await prisma.versionEstandar.findFirst({
    where: { tipoSalaId: proyecto.version.tipoSalaId, estado: 'Vigente' },
    include: { items: CON_TECNOLOGIA },
  });
  if (!vigente) return res.status(409).json({ error: 'El tipo de sala no tiene una versión vigente del estándar.' });
  const { opciones, delEstandar } = opcionesDe(vigente.items, proyecto.items);
  const problema = validarSeleccion(items, opciones);
  if (problema) return res.status(400).json({ error: problema });

  const cotizado = new Map(proyecto.items.map((i) => [i.tecnologiaId, i.precioCentavos]));
  const catalogo = new Map(opciones.map((o) => [o.tecnologia.id, o.tecnologia.precioCentavos]));
  const conPrecio = items.map((i) => ({ ...i, precioCentavos: cotizado.get(i.tecnologiaId) ?? catalogo.get(i.tecnologiaId) }));
  const enVigente = new Set(delEstandar.map((o) => o.tecnologia.id));
  await prisma.proyecto.update({
    where: { id: proyecto.id },
    data: {
      estado: 'Pendiente',
      versionId: conPrecio.every((i) => enVigente.has(i.tecnologiaId)) ? vigente.id : proyecto.versionId,
      items: { deleteMany: {}, create: conPrecio },
      registros: { create: { usuarioId: req.usuario.id, accion: 'Editado', totalCentavos: calcularPresupuesto(conPrecio).total } },
    },
  });
  await enviarDetalle(res, proyecto.id);
}

// Aprobación presupuestaria: solo un proyecto pendiente. Registra usuario, fecha y monto; al denegar, también el motivo.
// HU-013: el analista resuelve hasta 20.000 USD y el jefe por encima, con mano de obra incluida.
async function resolver(req, res, accion) {
  const proyecto = await buscar(req);
  if (!proyecto) return res.status(404).json({ error: 'El proyecto no existe.' });
  if (proyecto.estado !== 'Pendiente') return res.status(409).json({ error: 'El proyecto no está pendiente de aprobación.' });
  const total = calcularPresupuesto(proyecto.items).total;
  if (!puedeResolver(req.usuario.rolId, total)) return res.status(403).json({ error: 'Este monto lo resuelve otro rol.' });
  let motivo = null;
  if (accion === 'Denegado') {
    const r = validarMotivoDenegacion(req.body?.motivo);
    if (r.error) return res.status(400).json({ errores: { motivo: r.error } });
    motivo = r.motivo;
  }
  await prisma.proyecto.update({
    where: { id: proyecto.id },
    data: { estado: accion, registros: { create: { usuarioId: req.usuario.id, accion, motivo, totalCentavos: total } } },
  });
  await enviarDetalle(res, proyecto.id);
}

// GET /api/proyectos/:id/documento: PDF de referencia (HU-012) para descargar. Sin ningún valor comercial
export async function documento(req, res) {
  const proyecto = await buscar(req);
  if (!proyecto) return res.status(404).json({ error: 'El proyecto no existe.' });
  const pdf = await generarDocumento(datosDocumento(proyecto));
  res.set({ 'Content-Type': 'application/pdf', 'Content-Disposition': `attachment; filename="${nombreArchivo(proyecto)}"` }).send(pdf);
}


// POST /api/proyectos/:id/aprobar y /denegar
export const aprobar = (req, res) => resolver(req, res, 'Aprobado');
export const denegar = (req, res) => resolver(req, res, 'Denegado');
