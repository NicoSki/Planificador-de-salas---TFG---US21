// Nuevo proyecto, paso 1 (HU-005): datos de la sala. Sitios, tipos de sala y versiones vigentes salen de la API.
import { useEffect, useState } from 'react';
import { Alert, Box, Button, MenuItem, Paper, Stack, TextField, Typography } from '@mui/material';
import { Link as RouterLink, useNavigate } from 'react-router';
import { metros } from './Formato';
import { etiquetaTipo, vigenteDe } from '../estandares/Versiones';
import { medidasMinimas } from '../escena/Ubicacion';
import Configurador from './Configurador';
import { api } from '../../api';

const DIMENSION = { min: 2, max: 30 }; // metros, igual que la API
const enRango = (texto, min) => parseFloat(texto) >= min && parseFloat(texto) <= DIMENSION.max;

export default function NuevoProyecto() {
  const [datos, setDatos] = useState({ nombre: '', sitioId: '', tipoSalaId: '', ancho: '', largo: '' });
  const [sitios, setSitios] = useState([]);
  const [tipos, setTipos] = useState([]);
  const [vigentes, setVigentes] = useState([]);
  const [error, setError] = useState('');
  const [borrador, setBorrador] = useState(null);
  const cambiar = (campo) => (e) => setDatos({ ...datos, [campo]: e.target.value });
  const navegar = useNavigate();

  // Al abrir la página: sitios, tipos de sala y versiones vigentes (un tipo sin vigente no admite proyectos).
  useEffect(() => {
    Promise.all([api('/sitios'), api('/tipos-sala'), api('/versiones?estado=Vigente')])
      .then(([listaSitios, listaTipos, listaVigentes]) => {
        setSitios(listaSitios);
        setTipos(listaTipos);
        setVigentes(listaVigentes);
      })
      .catch((e) => setError(e.message));
  }, []);

  const tipo = tipos.find((t) => t.id === datos.tipoSalaId);
  const vigente = tipo && vigenteDe(vigentes, tipo.id);
  // Mínimos según las sillas del tipo de sala (4, 8 o 16); sin tipo elegido, los generales.
  const minimas = tipo ? medidasMinimas(tipo.capacidad) : { ancho: DIMENSION.min, largo: DIMENSION.min };
  const errorMedida = (campo) => datos[campo] !== '' && !enRango(datos[campo], minimas[campo]);
  const completo = datos.nombre.trim() && datos.sitioId && vigente && enRango(datos.ancho, minimas.ancho) && enRango(datos.largo, minimas.largo);

  // Al elegir el tipo de sala, ancho y largo toman sus medidas de referencia; el usuario las puede cambiar.
  function elegirTipo(e) {
    const elegido = tipos.find((t) => t.id === e.target.value);
    setDatos({ ...datos, tipoSalaId: elegido.id, ancho: String(elegido.ancho), largo: String(elegido.largo) });
  }

  // Paso 2: el configurador recibe el proyecto todavía sin guardar, sin tecnologías.
  function continuar(e) {
    e.preventDefault();
    setBorrador({
      nombre: datos.nombre.trim(),
      sitioId: datos.sitioId,
      sitio: sitios.find((s) => s.id === datos.sitioId).nombre,
      tipoSalaId: tipo.id,
      tipoSala: tipo,
      ancho: parseFloat(datos.ancho),
      largo: parseFloat(datos.largo),
      items: [],
    });
  }

  if (borrador) return <Configurador proyecto={borrador} alVolver={() => setBorrador(null)} alCancelar={() => navegar('/proyectos')} />;

  return (
    <Box>
      <Typography variant="h4" component="h1">Nuevo proyecto</Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Datos de la sala. En el siguiente paso se eligen las tecnologías
      </Typography>
      {error && <Alert severity="error" sx={{ mb: 2, maxWidth: 560 }}>{error}</Alert>}

      <Paper component="form" variant="outlined" onSubmit={continuar} noValidate sx={{ p: 3, maxWidth: 560 }}>
        <Stack spacing={2}>
          <TextField label="Nombre del proyecto" required autoFocus value={datos.nombre} onChange={cambiar('nombre')}
            placeholder="Por ejemplo: Sala 5D Directorio" slotProps={{ htmlInput: { maxLength: 80 } }} />
          <TextField select label="Sitio" required value={datos.sitioId} onChange={cambiar('sitioId')}>
            {sitios.map((s) => <MenuItem key={s.id} value={s.id}>{s.nombre}</MenuItem>)}
          </TextField>
          <TextField select label="Tipo de sala" required value={datos.tipoSalaId} onChange={elegirTipo}
            error={Boolean(tipo && !vigente)}
            helperText={tipo && (vigente
              ? `Referencia: ${metros(tipo.ancho)} × ${metros(tipo.largo)} m, hasta ${tipo.capacidad} personas. Se asocia a la versión vigente v${vigente.numero} del estándar`
              : 'Este tipo de sala todavía no tiene una versión vigente del estándar: el líder tiene que aprobar una en Aprobación de estándares')}>
            {tipos.map((t) => <MenuItem key={t.id} value={t.id}>{etiquetaTipo(t)}</MenuItem>)}
          </TextField>
          <Stack direction="row" spacing={2}>
            {['ancho', 'largo'].map((campo) => (
              <TextField key={campo} label={campo === 'ancho' ? 'Ancho (m)' : 'Largo (m)'} required type="number" fullWidth value={datos[campo]} onChange={cambiar(campo)}
                error={errorMedida(campo)}
                helperText={errorMedida(campo) && `Entre ${metros(minimas[campo])} y ${DIMENSION.max} m${tipo ? ` para ${tipo.capacidad} personas` : ''}.`}
                slotProps={{ htmlInput: { min: minimas[campo], max: DIMENSION.max, step: 0.01, inputMode: 'decimal' } }} />
            ))}
          </Stack>
        </Stack>

        <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end', mt: 3 }}>
          <Button variant="outlined" component={RouterLink} to="/proyectos">Cancelar</Button>
          <Button variant="contained" type="submit" disabled={!completo}>Continuar</Button>
        </Stack>
      </Paper>
    </Box>
  );
}
