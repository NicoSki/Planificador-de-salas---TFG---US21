// Regla de cálculo del TFG: USD sin impuestos, en centavos enteros. Mano de obra fija del 25 %, redondeada hacia arriba al centavo.
// Es la misma que usa la interfaz (frontend/src/componentes/proyectos/Presupuesto.js): si cambia una, cambia la otra.
export const PORCENTAJE_MANO_OBRA = 25;
export const LIMITE_ANALISTAS = 2_000_000; // 20.000 USD: hasta acá resuelve el analista; por encima, el jefe de control de gestión

// Subtotal de equipos, mano de obra y total. Sin tecnologías, todo en cero.
export function calcularPresupuesto(items) {
  const subtotal = items.reduce((suma, i) => suma + i.cantidad * i.precioCentavos, 0);
  const manoObra = Math.ceil((subtotal * PORCENTAJE_MANO_OBRA) / 100);
  return { subtotal, manoObra, total: subtotal + manoObra };
}

// Quién resuelve: analista hasta 20.000 USD inclusive y jefe de control de gestión por encima.
export const rolAprobador = (totalCentavos) => (totalCentavos <= LIMITE_ANALISTAS ? 'analista' : 'jefe');
