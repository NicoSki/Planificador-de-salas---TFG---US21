// USD sin impuestos. Montos en centavos enteros, evita errores de coma flotante. Redondeo hacia arriba al centavo.
// Es la misma regla que aplica la API (backend/src/reglas/presupuesto.js): si cambia una, cambia la otra.
export const PORCENTAJE_MANO_OBRA = 25;
export const LIMITE_ANALISTAS = 2_000_000;

// Color de cada estado de aprobación del proyecto.
export const COLOR_ESTADO = { Pendiente: 'warning', Aprobado: 'success', Denegado: 'error' };

// Subtotal de equipos, mano de obra y total. Sin tecnologías, todo en cero
export function calcularPresupuesto(items) {
  const subtotal = items.reduce((suma, i) => suma + i.cantidad * i.precioCentavos, 0);
  const manoObra = Math.ceil((subtotal * PORCENTAJE_MANO_OBRA) / 100);
  return { subtotal, manoObra, total: subtotal + manoObra };
}

// Quién resuelve: analista hasta 20.000 USD inclusive y jefe de control de gestión por encima
export const rolAprobador = (totalCentavos) => (totalCentavos <= LIMITE_ANALISTAS ? 'analista' : 'jefe');

// Avisa a la barra lateral que cambió la cantidad de proyectos pendientes (alta, edición, aprobación o denegación).
export const avisarCambioProyectos = () => window.dispatchEvent(new Event('proyectos-cambiaron'));
