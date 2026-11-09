// Inicio de sesión (HU-001): correo y contraseña. La API responde con un mensaje genérico ante cualquier error de acceso
import { useState } from 'react';
import { Navigate } from 'react-router';
import { Alert, Box, Button, Paper, Stack, TextField, Typography } from '@mui/material';
import { useSesion } from '../../sesion';
import { api } from '../../api';

const VENTAJAS = [
  'Catálogo único de tecnologías homologadas',
  'Validación automática contra el estándar',
  'Representación tridimensional de la sala',
  'Cotización calculada en tiempo real',
];

// Marco común de Ingresar y Cambiar contraseña: presentación a la izquierda y tarjeta a la derecha (una debajo de la otra en pantallas chicas)
export function PantallaDeAcceso({ titulo, subtitulo, children }) {
  return (
    <Box sx={{ minHeight: '100vh', display: 'flex', alignItems: 'center', px: { xs: 2, md: 7 }, py: 4, color: '#fff', background: 'linear-gradient(135deg, #1f4e79 0%, #2c6aa3 100%)' }}>
      <Box sx={{ width: '100%', maxWidth: 1240, mx: 'auto', display: 'grid', gap: 6, alignItems: 'center', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 430px' } }}>
        <Box>
          <Typography variant="h3" component="p" sx={{ fontWeight: 700, mb: 2 }}>Planificador de Salas</Typography>
          <Typography sx={{ fontSize: 17, lineHeight: 1.6, color: '#dbe6f1', maxWidth: 560, mb: 4 }}>
            Diseñá salas de videoconferencia, colaboración y BYOM a partir del estándar homologado de la organización y obtené su estimación presupuestaria al instante.
          </Typography>
          <Stack component="ul" spacing={1.5} sx={{ listStyle: 'none', p: 0, m: 0 }}>
            {VENTAJAS.map((v) => (
              <Box component="li" key={v} sx={{ display: 'flex', gap: 1.5 }}>
                <span aria-hidden="true">✓</span>{v}
              </Box>
            ))}
          </Stack>
        </Box>

        <Paper elevation={8} sx={{ p: 4, borderRadius: 3 }}>
          <Typography variant="h5" component="h1" sx={{ fontWeight: 700, mb: subtitulo ? 0.5 : 3 }}>{titulo}</Typography>
          {subtitulo && <Typography variant="body2" color="text.secondary" sx={{ mb: 3 }}>{subtitulo}</Typography>}
          {children}
        </Paper>
      </Box>
    </Box>
  );
}

// Campo con la etiqueta arriba, como en el diseño
function Campo({ id, etiqueta, ...props }) {
  return (
    <Box>
      <Typography component="label" htmlFor={id} variant="body2" sx={{ display: 'block', fontWeight: 600, mb: 0.75 }}>{etiqueta}</Typography>
      <TextField id={id} fullWidth size="small" {...props} />
    </Box>
  );
}

export default function Ingresar() {
  const { usuario, setUsuario } = useSesion();
  const [form, setForm] = useState({ email: '', clave: '' });
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  // Con sesión abierta no hay nada que hacer acá: el inicio del rol, o el cambio de la contraseña temporal
  if (usuario) return <Navigate to={usuario.claveTemporal ? '/cambiar-clave' : '/'} replace />;

  const cambiar = (campo) => (e) => {
    setForm({ ...form, [campo]: e.target.value });
    setError('');
  };

  async function ingresar(e) {
    e.preventDefault();
    if (!form.email.trim() || !form.clave) return setError('Completá el correo y la contraseña.');
    setEnviando(true);
    try {
      setUsuario((await api('/sesion', 'POST', form)).usuario);
    } catch (err) {
      setError(err.message);
      setForm({ ...form, clave: '' });
      setEnviando(false);
    }
  }

  return (
    <PantallaDeAcceso titulo="Iniciar sesión" subtitulo="Ingresá con tu cuenta corporativa">
      <Stack component="form" onSubmit={ingresar} noValidate spacing={2.5}>
        {error && <Alert severity="error">{error}</Alert>}
        <Campo id="email" etiqueta="Correo electrónico" type="email" autoComplete="username" autoFocus required value={form.email} onChange={cambiar('email')} />
        <Campo id="clave" etiqueta="Contraseña" type="password" autoComplete="current-password" required value={form.clave} onChange={cambiar('clave')} />
        <Button type="submit" variant="contained" disableElevation disabled={enviando}
          sx={{ py: 1.25, fontSize: 16, fontWeight: 700, textTransform: 'none', bgcolor: '#2b6297', '&:hover': { bgcolor: '#1f4e79' } }}>
          Ingresar
        </Button>
        <Typography variant="body2" color="text.secondary">
          ¿Olvidaste la contraseña? Pedile una temporal al administrador. Tras 5 intentos fallidos seguidos, la cuenta se bloquea durante 15 minutos.
        </Typography>
      </Stack>
    </PantallaDeAcceso>
  );
}
