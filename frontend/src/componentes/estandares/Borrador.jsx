// Borrador de una nueva versión del estándar (HU-004). Parte de la vigente, sin las tecnologías inactivas.
import { useState } from 'react';
import {Alert, Button, Chip, IconButton, ListSubheader, MenuItem, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Typography} from '@mui/material';
import { api } from '../../api';

// "tecnologias" y "categorias" llegan de la API, a través de Estándares de sala. "numero" es el que va a tener la nueva versión.
export default function Borrador({ tipoSalaId, vigente, numero, tecnologias, categorias, alGuardar }) {
  const porId = new Map(tecnologias.map((t) => [t.id, t]));
  const tecnologia = (id) => porId.get(id);
  const base = vigente?.items ?? [];
  const activa = (i) => tecnologia(i.tecnologiaId)?.estado === 'Activa';
  const inicial = base.filter(activa).map(({ tecnologiaId, cantidadMaxima }) => ({ tecnologiaId, cantidadMaxima }));
  const excluidas = base.filter((i) => !activa(i)).map((i) => i.tecnologia);

  const [items, setItems] = useState(inicial);
  const [observaciones, setObservaciones] = useState('');
  const [elegida, setElegida] = useState('');
  const [error, setError] = useState('');
  const [enviando, setEnviando] = useState(false);

  const enVigente = new Set(base.map((i) => i.tecnologiaId));
  const ofrecidas = tecnologias.filter((t) => t.estado === 'Activa' && !items.some((i) => i.tecnologiaId === t.id));
  const sinGuardar = observaciones.trim() !== '' || JSON.stringify(items) !== JSON.stringify(inicial);

  // Suma la tecnología elegida con cantidad máxima 1
  function agregar() {
    setItems([...items, { tecnologiaId: elegida, cantidadMaxima: 1 }]);
    setElegida('');
  }

  // Cambia la cantidad máxima entre 1 y 99
  const cambiarCantidad = (id, delta) =>
    setItems(items.map((i) => (i.tecnologiaId === id ? { ...i, cantidadMaxima: Math.min(99, Math.max(1, i.cantidadMaxima + delta)) } : i)));

  // Descarta los cambios y vuelve a la versión vigente
  function cancelar() {
    setItems(inicial);
    setObservaciones('');
    setError('');
  }

  // Envía la propuesta: queda Pendiente hasta que el líder la apruebe o la rechace.
  async function guardar() {
    setEnviando(true);
    setError('');
    try {
      alGuardar(await api('/versiones', 'POST', { tipoSalaId, items, observaciones }));
    } catch (e) {
      const detalle = Object.values(e.errores ?? {});
      setError(detalle.length ? detalle.join(' ') : e.message);
      setEnviando(false);
    }
  }

  return (
    <Stack spacing={2}>
      <Stack direction="row" spacing={1} sx={{ alignItems: 'center' }}>
        <Typography variant="h6" component="h2">Nueva versión (borrador v{numero})</Typography>
        {sinGuardar && <Chip label="Sin guardar" size="small" />}
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      {excluidas.length > 0 && (
        <Alert severity="info">
          Se excluyeron del borrador tecnologías inactivas de la versión vigente: {excluidas.map((t) => `${t.marca} ${t.modelo}`).join(', ')}
        </Alert>
      )}

      <Stack direction="row" spacing={1}>
        <TextField select size="small" label="Agregar tecnología activa del catálogo" value={elegida}
          onChange={(e) => setElegida(e.target.value)} sx={{ flexGrow: 1 }}>
          {categorias.flatMap((c) => {
            const deCategoria = ofrecidas.filter((t) => t.categoriaId === c.id);
            return deCategoria.length
              ? [<ListSubheader key={c.id}>{c.nombre}</ListSubheader>, ...deCategoria.map((t) => <MenuItem key={t.id} value={t.id}>{t.marca} {t.modelo}</MenuItem>)]
              : [];
          })}
        </TextField>
        <Button variant="outlined" onClick={agregar} disabled={!elegida}>+ Agregar</Button>
      </Stack>

      {items.length ? (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#f4f6f9' } }}>
                <TableCell>Tecnología</TableCell>
                <TableCell>Categoría</TableCell>
                <TableCell align="center">Cantidad máxima</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((i) => {
                const t = tecnologia(i.tecnologiaId);
                const nombre = `${t.marca} ${t.modelo}`;
                return (
                  <TableRow key={t.id}>
                    <TableCell>
                      {nombre} {!enVigente.has(t.id) && <Chip label="Nueva" size="small" color="success" variant="outlined" />}
                    </TableCell>
                    <TableCell>{t.categoria.nombre}</TableCell>
                    <TableCell align="center">
                      <IconButton size="small" onClick={() => cambiarCantidad(t.id, -1)} disabled={i.cantidadMaxima <= 1} aria-label={`Restar cantidad máxima de ${nombre}`}>−</IconButton>
                      <Typography component="span" sx={{ mx: 1 }}>{i.cantidadMaxima}</Typography>
                      <IconButton size="small" onClick={() => cambiarCantidad(t.id, 1)} disabled={i.cantidadMaxima >= 99} aria-label={`Sumar cantidad máxima de ${nombre}`}>+</IconButton>
                    </TableCell>
                    <TableCell align="right">
                      <Button size="small" color="error" onClick={() => setItems(items.filter((x) => x.tecnologiaId !== t.id))}>Quitar</Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography color="text.secondary" sx={{ textAlign: 'center', py: 2 }}>
          El borrador no tiene tecnologías. Agregá al menos una para poder guardarlo
        </Typography>
      )}

      <TextField label="Observaciones de la versión" multiline minRows={3} value={observaciones}
        onChange={(e) => setObservaciones(e.target.value)} slotProps={{ htmlInput: { maxLength: 500 } }}
        placeholder="Qué cambia y por qué, por ejemplo la fecha de homologación en laboratorio" />

      <Alert severity="info">
        Al guardar, la versión {numero} queda pendiente de aprobación del líder de videoconferencias.
        {vigente && ` La versión ${vigente.numero} sigue vigente hasta que se apruebe.`} Los proyectos existentes
        conservan la versión con la que fueron creados
      </Alert>

      <Stack direction="row" spacing={1} sx={{ justifyContent: 'flex-end' }}>
        <Button variant="outlined" onClick={cancelar} disabled={!sinGuardar || enviando}>Cancelar</Button>
        <Button variant="contained" onClick={guardar} disabled={!items.length || enviando}>Guardar y enviar a aprobación</Button>
      </Stack>
    </Stack>
  );
}
