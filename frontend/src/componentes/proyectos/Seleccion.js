// Reglas de selección del configurador (HU-006). Son las mismas que valida la API (backend/src/reglas/proyectos.js).
// "opciones": [{ tecnologia, cantidadMaxima }], con la tecnología como la devuelve la API (categoriaId = código de la categoría).
const CAMARAS = ['camara', 'todo-en-uno']; // un solo modelo de cámara por proyecto, sea cámara sola o equipo todo en uno
const PIZARRAS = ['pizarra', 'pizarra-inteligente'];
export const SOPORTE = 'soporte'; // carrito: solo con una pizarra

export const esPizarra = (categoriaId) => PIZARRAS.includes(categoriaId);
const opcionDe = (opciones, id) => opciones.find((o) => o.tecnologia.id === id);
const categoriaDe = (opciones, id) => opcionDe(opciones, id)?.tecnologia.categoriaId;
const tienePizarra = (items, opciones) => items.some((i) => esPizarra(categoriaDe(opciones, i.tecnologiaId)));

// Motivo por el que no se puede sumar una unidad, o null si se puede.
export function motivoBloqueo(items, opciones, tecnologiaId) {
  const opcion = opcionDe(opciones, tecnologiaId);
  if (!opcion) return 'La tecnología no pertenece al estándar del proyecto';
  const { tecnologia: t, cantidadMaxima } = opcion;
  const cantidad = items.find((i) => i.tecnologiaId === tecnologiaId)?.cantidad ?? 0;
  if (cantidad >= cantidadMaxima) return `El estándar admite hasta ${cantidadMaxima}`;
  const otraCamara = CAMARAS.includes(t.categoriaId) && items.find((i) => i.tecnologiaId !== tecnologiaId && CAMARAS.includes(categoriaDe(opciones, i.tecnologiaId)));
  if (otraCamara) return `Solo un modelo de cámara por proyecto: ya elegiste ${opcionDe(opciones, otraCamara.tecnologiaId).tecnologia.modelo}`;
  if (t.categoriaId === SOPORTE && !tienePizarra(items, opciones)) return 'Agregá una pizarra';
  return null;
}

// Suma una unidad. Una tecnología nueva entra con el precio actual del catálogo; al guardar, la API lo vuelve a tomar.
export function agregar(items, opciones, tecnologiaId) {
  if (motivoBloqueo(items, opciones, tecnologiaId)) return items;
  const actual = items.find((i) => i.tecnologiaId === tecnologiaId);
  if (actual) return items.map((i) => (i === actual ? { ...i, cantidad: i.cantidad + 1 } : i));
  const { tecnologia } = opcionDe(opciones, tecnologiaId);
  return [...items, { tecnologiaId, cantidad: 1, precioCentavos: tecnologia.precioCentavos, tecnologia }];
}

// Resta una unidad (o la quita entera). Sin pizarra, el carrito también se va.
export function quitar(items, opciones, tecnologiaId, todas = false) {
  const resto = items.flatMap((i) =>
    i.tecnologiaId !== tecnologiaId ? [i] : todas || i.cantidad <= 1 ? [] : [{ ...i, cantidad: i.cantidad - 1 }],
  );
  return tienePizarra(resto, opciones) ? resto : resto.filter((i) => categoriaDe(opciones, i.tecnologiaId) !== SOPORTE);
}

// Montaje de la pizarra: null = en la pared (sin carrito); id = en ese carrito, que suma su precio
export function elegirMontaje(items, opciones, soporteId) {
  const sinCarrito = items.filter((i) => categoriaDe(opciones, i.tecnologiaId) !== SOPORTE);
  return soporteId == null ? sinCarrito : agregar(sinCarrito, opciones, soporteId);
}
