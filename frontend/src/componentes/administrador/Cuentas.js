// Estado de una cuenta para la tabla del Administrador. Las fechas llegan de la API en formato ISO
import { fechaYHora } from '../proyectos/Formato';

const hora = (iso) => new Date(iso).toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });

export const bloqueada = (u, ahora) => u.bloqueadaHasta != null && Date.parse(u.bloqueadaHasta) > ahora;

// El bloqueo va primero: impide ingresar aunque tenga contraseña temporal
export function estadoDe(u, ahora) {
  if (bloqueada(u, ahora)) return { texto: 'Bloqueada', color: 'error', detalle: `Hasta las ${hora(u.bloqueadaHasta)}, por intentos fallidos` };
  if (u.claveTemporalVence && Date.parse(u.claveTemporalVence) <= ahora) return { texto: 'Temporal vencida', color: 'error', detalle: 'Asigná una nueva contraseña temporal' };
  if (u.claveTemporalVence) return { texto: 'Contraseña temporal', color: 'warning', detalle: `Vence el ${fechaYHora(u.claveTemporalVence)}hs` };
  return { texto: 'Activa', color: 'success', detalle: '' };
}
