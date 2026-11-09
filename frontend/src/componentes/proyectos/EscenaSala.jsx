import { Box, Paper, CircularProgress } from '@mui/material';
import { Suspense, lazy, useMemo } from 'react';

const Sala3D = lazy(() => import('../escena/Sala3D'));

// La escena ubica cada equipo según el nombre de su categoría: se toma de la tecnología que trae cada ítem.
export default function EscenaSala({ ancho, largo, capacidad, items, alto = 430 }) {
  const tecnologias = useMemo(() => items.map((i) => ({ ...i.tecnologia, categoria: i.tecnologia.categoria.nombre })), [items]);
  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Suspense fallback={<Box sx={{ height: alto, display: 'grid', placeItems: 'center' }}><CircularProgress aria-label="Cargando la escena 3D" /></Box>}>
        <Sala3D sala={{ ancho, largo, capacidad }} items={items} tecnologias={tecnologias} alto={alto} />
      </Suspense>
    </Paper>
  );
}
