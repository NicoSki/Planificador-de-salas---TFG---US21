export const ESTADOS = ['Activa', 'Inactiva'];
const LARGOS = { modelo: 60, marca: 40 };
const PRECIO_MAXIMO_CENTAVOS = 100_000_000;

// Precio en USD a centavos enteros. null si no es un precio válido
export function aCentavos(precio) {
  const texto = String(precio ?? '').trim();
  if (!/^\d+(\.\d{1,2})?$/.test(texto)) return null;
  const centavos = Math.round(Number(texto) * 100);
  return centavos > 0 && centavos <= PRECIO_MAXIMO_CENTAVOS ? centavos : null;
}

// Valida la forma del pedido. En el alta, el tipo de sala es obligatorio
export function validarTecnologia(cuerpo, { alta = false } = {}) {
  const errores = {};
  const datos = {};
  for (const [campo, maximo] of Object.entries(LARGOS)) {
    const valor = typeof cuerpo?.[campo] === 'string' ? cuerpo[campo].trim() : '';
    if (!valor) errores[campo] = 'Campo obligatorio';
    else if (valor.length > maximo) errores[campo] = `Máximo ${maximo} caracteres`;
    datos[campo] = valor;
  }
  if (!(typeof cuerpo?.categoriaId === 'string' && cuerpo.categoriaId)) errores.categoriaId = 'Elegí una categoría';
  datos.categoriaId = cuerpo?.categoriaId;
  datos.precioCentavos = aCentavos(cuerpo?.precio);
  if (datos.precioCentavos === null) errores.precio = 'Ingresá un precio mayor a 0 y con hasta dos decimales';
  if (alta && !(typeof cuerpo?.tipoSalaId === 'string' && cuerpo.tipoSalaId)) errores.tipoSalaId = 'Elegí un tipo de sala';
  return Object.keys(errores).length ? { errores } : { datos };
}
