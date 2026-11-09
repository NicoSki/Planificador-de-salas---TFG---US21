// Reglas de los proyectos de sala (HU-005 a HU-013). La API las aplica siempre, aunque la interfaz ya las haya controlado.
// Las categorías se nombran por su código (id de la tabla Categoria).
const CAMARAS = ['camara', 'todo-en-uno']; // un solo modelo de cámara por proyecto, sea cámara sola o equipo todo en uno
const PIZARRAS = ['pizarra', 'pizarra-inteligente'];
const SOPORTE = 'soporte'; // carrito: solo se agrega para montar una pizarra
export const DIMENSION = { min: 2, max: 30 }; // metros
const MAXIMO_ITEMS = 100;
export const medidasMinimas = (capacidad) => ({ ancho: 2.5, largo: Math.round((Math.ceil(capacidad / 2) * 0.6 + 1.6) * 100) / 100 });
const texto = (valor) => (typeof valor === 'string' ? valor.trim() : '');

// Medida en metros, de 2 a 30, con hasta dos decimales (columna Decimal(4,2)). null si no es válida.
function aMetros(valor) {
  if (typeof valor !== 'number' || !Number.isFinite(valor)) return null;
  const redondeado = Math.round(valor * 100) / 100;
  return redondeado >= DIMENSION.min && redondeado <= DIMENSION.max ? redondeado : null;
}

// Tecnologías elegidas: al menos una, sin repetir, cantidades enteras de 1 a 99. Devuelve { error } o { items } limpios.
export function validarItems(items) {
  if (!Array.isArray(items) || !items.length) return { error: 'Agregá al menos una tecnología al proyecto.' };
  if (items.length > MAXIMO_ITEMS) return { error: `El proyecto admite hasta ${MAXIMO_ITEMS} tecnologías.` };
  if (items.some((i) => !Number.isInteger(i?.tecnologiaId) || !Number.isInteger(i?.cantidad) || i.cantidad < 1 || i.cantidad > 99)) {
    return { error: 'Cada tecnología necesita una cantidad entera entre 1 y 99.' };
  }
  if (new Set(items.map((i) => i.tecnologiaId)).size !== items.length) return { error: 'Hay tecnologías repetidas en el proyecto.' };
  return { items: items.map(({ tecnologiaId, cantidad }) => ({ tecnologiaId, cantidad })) };
}

// Alta: nombre, sitio, tipo de sala, medidas y tecnologías. Devuelve { errores } o { datos } listos para guardar.
export function validarProyecto(cuerpo) {
  const errores = {};
  const nombre = texto(cuerpo?.nombre);
  if (!nombre) errores.nombre = 'Campo obligatorio.';
  else if (nombre.length > 80) errores.nombre = 'Máximo 80 caracteres.';
  if (!texto(cuerpo?.sitioId)) errores.sitioId = 'Elegí un sitio.';
  if (!texto(cuerpo?.tipoSalaId)) errores.tipoSalaId = 'Elegí un tipo de sala.';
  const ancho = aMetros(cuerpo?.ancho);
  const largo = aMetros(cuerpo?.largo);
  if (ancho === null) errores.ancho = `Entre ${DIMENSION.min} y ${DIMENSION.max} m.`;
  if (largo === null) errores.largo = `Entre ${DIMENSION.min} y ${DIMENSION.max} m.`;
  const { error, items } = validarItems(cuerpo?.items);
  if (error) errores.items = error;
  if (Object.keys(errores).length) return { errores };
  return { datos: { nombre, sitioId: cuerpo.sitioId, tipoSalaId: cuerpo.tipoSalaId, ancho, largo, items } };
}

// Qué se puede elegir. Nuevas selecciones: tecnologías activas de la versión vigente, con su cantidad máxima.
// Al editar, lo que el proyecto ya tenía fuera de la vigente se conserva, pero no se pueden sumar unidades ni volver a agregarlo si se quita.
// "vigentes": ítems de la versión vigente con su tecnología. "anteriores": ítems guardados del proyecto, con su tecnología.
export function opcionesDe(vigentes, anteriores = []) {
  const delEstandar = vigentes.filter((i) => i.tecnologia.estado === 'Activa').map(({ tecnologia, cantidadMaxima }) => ({ tecnologia, cantidadMaxima }));
  const ids = new Set(delEstandar.map((o) => o.tecnologia.id));
  const fuera = anteriores.filter((i) => !ids.has(i.tecnologiaId)).map(({ tecnologia, cantidad }) => ({ tecnologia, cantidadMaxima: cantidad }));
  return { delEstandar, opciones: [...delEstandar, ...fuera] };
}

// Selección final contra el estándar: devuelve el motivo del rechazo o null si es válida.
export function validarSeleccion(items, opciones) {
  const porId = new Map(opciones.map((o) => [o.tecnologia.id, o]));
  for (const i of items) {
    const opcion = porId.get(i.tecnologiaId);
    if (!opcion) return 'Hay tecnologías que no pertenecen al estándar del proyecto.';
    const { tecnologia: t, cantidadMaxima } = opcion;
    if (i.cantidad > cantidadMaxima) return `El estándar admite hasta ${cantidadMaxima} de ${t.marca} ${t.modelo}.`;
  }
  const categorias = items.map((i) => porId.get(i.tecnologiaId).tecnologia.categoriaId);
  if (categorias.filter((c) => CAMARAS.includes(c)).length > 1) return 'Solo un modelo de cámara por proyecto.';
  if (categorias.includes(SOPORTE) && !categorias.some((c) => PIZARRAS.includes(c))) return 'El carrito solo se puede agregar con una pizarra.';
  if (categorias.filter((c) => c === SOPORTE).length > 1) return 'La pizarra se monta en un solo carrito.';
  return null;
}

// Motivo de la denegación: obligatorio, hasta 500 caracteres. Devuelve { error } o { motivo }.
export function validarMotivoDenegacion(motivo) {
  const limpio = texto(motivo);
  if (!limpio) return { error: 'Indicá el motivo de la denegación.' };
  if (limpio.length > 500) return { error: 'El motivo admite hasta 500 caracteres.' };
  return { motivo: limpio };
}
