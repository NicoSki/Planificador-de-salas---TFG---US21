// Historial de proyectos (HU-011): filtros por sitio, tipo de sala, gestor y estado, con el total estimado. Todo sale de la API.
import { useEffect, useState } from 'react';
import { Alert, Box, Button, Chip, CircularProgress, Link, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography} from '@mui/material';
import { Link as RouterLink, useSearchParams } from 'react-router';
import { COLOR_ESTADO } from './Presupuesto';
import { useSesion } from '../../sesion';
import { puede } from '../../permisos';
import { fecha, usd } from './Formato';
import { etiquetaTipo } from '../estandares/Versiones';
import { api } from '../../api';

const SELECT_FILTRO = { inputLabel: { shrink: true }, select: { displayEmpty: true } };
const ultimaActualizacion = (p) => p.edicion?.fecha ?? p.creacion;
const plural = (n, uno, varios) => `${n} ${n === 1 ? uno : varios}`;
const CAMPOS = ['sitioId', 'tipoSalaId', 'gestorId', 'estado']; // filtros guardados en la dirección (?sitioId=...)

// Lista filtrada; al elegir un proyecto muestra su detalle
export default function Proyectos() {
  const { usuario } = useSesion();
  const [parametros, setParametros] = useSearchParams();
  const [proyectos, setProyectos] = useState([]);
  const [sitios, setSitios] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');

  // Al abrir la página: proyectos y tablas fijas para los filtros, en paralelo.
  useEffect(() => {
    Promise.all([api('/proyectos'), api('/sitios'), api('/tipos-sala')])
      .then(([listaProyectos, listaSitios, listaTipos]) => {
        setProyectos(listaProyectos);
        setSitios(listaSitios);
        setTipos(listaTipos);
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, []);

  const filtro = Object.fromEntries(CAMPOS.map((c) => [c, parametros.get(c) ?? '']));
  // Los valores de la dirección son texto: gestorId se compara como texto.
  const lista = proyectos
    .filter((p) => CAMPOS.every((c) => !filtro[c] || String(p[c]) === filtro[c]))
    .sort((a, b) => String(ultimaActualizacion(b)).localeCompare(String(ultimaActualizacion(a))));
  const gestores = [...new Map(proyectos.map((p) => [String(p.gestorId), p.gestor])).entries()];
  const cuenta = (estado) => lista.filter((p) => p.estado === estado).length;
  const inversion = lista.filter((p) => p.estado === 'Aprobado').reduce((s, p) => s + p.total, 0);
  const cambiar = (campo) => (e) => {
    const nuevos = new URLSearchParams(parametros);
    if (e.target.value) nuevos.set(campo, e.target.value);
    else nuevos.delete(campo);
    setParametros(nuevos, { replace: true });
  };

  // Select de filtro con la opción "Todos" primero
  const filtroSelect = (campo, label, opciones) => (
    <TextField size="small" select label={label} value={filtro[campo]} onChange={cambiar(campo)} slotProps={SELECT_FILTRO} sx={{ minWidth: 170, bgcolor: '#fff' }}>
      <MenuItem value="">Todos</MenuItem>
      {opciones.map(([valor, texto]) => <MenuItem key={valor} value={valor}>{texto}</MenuItem>)}
    </TextField>
  );

  return (
    <Box>
      <Stack direction="row" sx={{ mb: 3, justifyContent: 'space-between', alignItems: 'center' }}>
        <Typography variant="h4" component="h1">Historial de proyectos</Typography>
        {puede(usuario, 'proyectos.editar') && <Button variant="contained" component={RouterLink} to="/proyectos/nuevo">+ Nuevo proyecto</Button>}
      </Stack>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Stack direction={{ xs: 'column', md: 'row' }} spacing={1.5} role="search" sx={{ mb: 2 }}>
        {filtroSelect('sitioId', 'Sitio', sitios.map((s) => [s.id, s.nombre]))}
        {filtroSelect('tipoSalaId', 'Tipo de sala', tipos.map((t) => [t.id, etiquetaTipo(t)]))}
        {filtroSelect('gestorId', 'Gestor', gestores)}
        {filtroSelect('estado', 'Estado', Object.keys(COLOR_ESTADO).map((e) => [e, e]))}
      </Stack>

      <Typography sx={{ mb: 2 }}>
        {plural(lista.length, 'proyecto', 'proyectos')}: {plural(cuenta('Pendiente'), 'pendiente', 'pendientes')},{' '}
        {plural(cuenta('Aprobado'), 'aprobado', 'aprobados')} y {plural(cuenta('Denegado'), 'denegado', 'denegados')}.
        Inversión aprobada: <strong>USD {usd(inversion)}</strong>
      </Typography>

      {cargando ? (
        <CircularProgress />
      ) : (
        <Paper variant="outlined">
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#f4f6f9' } }}>
                  <TableCell>Proyecto</TableCell>
                  <TableCell>Sitio</TableCell>
                  <TableCell>Tipo de sala</TableCell>
                  <TableCell>Gestor</TableCell>
                  <TableCell>Estándar</TableCell>
                  <TableCell>Total (USD)</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Última actualización</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {lista.map((p) => (
                  <TableRow key={p.id} hover>
                    <TableCell>
                      <Link component={RouterLink} to={`/proyectos/${p.id}`} sx={{ fontWeight: 600 }}>{p.nombre}</Link>
                      {p.edicion && <Chip label="Editado" size="small" variant="outlined" sx={{ ml: 1 }} />}
                    </TableCell>
                    <TableCell>{p.sitio}</TableCell>
                    <TableCell>{etiquetaTipo(p.tipoSala)}</TableCell>
                    <TableCell>{p.gestor}</TableCell>
                    <TableCell>v{p.version}</TableCell>
                    <TableCell>{usd(p.total)}</TableCell>
                    <TableCell><Chip label={p.estado} size="small" color={COLOR_ESTADO[p.estado]} /></TableCell>
                    <TableCell>{fecha(ultimaActualizacion(p))}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
          {!lista.length && (
            <Typography color="text.secondary" sx={{ p: 3, textAlign: 'center' }}>
              {proyectos.length
                ? 'Ningún proyecto cumple con los filtros. Intentar con otro sitio, tipo de sala, gestor o estado'
                : 'Todavía no hay proyectos. Creá el primero desde el botón "+ Nuevo proyecto"'}
            </Typography>
          )}
        </Paper>
      )}
    </Box>
  );
}
