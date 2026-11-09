import {Box, Button, Chip, Drawer, List, ListItemButton, ListItemText, ListSubheader, Stack, Typography} from '@mui/material';
import { useEffect, useState } from 'react';
import { api } from '../api';
import { Link, useLocation } from 'react-router';
import { salir, useSesion } from '../sesion';
import { puede, puedeResolver } from '../permisos';


const ANCHO = 260;
const FONDO = '#1f4e79';
const ACTIVO = '#2b6297';
const CONTADOR = '#f2a93b'; 

//Secciones de la barra de navegacion. Cada enlace se muestra solo si el rol tiene su permiso
export const secciones = [
    {
        titulo: 'Planificación', 
        enlaces: [
            {a: '/proyectos', texto: 'Historial de proyectos', permiso: 'proyectos.ver'},
            {a: '/proyectos/nuevo', texto: 'Nuevo Proyecto', permiso: 'proyectos.editar'}
        ]
    }, 
    {
        titulo: 'Control de gestión',
        enlaces: [{a: '/aprobaciones', texto: 'Aprobación presupuestaria', permiso: 'aprobaciones.resolver'}]
    }, 
    {
        titulo: 'Homologación',
        enlaces: [
            {a: '/catalogo', texto: 'Catálogo de tecnologías', permiso: 'catalogo.ver'},
            {a: '/estandares', texto: 'Estándares de sala', permiso: 'estandares.ver'},
            {a: '/estandares/aprobacion', texto: 'Aprobación de estándares', permiso: 'estandares.aprobar'}
        ]
    },
    {
        titulo: 'Administración', 
        enlaces: [{a: '/administrador', texto: 'Administrador', permiso: 'cuentas.administrar'}]
    }
];

// Apartado activo
const activoEn = (pathname) => secciones.flatMap((s) => s.enlaces).filter((e) => pathname === e.a || pathname.startsWith(`${e.a}/`)).reduce((mejor, e) => (e.a.length > (mejor?.length ?? 0) ? e.a : mejor), null);


export default function BarraDeNavegacion (){

    const activo = activoEn(useLocation().pathname);
    const { usuario, setUsuario } = useSesion();

    const [pendientes, setPendientes] = useState({});

    // Pendientes de aprobación (versiones del estándar y proyectos del rango de monto del rol): al abrir la app y cada vez que una pantalla avisa que cambiaron.
    useEffect(() => {
        const contar = () => Promise.all([
                puede(usuario, 'estandares.aprobar') ? api('/versiones?estado=Pendiente') : [],
                puede(usuario, 'aprobaciones.resolver') ? api('/proyectos?estado=Pendiente') : [],
            ])
            .then(([versiones, proyectos]) => setPendientes({
                '/estandares/aprobacion': versiones.length,
                '/aprobaciones': proyectos.filter((p) => puedeResolver(usuario, p.total)).length,
            }))
            .catch(() => {});
        contar();
        window.addEventListener('estandares-cambiaron', contar);
        window.addEventListener('proyectos-cambiaron', contar);
        return () => {
            window.removeEventListener('estandares-cambiaron', contar);
            window.removeEventListener('proyectos-cambiaron', contar);
        };
    }, [usuario]);

    // Secciones del rol, con los contadores leídos de la base.
    const conContadores = secciones
        .map((s) => ({
            ...s,
            enlaces: s.enlaces.filter((e) => puede(usuario, e.permiso)).map((e) => (e.a in pendientes ? { ...e, pendientes: pendientes[e.a] } : e)),
        }))
        .filter((s) => s.enlaces.length);


    return (
        <Drawer
        variant='permanent'
        sx={{
            width: ANCHO,
            flexShrink: 0,
            '& .MuiDrawer-paper': {
                width: ANCHO, bgcolor: FONDO, color: '#fff', border:0
            }
        }}>
            {/* Titulo principal  */}
            <Box sx={{px: 2.5, py:3, borderBottom: '1px solid rgba(255,255,255,.14)'}}>
                <Typography variant="h6" fontWeight={700} lineHeight={1.2}>
                    Planificador de Salas
                </Typography>
                 <Typography variant="body2" sx={{color: '#c6d6e6', mt:1}}>
                    Videoconferencia | Colaboración | BYOM
                </Typography>
            </Box>

            {/* Grupo y secciones */}
            <Box component="nav" aria-label="Apartados">
                {conContadores.map((seccion) => (
                    <List
                    key={seccion.titulo}
                    dense
                    subheader={
                        <ListSubheader disableSticky sx={{bgcolor: 'transparent', color:'#c6d6e6', fontWeight:600, fontSize:12, px:2.5}}>
                            {seccion.titulo}
                        </ListSubheader>
                    }>
                    {seccion.enlaces.map((enlace) => (
                        <ListItemButton key={enlace.a} component={Link} to={enlace.a} selected={activo === enlace.a ? 'page' : undefined}
                        sx={{
                            px:2.5,
                            py: 1.2,
                            borderLeft: '4px solid transparent',
                            '&:hover': {bgcolor: 'rgba(255,255,255,.08)'}, 
                            '&.Mui-selected, &.Mui-selected:hover': {bgcolor: ACTIVO, borderLeftColor: CONTADOR} 
                        }}>
                    <ListItemText primary={enlace.texto} primaryTypographyProps={{fontSize: 16}}/>
                    {
                        enlace.pendientes > 0 && (
                            <Chip
                             label={enlace.pendientes}
                             size="small"
                             aria-label={`${enlace.pendientes} pendientes`}
                             sx={{bgcolor: CONTADOR, color:'#1d2733', fontWeight: 700}} 
                            />
                        )}
                        </ListItemButton>
                    ))}
                    </List>
                ))}
            </Box>

            {/* Quién ingresó, al pie de la barra */}
            <Box sx={{mt: 'auto', px: 2.5, py: 2, borderTop: '1px solid rgba(255,255,255,.14)'}}>
                <Typography variant="body2" fontWeight={600}>{usuario.nombre} {usuario.apellido}</Typography>
                <Typography variant="caption" sx={{color: '#c6d6e6', display: 'block'}}>{usuario.rol}</Typography>
                <Stack spacing={1} sx={{mt: 1}}>
                    <Button size="small" component={Link} to="/cambiar-clave" sx={{color: '#fff', justifyContent: 'flex-center', px: 0}}>Cambiar contraseña</Button>
                    <Button variant="contained" color="error" fullWidth disableElevation onClick={() => salir(setUsuario)} sx={{color: '#fff', fontWeight: 700}}>
                        Cerrar sesión
                    </Button>
                </Stack>
            </Box>
        </Drawer>
    );
}
