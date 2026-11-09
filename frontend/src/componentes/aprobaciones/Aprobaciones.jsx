// Aprobación presupuestaria (HU-013): una bandeja por rol según el total con mano de obra. Los pendientes salen de la API.
import { useEffect, useState } from 'react';
import { Link as RouterLink } from 'react-router';
import { Alert, Box, Button, Chip, CircularProgress, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { rolAprobador } from '../proyectos/Presupuesto';
import { fecha, usd } from '../proyectos/Formato';
import { etiquetaTipo } from '../estandares/Versiones';
import { api } from '../../api';
import { useSesion } from '../../sesion';
import { puede } from '../../permisos';

const BANDEJAS = [
  { rol: 'analista', titulo: 'Analista de presupuestos', detalle: 'Proyectos pendientes con total de hasta 20.000 USD, mano de obra incluida' },
  { rol: 'jefe', titulo: 'Jefe de control de gestión', detalle: 'Proyectos pendientes con total mayor a 20.000 USD' },
];
const enviado = (p) => p.edicion?.fecha ?? p.creacion;

// Cada rol ve su bandeja (analista o jefe); el desarrollador, las dos. La API controla el monto al resolver
export default function Aprobaciones() {
  const { usuario } = useSesion();
  const [pendientes, setPendientes] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Los más antiguos se muestran primero
  useEffect(() => {
    api('/proyectos?estado=Pendiente')
      .then((lista) => setPendientes(lista.sort((a, b) => String(enviado(a)).localeCompare(String(enviado(b))))))
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, []);

  if (cargando) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>Aprobación presupuestaria</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack spacing={3}>
        {BANDEJAS.filter((b) => puede(usuario, 'aprobaciones.todos-los-montos') || usuario.rolId === b.rol).map((b) => {
          const lista = pendientes.filter((p) => rolAprobador(p.total) === b.rol);
          return (
            <Paper key={b.rol} variant="outlined" sx={{ p: 3 }}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography variant="h6" component="h2">{b.titulo}</Typography>
                <Chip size="small" label={`${lista.length} ${lista.length === 1 ? 'pendiente' : 'pendientes'}`} color={lista.length ? 'warning' : 'default'} />
              </Stack>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>{b.detalle}</Typography>

              {lista.length ? (
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#f4f6f9' } }}>
                        <TableCell>Proyecto</TableCell>
                        <TableCell>Tipo de sala</TableCell>
                        <TableCell>Gestor</TableCell>
                        <TableCell>Enviado</TableCell>
                        <TableCell>Total (USD)</TableCell>
                        <TableCell />
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {lista.map((p) => (
                        <TableRow key={p.id} hover>
                          <TableCell>
                            {p.nombre}
                            {p.edicion && <Chip label="Editado" size="small" variant="outlined" sx={{ ml: 1 }} />}
                          </TableCell>
                          <TableCell>{etiquetaTipo(p.tipoSala)}</TableCell>
                          <TableCell>{p.gestor}</TableCell>
                          <TableCell>{fecha(enviado(p))}</TableCell>
                          <TableCell>{usd(p.total)}</TableCell>
                          <TableCell>
                            <Button size="small" variant="outlined" component={RouterLink} to={`/aprobaciones/${p.id}`}>Revisar</Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              ) : (
                <Typography color="text.secondary">No hay proyectos pendientes en este rango</Typography>
              )}
            </Paper>
          );
        })}
      </Stack>
    </Box>
  );
}
