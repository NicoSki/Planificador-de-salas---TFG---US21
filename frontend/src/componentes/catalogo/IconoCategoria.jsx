// Ícono y color de cada categoría
import { Box, SvgIcon } from '@mui/material';

export const CATEGORIA_VISUAL = {
  'Sistema de sala': { grupo: 'Sistemas de sala', color: '#1f4e79', trazo: 'M5 5h14a3 3 0 0 1 0 6H5a3 3 0 0 1 0-6zM10.6 8a1.4 1.4 0 1 0 2.8 0a1.4 1.4 0 1 0-2.8 0M8 20l1.5-5h5l1.5 5z' },
  Cámara: { grupo: 'Cámaras', color: '#9d174d', trazo: 'M4 7h9a2 2 0 0 1 2 2v6a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V9a2 2 0 0 1 2-2zM15 10.5l6-3.5v10l-6-3.5' },
  Pantalla: { grupo: 'Pantallas', color: '#0f766e', trazo: 'M3 4h18a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM12 16v4M8 20h8' },
  Micrófono: { grupo: 'Micrófonos', color: '#854d0e', trazo: 'M12 3a3 3 0 0 1 3 3v5a3 3 0 0 1-6 0V6a3 3 0 0 1 3-3zM5 11a7 7 0 0 0 14 0M12 18v3' },
  Parlante: { grupo: 'Parlantes', color: '#b91c1c', trazo: 'M3 9h4l5-4v14l-5-4H3zM16 9a4 4 0 0 1 0 6M18.5 6a8 8 0 0 1 0 12' },
  Pizarra: { grupo: 'Pizarras', color: '#5b21b6', trazo: 'M3 3h18v12H3zM8 21l1.5-6M16 21l-1.5-6M7 11l3-3 2 2 4-4' },
  'Panel de reserva': { grupo: 'Paneles de reserva', color: '#166534', trazo: 'M5 5h14a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1zM4 10h16M8 3v4M16 3v4M9 15l2 2 4-4' },
  'Inyector de energía': { grupo: 'Inyectores de energía', color: '#3f6212', trazo: 'M13 2L4 14h7l-1 8 9-12h-7z' },
  Soporte: { grupo: 'Soportes', color: '#475569', trazo: 'M7 3h10v6H7zM12 9v9M5 18h14M6 21a1 1 0 1 0 2 0a1 1 0 1 0-2 0M16 21a1 1 0 1 0 2 0a1 1 0 1 0-2 0' },
  'Pizarra Inteligente': { grupo: 'Pizarras inteligentes', color: '#4338ca', trazo: 'M4 4h16a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1zM12 16v5M9 21h6M7 12c1.5-3 3-3 4.5 0s3 3 4.5 0' },
  'Todo en uno': { grupo: 'Equipos todo en uno', color: '#0e7490', trazo: 'M2 9h20a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1H2a1 1 0 0 1-1-1v-4a1 1 0 0 1 1-1zM10 12a2 2 0 1 0 4 0a2 2 0 1 0-4 0M4 11v2M6 11v2M18 11v2M20 11v2' }
};

// Cuadrado con el icono de la categoría sobre su color suave
export default function IconoCategoria({ categoria }) {
  const { color, trazo } = CATEGORIA_VISUAL[categoria];
  return (
    <Box aria-hidden="true" sx={{ width: 36, height: 36, flexShrink: 0, borderRadius: 1, display: 'grid', placeItems: 'center', color, bgcolor: `${color}1a` }}>
      <SvgIcon fontSize="small">
        <path d={trazo} fill="none" stroke="currentColor" strokeWidth={1.8} strokeLinecap="round" strokeLinejoin="round" />
      </SvgIcon>
    </Box>
  );
}
