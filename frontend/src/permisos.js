// Permisos de cada rol (TFG, sección Seguridad). La interfaz solo oculta lo que el rol no puede hacer: quien decide es la API,
// que aplica la misma tabla (backend/src/reglas/acceso.js). Si cambia una, cambia la otra
import { rolAprobador } from './componentes/proyectos/Presupuesto';

const TODOS = [
  'proyectos.ver', 'proyectos.editar', 'aprobaciones.resolver', 'aprobaciones.todos-los-montos',
  'catalogo.ver', 'catalogo.editar', 'estandares.ver', 'estandares.proponer', 'estandares.aprobar', 'cuentas.administrar',
];
const PERMISOS = {
  gestor: ['proyectos.ver', 'proyectos.editar'],
  colaborador: ['catalogo.ver', 'catalogo.editar', 'estandares.ver', 'estandares.proponer'],
  lider: ['proyectos.ver', 'catalogo.ver', 'estandares.ver', 'estandares.aprobar'],
  analista: ['proyectos.ver', 'aprobaciones.resolver'],
  jefe: ['proyectos.ver', 'aprobaciones.resolver'],
  administrador: ['cuentas.administrar'],
  desarrollador: TODOS, // pedido del usuario, no está en el TFG: toda la aplicación
};

export const puede = (usuario, permiso) => Boolean(usuario && PERMISOS[usuario.rolId]?.includes(permiso));

// HU-013: el analista resuelve hasta 20.000 USD y el jefe por encima. El desarrollador, cualquier monto
export const puedeResolver = (usuario, totalCentavos) =>
  puede(usuario, 'aprobaciones.resolver') && (puede(usuario, 'aprobaciones.todos-los-montos') || usuario.rolId === rolAprobador(totalCentavos));

// Pantalla de inicio de cada rol (HU-001)
export const INICIO_POR_ROL = {
  gestor: '/proyectos',
  colaborador: '/catalogo',
  lider: '/estandares/aprobacion',
  analista: '/aprobaciones',
  jefe: '/aprobaciones',
  administrador: '/administrador',
  desarrollador: '/proyectos',
};
