// Reglas de los estándares (HU-004). La API las aplica siempre, aunque la interfaz ya las haya controlado.
export const ESTADOS_VERSION = ['Pendiente', 'Vigente', 'Historica', 'Rechazada'];
const MAXIMO_TEXTO = 500;
const MAXIMO_ITEMS = 100; // tope de control: ningún estándar de sala se acerca

// Forma de la propuesta: tipo de sala, al menos una tecnología sin repetir, cantidades enteras de 1 a 99 y observaciones.
// Devuelve { errores } o { datos } listos para guardar. Que el tipo de sala exista y las tecnologías estén activas lo controla el controlador.
export function validarPropuesta(cuerpo) {
  const errores = {};
  const { tipoSalaId, items, observaciones = '' } = cuerpo ?? {};
  if (!(typeof tipoSalaId === 'string' && tipoSalaId)) errores.tipoSalaId = 'Elegí un tipo de sala.';
  if (!Array.isArray(items) || !items.length) errores.items = 'El estándar no tiene tecnologías. Agregá al menos una para guardarlo.';
  else if (items.length > MAXIMO_ITEMS) errores.items = `El estándar admite hasta ${MAXIMO_ITEMS} tecnologías.`;
  else if (items.some((i) => !Number.isInteger(i?.tecnologiaId) || !Number.isInteger(i?.cantidadMaxima) || i.cantidadMaxima < 1 || i.cantidadMaxima > 99)) {
    errores.items = 'La cantidad máxima debe ser un número entero entre 1 y 99.';
  } else if (new Set(items.map((i) => i.tecnologiaId)).size !== items.length) errores.items = 'Hay tecnologías repetidas en el estándar.';
  if (typeof observaciones !== 'string' || observaciones.length > MAXIMO_TEXTO) errores.observaciones = `Las observaciones admiten hasta ${MAXIMO_TEXTO} caracteres.`;
  if (Object.keys(errores).length) return { errores };
  return { datos: { tipoSalaId, items: items.map(({ tecnologiaId, cantidadMaxima }) => ({ tecnologiaId, cantidadMaxima })), observaciones: observaciones.trim() } };
}

// ¿La propuesta tiene exactamente las mismas tecnologías y cantidades que la vigente? Entonces no hay nada que aprobar.
export const mismosItems = (a, b) =>
  a.length === b.length && a.every((x) => b.some((y) => y.tecnologiaId === x.tecnologiaId && y.cantidadMaxima === x.cantidadMaxima));

// Motivo del rechazo: opcional, hasta 500 caracteres. Devuelve { error } o { motivo } (null si quedó vacío).
export function validarMotivo(motivo = '') {
  if (typeof motivo !== 'string' || motivo.length > MAXIMO_TEXTO) return { error: `El motivo admite hasta ${MAXIMO_TEXTO} caracteres.` };
  return { motivo: motivo.trim() || null };
}
