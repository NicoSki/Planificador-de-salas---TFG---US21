// Reglas de acceso (HU-001 y sección Seguridad del TFG): política de contraseñas, bloqueo por intentos fallidos y permisos por rol
import { rolAprobador } from './presupuesto.js';

export const INTENTOS_MAXIMOS = 5;
export const MINUTOS_BLOQUEO = 15;
export const HORAS_SESION = 8;
export const CLAVES_SIN_REPETIR = 5; // la actual y las cuatro anteriores

// Política de contraseñas: [lo que exige, cómo se comprueba]
const POLITICA_CLAVE = [
  ['tener entre 12 y 64 caracteres', (c) => c.length >= 12 && c.length <= 64],
  ['incluir una mayúscula', (c) => /\p{Lu}/u.test(c)],
  ['incluir una minúscula', (c) => /\p{Ll}/u.test(c)],
  ['incluir un número', (c) => /\p{N}/u.test(c)],
  ['incluir un carácter especial', (c) => /[^\p{L}\p{N}]/u.test(c)],
];
const enLista = new Intl.ListFormat('es');

// Mensaje con lo que le falta a la contraseña, o null si cumple la política
export function faltasDeClave(clave) {
  const faltas = POLITICA_CLAVE.filter(([, cumple]) => !cumple(clave)).map(([texto]) => texto);
  return faltas.length ? `La contraseña debe ${enLista.format(faltas)}.` : null;
}

export const bloqueada = (u, ahora = new Date()) => u.bloqueadaHasta != null && u.bloqueadaHasta > ahora;
export const temporalVencida = (u, ahora = new Date()) => u.claveTemporalVence != null && u.claveTemporalVence <= ahora;

// Qué puede hacer cada rol. La interfaz usa la misma tabla (frontend/src/permisos.js): si cambia una, cambia la otra
const TODOS = [
  'proyectos.ver', 'proyectos.editar', 'aprobaciones.resolver', 'aprobaciones.todos-los-montos',
  'catalogo.ver', 'catalogo.editar', 'estandares.ver', 'estandares.proponer', 'estandares.aprobar', 'cuentas.administrar',
];
export const PERMISOS = {
  gestor: ['proyectos.ver', 'proyectos.editar'],
  colaborador: ['catalogo.ver', 'catalogo.editar', 'estandares.ver', 'estandares.proponer'],
  lider: ['proyectos.ver', 'catalogo.ver', 'estandares.ver', 'estandares.aprobar'],
  analista: ['proyectos.ver', 'aprobaciones.resolver'],
  jefe: ['proyectos.ver', 'aprobaciones.resolver'],
  administrador: ['cuentas.administrar'],
  desarrollador: TODOS, // pedido del usuario, no está en el TFG: toda la aplicación
};

export const puede = (rolId, permiso) => Boolean(PERMISOS[rolId]?.includes(permiso));

// HU-013: el analista resuelve hasta 20.000 USD y el jefe por encima. El desarrollador, cualquier monto
export const puedeResolver = (rolId, totalCentavos) =>
  puede(rolId, 'aprobaciones.resolver') && (puede(rolId, 'aprobaciones.todos-los-montos') || rolId === rolAprobador(totalCentavos));
