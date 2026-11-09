// Estándares de sala (Figura 8, HU-004): tipos de sala, versión en curso e historial de versiones. Todo sale de la API.
import { useEffect, useState } from 'react';
import { Accordion, AccordionDetails, AccordionSummary, Alert, Box, Chip, CircularProgress, List, ListItemButton, ListItemText, Paper, Stack, Typography } from '@mui/material';
import Borrador from './Borrador';
import TablaDeComparacion from './TablaDeComparacion';
import { ETIQUETA_ESTADO, autorDe, avisarCambioEstandares, etiquetaTipo, pendienteDe, versionesDe, vigenteDe } from './Versiones';
import { fechaYHora } from '../proyectos/Formato';
import { api } from '../../api';
import { useSesion } from '../../sesion';
import { puede } from '../../permisos';

const COLOR_ESTADO = { Vigente: 'success', Pendiente: 'warning', Rechazada: 'error', Historica: 'default' };
const metros = (n) => n.toLocaleString('es-AR');

// Tipos de sala, borrador o versión pendiente e historial
export default function Estandares() {
  const { usuario } = useSesion();
  const puedeProponer = puede(usuario, 'estandares.proponer'); // el líder lo ve en modo consulta
  const [tipos, setTipos] = useState([]);
  const [versiones, setVersiones] = useState([]);
  const [tecnologias, setTecnologias] = useState([]);
  const [categorias, setCategorias] = useState([]);
  const [tipoId, setTipoId] = useState('');
  const [cargando, setCargando] = useState(true);
  const [error, setError] = useState('');
  const [aviso, setAviso] = useState('');

  // Al abrir la página: tipos de sala, versiones y catálogo (para el borrador), en paralelo.
  useEffect(() => {
    Promise.all([api('/tipos-sala'), api('/versiones'), api('/tecnologias'), api('/categorias')])
      .then(([listaTipos, listaVersiones, listaTecnologias, listaCategorias]) => {
        setTipos(listaTipos);
        setVersiones(listaVersiones);
        setTecnologias(listaTecnologias);
        setCategorias(listaCategorias);
        setTipoId(listaTipos[0]?.id ?? '');
      })
      .catch((e) => setError(e.message))
      .finally(() => setCargando(false));
  }, []);

  // Propuesta guardada: se suma a la lista y el tipo de sala pasa a mostrar la versión pendiente.
  function guardada(version) {
    setVersiones((lista) => [version, ...lista]);
    setAviso(`Versión ${version.numero} enviada a aprobación del líder.`);
    avisarCambioEstandares();
  }

  // Al cambiar de tipo de sala se borra el aviso de la propuesta anterior.
  function elegirTipo(id) {
    setTipoId(id);
    setAviso('');
  }

  if (cargando) return <CircularProgress />;
  if (error) return <Alert severity="error">{error}</Alert>;

  const tipo = tipos.find((t) => t.id === tipoId);
  const deTipo = versionesDe(versiones, tipoId);
  const vigente = vigenteDe(versiones, tipoId);
  const pendiente = pendienteDe(versiones, tipoId);

  return (
    <Box>
      <Typography variant="h4" component="h1" sx={{ mb: 3 }}>Edición del estándar</Typography>
      {aviso && <Alert severity="success" onClose={() => setAviso('')} sx={{ mb: 2 }}>{aviso}</Alert>}

      <Box sx={{ display: 'grid', gap: 3, alignItems: 'start', gridTemplateColumns: { xs: '1fr', md: '240px 1fr', lg: '240px minmax(0, 1fr) 260px' } }}>
        <Paper variant="outlined">
          <Typography variant="h6" component="h2" sx={{ px: 2, pt: 2 }}>Tipos de sala</Typography>
          <List>
            {tipos.map((t) => {
              const v = vigenteDe(versiones, t.id);
              return (
                <ListItemButton key={t.id} selected={t.id === tipoId} onClick={() => elegirTipo(t.id)}>
                  <ListItemText primary={etiquetaTipo(t)} />
                  <Stack direction="row" spacing={0.5}>
                    {pendienteDe(versiones, t.id) && <Chip label="Pendiente" size="small" color="warning" />}
                    {v && <Chip label={`v${v.numero}`} size="small" color="success" variant="outlined" />}
                  </Stack>
                </ListItemButton>
              );
            })}
          </List>
        </Paper>

        <Paper variant="outlined" sx={{ p: 3 }}>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {etiquetaTipo(tipo)}: {metros(tipo.ancho)} × {metros(tipo.largo)} m y hasta {tipo.capacidad} personas
          </Typography>
          {pendiente ? (
            <Stack spacing={2}>
              <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
                <Typography variant="h6" component="h2">Versión {pendiente.numero}</Typography>
                <Chip label="Pendiente" size="small" color="warning" />
              </Stack>
              <Typography variant="body2" color="text.secondary">
                Propuesta por {autorDe(pendiente)} el {fechaYHora(pendiente.fechaCreacion)}.
                {vigente && ` La versión ${vigente.numero} sigue vigente hasta que el líder la apruebe.`}
              </Typography>
              <TablaDeComparacion vigente={vigente} propuesta={pendiente} />
            </Stack>
          ) : puedeProponer ? (
            // Al cambiar de tipo de sala, el borrador arranca de cero
            <Borrador key={tipoId} tipoSalaId={tipoId} vigente={vigente} numero={(deTipo[0]?.numero ?? 0) + 1}
              tecnologias={tecnologias} categorias={categorias} alGuardar={guardada} />
          ) : (
            // Modo consulta: la versión vigente, sin borrador
            <Stack spacing={1}>
              <Typography variant="h6" component="h2">{vigente ? `Versión ${vigente.numero} vigente` : 'Sin versión vigente'}</Typography>
              <Box component="ul" sx={{ m: 0, pl: 2.5, typography: 'body2' }}>
                {vigente?.items.map((i) => (
                  <li key={i.tecnologiaId}>{i.tecnologia.marca} {i.tecnologia.modelo}, máx. {i.cantidadMaxima}</li>
                ))}
              </Box>
              <Typography variant="body2" color="text.secondary">Las versiones nuevas las propone el colaborador operacional</Typography>
            </Stack>
          )}
        </Paper>

        <Paper variant="outlined" sx={{ p: 2, gridColumn: { md: '2', lg: 'auto' } }}>
          <Typography variant="h6" component="h2" sx={{ mb: 1 }}>Versiones</Typography>
          {!deTipo.length && (
            <Typography variant="body2" color="text.secondary">
              Todavía no hay versiones. Se crean al dar de alta tecnologías en el catálogo o al guardar el borrador.
            </Typography>
          )}
          {deTipo.map((v) => (
            <Accordion key={v.id} disableGutters elevation={0} sx={{ '&:before': { display: 'none' }, borderBottom: '1px solid #e0e6ed' }}>
              <AccordionSummary>
                <Stack spacing={0.5}>
                  <Chip label={`v${v.numero} - ${ETIQUETA_ESTADO[v.estado]}`} size="small" variant="outlined" color={COLOR_ESTADO[v.estado]} sx={{ alignSelf: 'flex-start' }} />
                  <Typography variant="caption" color="text.secondary">{fechaYHora(v.fechaCreacion)} - {autorDe(v)}</Typography>
                </Stack>
              </AccordionSummary>
              <AccordionDetails>
                <Box component="ul" sx={{ m: 0, pl: 2.5, typography: 'body2' }}>
                  {v.items.map((i) => (
                    <li key={i.tecnologiaId}>{i.tecnologia.marca} {i.tecnologia.modelo}, máx. {i.cantidadMaxima}</li>
                  ))}
                </Box>
                {v.observaciones && <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>{v.observaciones}</Typography>}
                {v.motivoRechazo && <Typography variant="body2" color="error" sx={{ mt: 1 }}>Motivo del rechazo: {v.motivoRechazo}</Typography>}
              </AccordionDetails>
            </Accordion>
          ))}
          <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 1 }}>
            Solo puede haber una versión vigente por tipo de sala
          </Typography>
        </Paper>
      </Box>
    </Box>
  );
}
