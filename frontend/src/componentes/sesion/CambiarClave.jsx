// Cambio de la propia contraseña. Obligatorio con contraseña temporal (cuenta nueva o blanqueo): hasta cambiarla no se ve el resto
import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { Alert, Box, Button, Stack, TextField, Typography } from '@mui/material';
import { PantallaDeAcceso } from './Ingresar';
import { salir, useSesion } from '../../sesion';
import { api } from '../../api';

const VACIO = { actual: '', nueva: '', repetida: '' };

export default function CambiarClave() {
  const { usuario, setUsuario } = useSesion();
  const navegar = useNavigate();
  const [form, setForm] = useState(VACIO);
  const [errores, setErrores] = useState({});
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  if (!usuario) return <Navigate to="/ingresar" replace />;
  const temporal = usuario.claveTemporal;

  const cambiar = (campo) => (e) => {
    setForm({ ...form, [campo]: e.target.value });
    setErrores({ ...errores, [campo]: undefined });
    setError('');
  };

  // La API valida la política y que no repita las últimas cinco. Los errores vuelven por campo
  async function guardar(e) {
    e.preventDefault();
    setEnviando(true);
    try {
      setUsuario((await api('/sesion/clave', 'PUT', form)).usuario);
      navegar('/', { replace: true });
    } catch (err) {
      setErrores(err.errores);
      if (!Object.keys(err.errores).length) setError(err.message);
      setEnviando(false);
    }
  }

  return (
    <PantallaDeAcceso titulo="Cambiar contraseña">
      <Stack component="form" onSubmit={guardar} noValidate spacing={2}>
        {temporal && <Alert severity="info">{usuario.nombre}, ingresaste con una contraseña temporal. Reemplazala por una propia para continuar</Alert>}
        {error && <Alert severity="error">{error}</Alert>}
        {!temporal && (
          <TextField label="Contraseña actual" type="password" autoComplete="current-password" required value={form.actual} onChange={cambiar('actual')}
            error={Boolean(errores.actual)} helperText={errores.actual} />
        )}
        <TextField label="Contraseña nueva" type="password" autoComplete="new-password" required value={form.nueva} onChange={cambiar('nueva')}
          error={Boolean(errores.nueva)} helperText={errores.nueva ?? 'De 12 a 64 caracteres, con mayúscula, minúscula, número y carácter especial. Distinta de las últimas cinco'} />
        <TextField label="Repetir la contraseña nueva" type="password" autoComplete="new-password" required value={form.repetida} onChange={cambiar('repetida')}
          error={Boolean(errores.repetida)} helperText={errores.repetida} />
        <Box sx={{ display: 'flex', gap: 1, justifyContent: 'flex-end' }}>
          {temporal
            ? <Button onClick={() => salir(setUsuario)} disabled={enviando}>Salir</Button>
            : <Button onClick={() => navegar(-1)} disabled={enviando}>Cancelar</Button>}
          <Button type="submit" variant="contained" disabled={enviando}>Guardar contraseña</Button>
        </Box>
        <Typography variant="body2" color="text.secondary">Sesión de {usuario.email}</Typography>
      </Stack>
    </PantallaDeAcceso>
  );
}
