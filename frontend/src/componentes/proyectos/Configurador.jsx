// Configurador (HU-006 a HU-010): paso 2 del proyecto nuevo y edición de uno existente.
// El estándar vigente y las categorías salen de la API; al guardar, la API vuelve a validar todo y fija los precios.
import { useCallback, useEffect, useRef, useState } from 'react';
import { Link as RouterLink, useBeforeUnload, useBlocker, useNavigate, useParams } from 'react-router';
import { Alert, Box, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, FormControl, FormControlLabel, FormHelperText, FormLabel, Link, Paper, Radio, RadioGroup, Stack, Typography} from '@mui/material';
import EscenaSala from './EscenaSala';
import TablaDePresupuesto from './TablaDePresupuesto';
import { avisarCambioProyectos } from './Presupuesto';
import { SOPORTE, agregar, elegirMontaje, esPizarra, motivoBloqueo, quitar } from './Seleccion';
import { metros, usd } from './Formato';
import IconoCategoria, { CATEGORIA_VISUAL } from '../catalogo/IconoCategoria';
import { etiquetaTipo } from '../estandares/Versiones';
import { api } from '../../api';

// Lo que se guarda (y se compara para saber si hay cambios): tecnología y cantidad.
const resumen = (items) => JSON.stringify(items.map(({ tecnologiaId, cantidad }) => ({ tecnologiaId, cantidad })));

// "proyecto": nuevo (sin id, items vacíos) o existente, con sus ítems y tecnologías. "alVolver": solo en uno nuevo, vuelve al paso 1.
export default function Configurador({ proyecto, alVolver, alCancelar }) {
  const navegar = useNavigate();
  const [items, setItems] = useState(proyecto.items);
  const [vigente, setVigente] = useState(null);
  const [categorias, setCategorias] = useState([]);
  const [cargado, setCargado] = useState(false);
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [preguntarVolver, setPreguntarVolver] = useState(false); // diálogo de "← Paso 1" con cambios sin guardar
  const saliendo = useRef(false); // true después de guardar: ir al detalle no pide confirmación

  const nuevo = proyecto.id == null;

  // Versión vigente del tipo de sala (con sus tecnologías) y categorías para los grupos.
  useEffect(() => {
    Promise.all([api(`/versiones?tipoSalaId=${proyecto.tipoSalaId}&estado=Vigente`), api('/categorias')])
      .then(([vigentes, listaCategorias]) => {
        setVigente(vigentes[0] ?? null);
        setCategorias(listaCategorias);
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargado(true));
  }, [proyecto.tipoSalaId]);

  // Cambios sin guardar: pide confirmación al salir por el menú o Cancelar, y al cerrar o recargar la pestaña
  const sucio = resumen(items) !== resumen(proyecto.items);
  const bloqueo = useBlocker(({ currentLocation, nextLocation }) => !saliendo.current && sucio && currentLocation.pathname !== nextLocation.pathname);
  useBeforeUnload(
    useCallback((e) => {
      if (sucio && !saliendo.current) e.preventDefault();
    }, [sucio]),
  );

  if (!cargado) return <CircularProgress />;
  if (!vigente) return <Alert severity="error">{error || 'Este tipo de sala no tiene una versión vigente del estándar.'}</Alert>;

  const version = nuevo ? vigente.numero : proyecto.version;

  // Nuevas selecciones: solo tecnologías activas de la versión vigente, con su cantidad máxima.
  const delEstandar = vigente.items.filter((i) => i.tecnologia.estado === 'Activa').map(({ tecnologia, cantidadMaxima }) => ({ tecnologia, cantidadMaxima }));
  // Lo que el proyecto ya tenía fuera de la vigente: se conserva, pero no se suman unidades (máximo 0).
  const fuera = proyecto.items.filter((i) => !delEstandar.some((o) => o.tecnologia.id === i.tecnologiaId)).map((i) => ({ tecnologia: i.tecnologia, cantidadMaxima: 0 }));
  const opciones = [...delEstandar, ...fuera];
  const fueraQuedan = fuera.filter((o) => items.some((i) => i.tecnologiaId === o.tecnologia.id)).map((o) => `${o.tecnologia.marca} ${o.tecnologia.modelo}`);
  const grupos = categorias.map((c) => [c, delEstandar.filter((o) => o.tecnologia.categoriaId === c.id)]).filter(([, lista]) => lista.length);

  const cantidadDe = (id) => items.find((i) => i.tecnologiaId === id)?.cantidad ?? 0;
  const hayPizarra = items.some((i) => esPizarra(i.tecnologia.categoriaId));
  const soporteElegido = items.find((i) => i.tecnologia.categoriaId === SOPORTE)?.tecnologiaId ?? null;
  const cambiar = (nuevos) => {
    setItems(nuevos);
    setError('');
  };
  const sumar = (id) => cambiar(agregar(items, opciones, id));

  // Guarda en la API y abre el detalle. Nuevo: se crea con la versión vigente. Existente: se editan sus tecnologías.
  async function guardar() {
    setEnviando(true);
    setError('');
    const elegidas = items.map(({ tecnologiaId, cantidad }) => ({ tecnologiaId, cantidad }));
    try {
      const guardado = nuevo
        ? await api('/proyectos', 'POST', {
          nombre: proyecto.nombre, sitioId: proyecto.sitioId, tipoSalaId: proyecto.tipoSalaId, ancho: proyecto.ancho, largo: proyecto.largo, items: elegidas,
        })
        : await api(`/proyectos/${proyecto.id}`, 'PUT', { items: elegidas });
      saliendo.current = true;
      avisarCambioProyectos();
      navegar(`/proyectos/${guardado.id}`);
    } catch (e) {
      const detalle = Object.values(e.errores ?? {});
      setError(detalle.length ? detalle.join(' ') : e.message);
      setEnviando(false);
    }
  }

  // Volver al paso 1 no es una navegación: con tecnologías elegidas, pregunta con el mismo diálogo que al salir
  function volver() {
    if (sucio) setPreguntarVolver(true);
    else alVolver();
  }

  // El diálogo sirve para las dos salidas: "← Paso 1" o una navegación bloqueada
  function seguirEditando() {
    setPreguntarVolver(false);
    bloqueo.reset?.();
  }

  function salirSinGuardar() {
    if (preguntarVolver) {
      setPreguntarVolver(false);
      alVolver();
    } else {
      bloqueo.proceed?.();
    }
  }


  return (
    <Box>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ mb: 3, justifyContent: 'space-between', alignItems: { md: 'flex-end' } }}>
        <Box>
          <Typography variant="body2" color="text.secondary">Planificación / {nuevo ? 'Nuevo proyecto' : proyecto.nombre}</Typography>
          <Typography variant="h4" component="h1">{nuevo ? proyecto.nombre : `Edición: ${proyecto.nombre}`}</Typography>
          <Typography color="text.secondary">
            {proyecto.sitio} | {etiquetaTipo(proyecto.tipoSala)} | {metros(proyecto.ancho)} × {metros(proyecto.largo)} m | estándar v{version}{nuevo && ' | Tecnologías'}
          </Typography>
        </Box>
        <Stack direction="row" spacing={1} sx={{ flexShrink: 0 }}>
          {alVolver && <Button onClick={volver} disabled={enviando}>← Paso 1</Button>}
          <Button variant="outlined" onClick={alCancelar} disabled={enviando}>Cancelar</Button>
          <Button variant="contained" onClick={guardar} disabled={!items.length || !sucio || enviando}>Guardar proyecto</Button>
        </Stack>
      </Stack>

      {version !== vigente.numero && (
        <Alert severity="info" sx={{ mb: 2 }}>
          El proyecto usa la versión {version} del estándar, con la que fue creado. La vigente es la {vigente.numero}.{' '}
          {fueraQuedan.length
            ? `${fueraQuedan.join(', ')} no están en la vigente: se conservan con su precio, pero no se pueden sumar unidades ni volver a agregar si se quitan`
            : `Todas sus tecnologías están en la vigente: al guardar, pasa a la versión ${vigente.numero} y se quita la etiqueta de estándar desactualizado`}
        </Alert>
      )}
      {proyecto.estado === 'Denegado' && (
        <Alert severity="info" sx={{ mb: 2 }}>El proyecto fue denegado: al guardar los cambios, vuelve a quedar pendiente de aprobación</Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {sucio && <Alert severity="warning" sx={{ mb: 2 }}>Hay cambios sin guardar</Alert>}

      {/* Izquierda: tecnologías del estándar (ocupa dos filas). Derecha: escena y, debajo, presupuesto. */}
      <Box sx={{ display: 'grid', gap: 3, alignItems: 'start', gridTemplateColumns: { xs: '1fr', lg: '340px minmax(0, 1fr)' } }}>
        <Paper variant="outlined" sx={{ p: 2.5, gridRow: { lg: 'span 2' } }}>
          <Typography variant="h6" component="h2">Tecnologías del estándar</Typography>
          <Typography variant="body2" color="text.secondary">
            Versión {vigente.numero}. Solo se ofrecen tecnologías activas del catálogo
          </Typography>

          {grupos.map(([categoria, lista]) => {
            const { color, grupo } = CATEGORIA_VISUAL[categoria.nombre];
            return (
              <Box key={categoria.id}>
                <Typography component="h3" sx={{ mt: 2.5, mb: 1, px: 1.5, py: 0.5, fontSize: 13, fontWeight: 700, textTransform: 'uppercase', letterSpacing: 0.5, color, bgcolor: `${color}14`, borderLeft: `3px solid ${color}` }}>
                  {grupo}
                </Typography>
                {categoria.id === SOPORTE ? (
                  <Montaje lista={lista} elegido={soporteElegido} hayPizarra={hayPizarra} alElegir={(id) => cambiar(elegirMontaje(items, opciones, id))} />
                ) : (
                  lista.map(({ tecnologia: t, cantidadMaxima }) => {
                    const lleno = cantidadDe(t.id) >= cantidadMaxima;
                    const motivo = !lleno && motivoBloqueo(items, opciones, t.id);
                    return (
                      <Stack key={t.id} direction="row" spacing={1.5} sx={{ py: 1, alignItems: 'center' }}>
                        <IconoCategoria categoria={categoria.nombre} />
                        <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                          <Typography sx={{ fontWeight: 700 }}>{t.modelo}</Typography>
                          <Typography variant="body2" color="text.secondary">{t.marca}</Typography>
                          <Typography variant="body2" color="text.secondary">USD {usd(t.precioCentavos)}, máx. {cantidadMaxima}</Typography>
                          {motivo && <Typography variant="caption" color="warning.dark">{motivo}</Typography>}
                        </Box>
                        <Button variant="outlined" size="small" onClick={() => sumar(t.id)} disabled={lleno || Boolean(motivo)} aria-label={`Agregar ${t.marca} ${t.modelo}`}>
                          {lleno ? 'Máximo' : 'Agregar'}
                        </Button>
                      </Stack>
                    );
                  })
                )}
              </Box>
            );
          })}
        </Paper>

        <EscenaSala ancho={proyecto.ancho} largo={proyecto.largo} capacidad={proyecto.tipoSala.capacidad} items={items} />

        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="h6" component="h2" gutterBottom>Presupuesto estimado</Typography>
          <TablaDePresupuesto items={items} alSumar={sumar} alRestar={(id) => cambiar(quitar(items, opciones, id))} alQuitar={(id) => cambiar(quitar(items, opciones, id, true))} puedeSumar={(id) => !motivoBloqueo(items, opciones, id)} />
        </Paper>
      </Box>

      <Dialog open={bloqueo.state === 'blocked' || preguntarVolver} onClose={seguirEditando}>
        <DialogTitle>Hay cambios sin guardar</DialogTitle>
        <DialogContent>
          <DialogContentText>Si salís ahora, se pierden las tecnologías agregadas o quitadas desde el último guardado</DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={seguirEditando}>Seguir editando</Button>
          <Button variant="contained" color="error" onClick={salirSinGuardar}>Salir sin guardar</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}

// Montaje de la pizarra: en la pared o en uno de los carritos del estándar
function Montaje({ lista, elegido, hayPizarra, alElegir }) {
  return (
    <FormControl disabled={!hayPizarra} sx={{ px: 1 }}>
      <FormLabel id="montaje-pizarra" sx={{ fontSize: 14 }}>Montaje de la pizarra</FormLabel>
      <RadioGroup
        aria-labelledby="montaje-pizarra"
        value={elegido == null ? 'pared' : String(elegido)}
        onChange={(e) => alElegir(e.target.value === 'pared' ? null : Number(e.target.value))}
      >
        <FormControlLabel value="pared" control={<Radio size="small" />} label="En la pared" />
        {lista.map(({ tecnologia: t }) => (
          <FormControlLabel key={t.id} value={String(t.id)} control={<Radio size="small" />}
            label={`En carrito ${t.marca} ${t.modelo} (suma USD ${usd(t.precioCentavos)})`} />
        ))}
      </RadioGroup>
      {!hayPizarra && <FormHelperText>Agregá una pizarra para elegir dónde se monta</FormHelperText>}
    </FormControl>
  );
}

// Edición de un proyecto guardado (/proyectos/:id/editar). Un aprobado es de solo lectura.
export function EditarProyecto() {
  const { id } = useParams();
  const navegar = useNavigate();
  const [proyecto, setProyecto] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    api(`/proyectos/${id}`).then(setProyecto).catch((e) => setError(e.message));
  }, [id]);

  if (error) {
    return (
      <Alert severity="error">
        {error} <Link component={RouterLink} to="/proyectos">Volver al historial</Link>
      </Alert>
    );
  }
  if (!proyecto) return <CircularProgress />;
  if (proyecto.estado === 'Aprobado') {
    return (
      <Alert severity="info">
        Un proyecto aprobado es de solo lectura. <Link component={RouterLink} to={`/proyectos/${id}`}>Volver al proyecto</Link>
      </Alert>
    );
  }
  return <Configurador proyecto={proyecto} alCancelar={() => navegar(`/proyectos/${id}`)} />;
}
