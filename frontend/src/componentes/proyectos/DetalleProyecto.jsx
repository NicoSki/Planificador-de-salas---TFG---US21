// Detalle del proyecto (HU-012 y HU-013): datos, aprobación presupuestaria, escena 3D y presupuesto con el precio cotizado.
// Desde el historial (vista del gestor) muestra el estado; desde Aprobación presupuestaria ("revision") aprueba o deniega.
import { Fragment, useEffect, useState } from 'react';
import { Link as RouterLink, useParams } from 'react-router';
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Link, Paper, Stack, TextField, Typography } from '@mui/material';
import EscenaSala from './EscenaSala';
import TablaDePresupuesto from './TablaDePresupuesto';
import { COLOR_ESTADO, avisarCambioProyectos, rolAprobador } from './Presupuesto';
import { fecha, metros, usd } from './Formato';
import { etiquetaTipo } from '../estandares/Versiones';
import { api, descargar } from '../../api';
import { useSesion } from '../../sesion';
import { puede, puedeResolver } from '../../permisos';

// Proyecto de la dirección /proyectos/:id o /aprobaciones/:id
export default function DetalleProyecto({ revision = false }) {
  const { id } = useParams();
  const { usuario } = useSesion();
  const [proyecto, setProyecto] = useState(null);
  const [cargando, setCargando] = useState(true);
  const [errorCarga, setErrorCarga] = useState('');
  const [decision, setDecision] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [enviando, setEnviando] = useState(false);
  const [errorDocumento, setErrorDocumento] = useState('');

  useEffect(() => {
    api(`/proyectos/${id}`)
      .then(setProyecto)
      .catch((e) => setErrorCarga(e.message))
      .finally(() => setCargando(false));
  }, [id]);

  const volver = revision ? { a: '/aprobaciones', texto: 'Volver a Aprobación presupuestaria' } : { a: '/proyectos', texto: 'Volver al historial' };
  if (cargando) return <CircularProgress />;
  if (!proyecto) {
    return (
      <Typography>
        {errorCarga} <Link component={RouterLink} to={volver.a}>{volver.texto}</Link>
      </Typography>
    );
  }

  const tipo = proyecto.tipoSala;
  const desactualizado = proyecto.versionVigente !== null && proyecto.versionVigente !== proyecto.version;
  const analista = rolAprobador(proyecto.total) === 'analista';
  const r = proyecto.resolucion;

  const datos = [
    ['Sitio', proyecto.sitio],
    ['Tipo de sala', etiquetaTipo(tipo)],
    ['Dimensiones', `${metros(proyecto.ancho)} × ${metros(proyecto.largo)} m`],
    ['Capacidad de referencia', `${tipo.capacidad} personas`],
    ['Estándar', `Versión ${proyecto.version}${desactualizado ? ` (la vigente es la ${proyecto.versionVigente})` : ''}`],
    ['Gestor', proyecto.gestor],
    ['Creación', fecha(proyecto.creacion)],
    ['Última actualización', proyecto.edicion ? `${fecha(proyecto.edicion.fecha)}, ${proyecto.edicion.usuario}` : 'Sin ediciones'],
  ];

  function cerrar() {
    setDecision(null);
    setMotivo('');
    setError('');
  }

  // El motivo es obligatorio al denegar. La API registra usuario, fecha y monto.
  async function confirmar() {
    if (decision === 'Denegado' && !motivo.trim()) return setError('Indicá el motivo de la denegación');
    setEnviando(true);
    try {
      const aprobar = decision === 'Aprobado';
      setProyecto(await api(`/proyectos/${proyecto.id}/${aprobar ? 'aprobar' : 'denegar'}`, 'POST', aprobar ? undefined : { motivo }));
      setAviso(`Proyecto ${aprobar ? 'aprobado' : 'denegado'}. Quedó registrado con tu usuario, la fecha y el monto.`);
      avisarCambioProyectos();
      cerrar();
    } catch (e) {
      setError(e.errores?.motivo ?? e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <Box>
      <Button component={RouterLink} to={volver.a} sx={{ mb: 1 }}>← {volver.texto}</Button>

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} sx={{ mb: 3, alignItems: { md: 'center' } }}>
        <Typography variant="h4" component="h1">{proyecto.nombre}</Typography>
        <Chip label={proyecto.estado} color={COLOR_ESTADO[proyecto.estado]} />
        {proyecto.edicion && <Chip label="Proyecto editado" variant="outlined" />}
        {desactualizado && <Chip label="Estándar desactualizado" color="warning" variant="outlined" />}
        <Box sx={{ flexGrow: 1 }} />
        {!revision && (
          <>
            {puede(usuario, 'proyectos.editar') && (
              <Button variant="outlined" onClick={() => { setErrorDocumento(''); descargar(`/proyectos/${proyecto.id}/documento`).catch((e) => setErrorDocumento(e.message)); }}>
                Descargar documento PDF
              </Button>
            )}
            {puede(usuario, 'proyectos.editar') && (
              <Button variant="contained" component={RouterLink} to={`/proyectos/${proyecto.id}/editar`} disabled={proyecto.estado === 'Aprobado'}>
                Editar proyecto
              </Button>
            )}
          </>
        )}
      </Stack>

      {aviso && <Alert severity="success" sx={{ mb: 2 }}>{aviso}</Alert>}
      {errorDocumento && <Alert severity="error" onClose={() => setErrorDocumento('')} sx={{ mb: 2 }}>{errorDocumento}</Alert>}

      {/* Izquierda: datos y aprobación, uno debajo del otro. Derecha: escena 3D. */}
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: '380px minmax(0, 1fr)' }, alignItems: 'start', mb: 3 }}>
        <Stack spacing={3}>
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography variant="h6" component="h2" gutterBottom>Datos del proyecto</Typography>
            <Box component="dl" sx={{ display: 'grid', gridTemplateColumns: 'auto 1fr', columnGap: 3, rowGap: 1, m: 0, '& dt': { color: 'text.secondary' }, '& dd': { m: 0 } }}>
              {datos.map(([dato, valor]) => (
                <Fragment key={dato}>
                  <dt>{dato}</dt>
                  <dd>{valor}</dd>
                </Fragment>
              ))}
            </Box>
          </Paper>

          <Paper variant="outlined" sx={{ p: 3, borderLeft: 4, borderLeftColor: `${COLOR_ESTADO[proyecto.estado]}.main` }}>
            <Typography variant="h6" component="h2" gutterBottom>Aprobación presupuestaria</Typography>
            {r ? (
              <>
                <Typography>
                  {proyecto.estado} por <strong>{r.usuario}</strong> el {fecha(r.fecha)}. Monto registrado: <strong>USD {usd(r.totalCentavos)}</strong>.
                </Typography>
                {r.motivo && <Typography sx={{ mt: 1 }}>Motivo: {r.motivo}</Typography>}
                {proyecto.estado === 'Denegado' && (
                  <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
                    Al guardar una edición, el proyecto vuelve a quedar pendiente de aprobación.
                  </Typography>
                )}
              </>
            ) : (
              <>
                <Typography>
                  Pendiente. Lo resuelve el <strong>{analista ? 'Analista de presupuestos' : 'Jefe de control de gestión'}</strong>{' '}
                  porque el total {analista ? 'no supera' : 'supera'} los 20.000 USD con mano de obra incluida
                </Typography>
                {/* Solo el rol del rango de monto. La API lo vuelve a controlar */}
                {revision && puedeResolver(usuario, proyecto.total) && (
                  <Stack direction="row" spacing={1} sx={{ mt: 2, justifyContent: 'flex-end' }}>
                    <Button variant="outlined" color="error" onClick={() => setDecision('Denegado')}>Denegar</Button>
                    <Button variant="contained" onClick={() => setDecision('Aprobado')}>Aprobar</Button>
                  </Stack>
                )}
              </>
            )}
          </Paper>
        </Stack>

        <EscenaSala ancho={proyecto.ancho} largo={proyecto.largo} capacidad={proyecto.tipoSala.capacidad} items={proyecto.items} />
      </Box>

      <Paper variant="outlined" sx={{ p: 3 }}>
        <Typography variant="h6" component="h2" gutterBottom>Tecnologías y presupuesto</Typography>
        <TablaDePresupuesto items={proyecto.items} />
      </Paper>

      <Dialog open={Boolean(decision)} onClose={cerrar} fullWidth maxWidth="sm">
        <DialogTitle>{decision === 'Denegado' ? 'Denegar proyecto' : 'Aprobar proyecto'}</DialogTitle>
        <DialogContent>
          <DialogContentText>
            {proyecto.nombre}, total USD {usd(proyecto.total)}. La resolución se registra con tu usuario, la fecha y el monto
          </DialogContentText>
          {decision === 'Denegado' && (
            <TextField
              label="Motivo de la denegación" required multiline minRows={3} fullWidth autoFocus value={motivo}
              onChange={(e) => { setMotivo(e.target.value); setError(''); }}
              error={Boolean(error)} helperText={error || ' '} slotProps={{ htmlInput: { maxLength: 500 } }} sx={{ mt: 2 }}
            />
          )}
          {decision === 'Aprobado' && error && <Alert severity="error" sx={{ mt: 2 }}>{error}</Alert>}
        </DialogContent>
        <DialogActions>
          <Button onClick={cerrar} disabled={enviando}>Cancelar</Button>
          <Button variant="contained" color={decision === 'Denegado' ? 'error' : 'primary'} onClick={confirmar} disabled={enviando}>
            {decision === 'Denegado' ? 'Denegar' : 'Aprobar'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
