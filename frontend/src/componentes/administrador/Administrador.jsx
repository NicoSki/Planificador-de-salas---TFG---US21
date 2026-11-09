// Apartado Administrador: cuentas, roles y credenciales de acceso. Los datos salen de la API
import { useEffect, useRef, useState } from 'react';
import {Alert, Box, Button, Chip, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, MenuItem, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography} from '@mui/material';
import { bloqueada, estadoDe } from './Cuentas';
import { fechaYHora } from '../proyectos/Formato';
import { api } from '../../api';

const VACIO = { id: null, nombre: '', apellido: '', email: '', rolId: '' };
const nombreDe = (u) => `${u.nombre} ${u.apellido}`;

export default function Administrador() {
  const [usuarios, setUsuarios] = useState([]);
  const [roles, setRoles] = useState([]);
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [form, setForm] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [mensaje, setMensaje] = useState('');
  const [aBlanquear, setABlanquear] = useState(null); // cuenta esperando confirmación del blanqueo
  const [temporal, setTemporal] = useState(null); // { usuario, clave }: se muestra una sola vez
  const [copiada, setCopiada] = useState(false);
  const [enviando, setEnviando] = useState(false);
  const primerCampo = useRef(null);

  // La API devuelve las cuentas ordenadas por rol y apellido
  useEffect(() => {
    Promise.all([api('/usuarios'), api('/roles')])
      .then(([cuentas, lista]) => {
        setUsuarios(cuentas);
        setRoles(lista);
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, []);

  const ahora = Date.now();
  const bloqueadas = usuarios.filter((u) => bloqueada(u, ahora)).length;

  const cambiar = (campo) => (e) => {
    setForm({ ...form, [campo]: e.target.value });
    setErrores({ ...errores, [campo]: undefined });
  };

  function limpiar() {
    setForm(VACIO);
    setErrores({});
    setError('');
  }

  function editar(u) {
    setForm({ id: u.id, nombre: u.nombre, apellido: u.apellido, email: u.email, rolId: u.rolId });
    setErrores({});
    setError('');
    setMensaje('');
    primerCampo.current?.focus();
  }

  // Manda el cambio a la API y recarga la lista. Devuelve la respuesta, o null si falló (el error queda a la vista)
  async function enviar(ruta, metodo, cuerpo) {
    setEnviando(true);
    setError('');
    setMensaje('');
    try {
      const respuesta = await api(ruta, metodo, cuerpo);
      setUsuarios(await api('/usuarios'));
      return respuesta;
    } catch (e) {
      setErrores(e.errores);
      setError(e.message);
      return null;
    } finally {
      setEnviando(false);
    }
  }

  function mostrarTemporal({ usuario, claveTemporal }) {
    setCopiada(false);
    setTemporal({ usuario, clave: claveTemporal });
  }

  async function guardar(e) {
    e.preventDefault();
    const nueva = form.id == null;
    const respuesta = await enviar(nueva ? '/usuarios' : `/usuarios/${form.id}`, nueva ? 'POST' : 'PUT', form);
    if (!respuesta) return;
    if (nueva) {
      setMensaje(`Cuenta creada para ${nombreDe(respuesta.usuario)}, con rol ${respuesta.usuario.rol}`);
      mostrarTemporal(respuesta);
    } else {
      setMensaje(`Cambios guardados en la cuenta de ${nombreDe(respuesta)}`);
    }
    limpiar();
  }

  async function blanquear() {
    const respuesta = await enviar(`/usuarios/${aBlanquear.id}/clave-temporal`, 'POST');
    setABlanquear(null);
    if (!respuesta) return;
    setMensaje(`Se asignó una contraseña temporal a ${nombreDe(respuesta.usuario)}`);
    mostrarTemporal(respuesta);
  }

  async function desbloquear(u) {
    if (await enviar(`/usuarios/${u.id}/desbloquear`, 'POST')) setMensaje(`La cuenta de ${nombreDe(u)} quedó desbloqueada`);
  }

  async function copiar() {
    try {
      await navigator.clipboard.writeText(temporal.clave);
      setCopiada(true);
    } catch {
      // Sin permiso de portapapeles: la contraseña queda visible para copiarla a mano.
    }
  }

  if (cargando) return <CircularProgress />;

  return (
    <Box>
      <Typography variant="h4" component="h1">Administrador</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Cuentas, roles y credenciales de acceso. {usuarios.length} cuentas
        {bloqueadas ? `, ${bloqueadas} ${bloqueadas === 1 ? 'bloqueada' : 'bloqueadas'}` : ''}
      </Typography>

      {mensaje && <Alert severity="success" onClose={() => setMensaje('')} sx={{ mb: 2 }}>{mensaje}</Alert>}
      {error && <Alert severity="error" onClose={() => setError('')} sx={{ mb: 2 }}>{error}</Alert>}

      {/* Izquierda: cuentas. Derecha: alta o edición. */}
      <Box sx={{ display: 'grid', gap: 3, gridTemplateColumns: { xs: '1fr', lg: 'minmax(0, 1fr) 360px' }, alignItems: 'start' }}>
        <Paper variant="outlined">
          <TableContainer>
            <Table size="small">
              <TableHead>
                <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#f4f6f9' } }}>
                  <TableCell>Usuario</TableCell>
                  <TableCell>Rol</TableCell>
                  <TableCell>Estado</TableCell>
                  <TableCell>Último ingreso</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {usuarios.map((u) => {
                  const estado = estadoDe(u, ahora);
                  const nombre = nombreDe(u);
                  return (
                    <TableRow key={u.id} hover>
                      <TableCell>
                        <Typography variant="body2" component="div" sx={{ fontWeight: 600 }}>
                          {nombre}
                          {u.actual && <Chip label="Vos" size="small" color="info" sx={{ ml: 1 }} />}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">{u.email}</Typography>
                      </TableCell>
                      <TableCell>{u.rol}</TableCell>
                      <TableCell>
                        <Chip label={estado.texto} color={estado.color} size="small" variant="outlined" />
                        {estado.detalle && (
                          <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>{estado.detalle}</Typography>
                        )}
                      </TableCell>
                      <TableCell>{u.ultimoIngreso ? fechaYHora(u.ultimoIngreso) : 'Nunca'}</TableCell>
                      <TableCell>
                        <Stack direction="row" spacing={0.5} sx={{ justifyContent: 'flex-end', whiteSpace: 'nowrap' }}>
                          <Button size="small" onClick={() => editar(u)} aria-label={`Editar la cuenta de ${nombre}`}>Editar</Button>
                          <Button size="small" onClick={() => setABlanquear(u)} aria-label={`Asignar contraseña temporal a ${nombre}`}>
                            Contraseña temporal
                          </Button>
                          {bloqueada(u, ahora) && (
                            <Button size="small" color="error" onClick={() => desbloquear(u)} disabled={enviando} aria-label={`Desbloquear la cuenta de ${nombre}`}>
                              Desbloquear
                            </Button>
                          )}
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>
          <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
            Las contraseñas se guardan cifradas con hash: nadie puede verlas. Si alguien olvida la suya, asignale una contraseña temporal
          </Typography>
        </Paper>

        <Paper variant="outlined" component="form" onSubmit={guardar} noValidate sx={{ p: 3 }}>
          <Typography variant="h6" component="h2" gutterBottom>{form.id == null ? 'Nueva cuenta' : 'Editar cuenta'}</Typography>
          <Stack spacing={2}>
            <TextField
              label="Nombre" required value={form.nombre} onChange={cambiar('nombre')} inputRef={primerCampo}
              error={Boolean(errores.nombre)} helperText={errores.nombre} slotProps={{ htmlInput: { maxLength: 60 } }}
            />
            <TextField
              label="Apellido" required value={form.apellido} onChange={cambiar('apellido')}
              error={Boolean(errores.apellido)} helperText={errores.apellido} slotProps={{ htmlInput: { maxLength: 60 } }}
            />
            <TextField
              label="Correo electrónico" type="email" required value={form.email} onChange={cambiar('email')}
              error={Boolean(errores.email)} helperText={errores.email ?? 'Es el usuario para iniciar sesión'}
              slotProps={{ htmlInput: { maxLength: 120 } }}
            />
            <TextField
              select label="Rol" required value={form.rolId} onChange={cambiar('rolId')}
              error={Boolean(errores.rolId)} helperText={errores.rolId}
            >
              {roles.map((r) => <MenuItem key={r.id} value={r.id}>{r.nombre}</MenuItem>)}
            </TextField>
          </Stack>
          {form.id == null && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 2 }}>
              La cuenta se crea con una contraseña temporal que vence a las 24 horas
            </Typography>
          )}
          <Stack direction="row" spacing={1} sx={{ mt: 3, justifyContent: 'flex-end' }}>
            <Button onClick={limpiar} disabled={enviando}>Cancelar</Button>
            <Button type="submit" variant="contained" disabled={enviando}>{form.id == null ? 'Crear cuenta' : 'Guardar cambios'}</Button>
          </Stack>
        </Paper>
      </Box>

      {aBlanquear && (
        <Dialog open onClose={() => setABlanquear(null)} fullWidth maxWidth="sm">
          <DialogTitle>Asignar contraseña temporal</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Se genera una contraseña temporal para <strong>{nombreDe(aBlanquear)}</strong>. La contraseña actual deja de funcionar y,
              si la cuenta está bloqueada, se desbloquea
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setABlanquear(null)} disabled={enviando}>Cancelar</Button>
            <Button variant="contained" onClick={blanquear} disabled={enviando}>Generar contraseña</Button>
          </DialogActions>
        </Dialog>
      )}

      {temporal && (
        <Dialog open onClose={() => setTemporal(null)} fullWidth maxWidth="sm">
          <DialogTitle>Contraseña temporal</DialogTitle>
          <DialogContent>
            <DialogContentText>
              Comunicale esta contraseña a <strong>{nombreDe(temporal.usuario)}</strong> ({temporal.usuario.email}). Se muestra una sola vez
            </DialogContentText>
            <Stack direction="row" spacing={2} sx={{ alignItems: 'center', my: 2, p: 2, bgcolor: '#f4f6f9', borderRadius: 1 }}>
              <Typography sx={{ fontFamily: 'monospace', fontSize: 20, letterSpacing: 1, flexGrow: 1 }}>{temporal.clave}</Typography>
              <Button variant="outlined" size="small" onClick={copiar}>{copiada ? 'Copiada' : 'Copiar'}</Button>
            </Stack>
            <DialogContentText>
              Vence el {fechaYHora(temporal.usuario.claveTemporalVence)}. Al ingresar, tiene que reemplazarla por una propia
            </DialogContentText>
          </DialogContent>
          <DialogActions>
            <Button variant="contained" onClick={() => setTemporal(null)}>Listo</Button>
          </DialogActions>
        </Dialog>
      )}
    </Box>
  );
}
