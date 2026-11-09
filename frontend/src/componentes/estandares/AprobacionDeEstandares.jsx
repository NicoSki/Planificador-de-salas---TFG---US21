// Aprobación de estándares (HU-004): el líder aprueba o rechaza cada versión pendiente. Todo sale de la API.
import { useCallback, useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Paper, Stack, TextField, Typography } from '@mui/material';
import TablaDeComparacion from './TablaDeComparacion';
import { autorDe, avisarCambioEstandares, etiquetaTipo, vigenteDe } from './Versiones';
import { fechaYHora } from '../proyectos/Formato';
import { api } from '../../api';

// Una tarjeta por versión pendiente, con Aprobar y Rechazar
export default function AprobacionEstandares() {
  const [versiones, setVersiones] = useState([]); // pendientes y vigentes: la vigente es la base de cada comparación
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');
  const [pedido, setPedido] = useState(null);
  const [motivo, setMotivo] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Pide las versiones pendientes y las vigentes. Se repite después de cada aprobación o rechazo.
  const cargar = useCallback(
    () => Promise.all([api('/versiones?estado=Pendiente'), api('/versiones?estado=Vigente')])
      .then(([pendientes, vigentes]) => setVersiones([...pendientes, ...vigentes]))
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false)),
    [],
  );
  useEffect(() => { cargar(); }, [cargar]);

  const pendientes = versiones.filter((v) => v.estado === 'Pendiente');

  function cerrar() {
    setPedido(null);
    setMotivo('');
  }

  // Aprobar: pasa a vigente y la anterior queda histórica. Rechazar: la vigente no cambia.
  async function confirmar() {
    const { version, aprobar } = pedido;
    setEnviando(true);
    setError('');
    try {
      await api(`/versiones/${version.id}/${aprobar ? 'aprobar' : 'rechazar'}`, 'POST', aprobar ? undefined : { motivo });
      setAviso(`${etiquetaTipo(version.tipoSala)}, versión ${version.numero}: ${aprobar ? 'Aprobada. Ya es la versión vigente' : 'Rechazada'}`);
      avisarCambioEstandares();
      await cargar();
    } catch (e) {
      setError(e.message);
    } finally {
      setEnviando(false);
      cerrar();
    }
  }

  if (cargando) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>Aprobación de estándares</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {aviso && <Alert severity="success" onClose={() => setAviso('')} sx={{ mb: 2 }}>{aviso}</Alert>}

      <Stack spacing={3}>
        {!pendientes.length && (
          <Paper variant="outlined" sx={{ p: 3 }}>
            <Typography color="text.secondary">
              No hay versiones pendientes de aprobación. Las propuestas se envían desde Estándares de sala
            </Typography>
          </Paper>
        )}

        {pendientes.map((v) => (
          <Paper key={v.id} variant="outlined" sx={{ p: 3 }}>
            <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
              <Typography variant="h6" component="h2">{etiquetaTipo(v.tipoSala)}: versión {v.numero}</Typography>
              <Chip label="Pendiente" size="small" color="warning" />
            </Stack>
            <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5, mb: 2 }}>
              Propuesta por {autorDe(v)} el {fechaYHora(v.fechaCreacion)}. Observaciones: {v.observaciones || 'sin observaciones'}
            </Typography>
            <TablaDeComparacion vigente={vigenteDe(versiones, v.tipoSalaId)} propuesta={v} />
            <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', mt: 2 }}>
              <Button variant="outlined" onClick={() => setPedido({ version: v, aprobar: false })}>Rechazar</Button>
              <Button variant="contained" onClick={() => setPedido({ version: v, aprobar: true })}>Aprobar versión</Button>
            </Stack>
          </Paper>
        ))}
      </Stack>

      <Dialog open={Boolean(pedido)} onClose={cerrar} fullWidth maxWidth="sm">
        {pedido && (
          <>
            <DialogTitle>{pedido.aprobar ? 'Aprobar versión' : 'Rechazar versión'}</DialogTitle>
            <DialogContent>
              <DialogContentText>
                {etiquetaTipo(pedido.version.tipoSala)}, versión {pedido.version.numero}.{' '}
                {pedido.aprobar
                  ? 'Pasa a ser la versión vigente y la actual queda como histórica. Los proyectos existentes conservan su versión.'
                  : 'La versión vigente no cambia.'}
              </DialogContentText>
              {!pedido.aprobar && (
                <TextField label="Motivo (opcional)" multiline minRows={3} fullWidth autoFocus value={motivo}
                  onChange={(e) => setMotivo(e.target.value)} slotProps={{ htmlInput: { maxLength: 500 } }} sx={{ mt: 2 }} />
              )}
            </DialogContent>
            <DialogActions>
              <Button onClick={cerrar} disabled={enviando}>Cancelar</Button>
              <Button variant="contained" color={pedido.aprobar ? 'primary' : 'error'} onClick={confirmar} disabled={enviando}>
                {pedido.aprobar ? 'Aprobar' : 'Rechazar'}
              </Button>
            </DialogActions>
          </>
        )}
      </Dialog>
    </Box>
  );
}
