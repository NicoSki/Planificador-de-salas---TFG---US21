// Tabla que compara la versión vigente con una propuesta.
import { Chip, Table, TableBody, TableCell, TableContainer, TableHead, TableRow } from '@mui/material';
import { compararVersiones } from './Versiones';

const COLOR_CAMBIO = { Nueva: 'success', Quitada: 'error', 'Cantidad modificada': 'warning', 'Sin cambios': 'default' };

// "vigente" puede faltar si el tipo de sala todavía no tiene una versión aprobada.
export default function TablaComparacion({ vigente, propuesta }) {
  // Cada ítem de la API trae su tecnología (con categoría): se toman de las dos versiones.
  const datos = new Map([...(vigente?.items ?? []), ...propuesta.items].map((i) => [i.tecnologiaId, i.tecnologia]));

  return (
    <TableContainer>
      <Table size="small">
        <TableHead>
          <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#f4f6f9' } }}>
            <TableCell>Tecnología</TableCell>
            <TableCell>Categoría</TableCell>
            <TableCell align="center">Cantidad máxima</TableCell>
            <TableCell>Cambio</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {compararVersiones(vigente, propuesta).map((c) => {
            const t = datos.get(c.tecnologiaId);
            return (
              <TableRow key={c.tecnologiaId}>
                <TableCell>{t.marca} {t.modelo}</TableCell>
                <TableCell>{t.categoria.nombre}</TableCell>
                <TableCell align="center">{c.antes ?? '—'} → {c.despues ?? '—'}</TableCell>
                <TableCell>
                  <Chip label={c.cambio} size="small" variant="outlined" color={COLOR_CAMBIO[c.cambio]} />
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
