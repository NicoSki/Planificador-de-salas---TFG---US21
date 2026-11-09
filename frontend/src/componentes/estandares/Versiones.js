// Ayudas para las versiones del estándar. Funcionan con la lista que devuelve la API (/api/versiones).

// Versiones de un tipo de sala, de la más nueva a la más vieja.
export const versionesDe = (versiones, tipoSalaId) => versiones.filter((v) => v.tipoSalaId === tipoSalaId).sort((a, b) => b.numero - a.numero);

export const vigenteDe = (versiones, tipoSalaId) => versiones.find((v) => v.tipoSalaId === tipoSalaId && v.estado === 'Vigente');

export const pendienteDe = (versiones, tipoSalaId) => versiones.find((v) => v.tipoSalaId === tipoSalaId && v.estado === 'Pendiente');

// "Videoconferencia - Mediana": el tipo de sala es estándar + tamaño.
export const etiquetaTipo = (tipo) => `${tipo.estandar} - ${tipo.tamano}`;

// La base guarda "Historica" sin tilde (los enum no admiten tildes); en pantalla se muestra con tilde.
export const ETIQUETA_ESTADO = { Pendiente: 'Pendiente', Vigente: 'Vigente', Historica: 'Histórica', Rechazada: 'Rechazada' };

export const autorDe = (version) => `${version.autor.nombre} ${version.autor.apellido}`;

// Avisa a la barra lateral que cambió la cantidad de versiones pendientes (alta en el catálogo, propuesta, aprobación o rechazo).
export const avisarCambioEstandares = () => window.dispatchEvent(new Event('estandares-cambiaron'));

// Comparación de la propuesta con la vigente: cantidad antes y después y el tipo de cambio.
export function compararVersiones(vigente, propuesta) {
  const antes = new Map((vigente?.items ?? []).map((i) => [i.tecnologiaId, i.cantidadMaxima]));
  const despues = new Map(propuesta.items.map((i) => [i.tecnologiaId, i.cantidadMaxima]));
  return [...new Set([...antes.keys(), ...despues.keys()])].map((tecnologiaId) => {
    const a = antes.get(tecnologiaId) ?? null;
    const d = despues.get(tecnologiaId) ?? null;
    const cambio = a === null ? 'Nueva' : d === null ? 'Quitada' : a !== d ? 'Cantidad modificada' : 'Sin cambios';
    return { tecnologiaId, antes: a, despues: d, cambio };
  });
}
