// Estructura de la app: ingreso, cambio de contraseña y las rutas (React Router) dentro del layout con la barra lateral.
import { useEffect, useState } from 'react';
import { Box, CircularProgress, Typography } from '@mui/material';
import { createBrowserRouter, Navigate, Outlet, RouterProvider } from 'react-router';
import BarraDeNavegacion from './componentes/BarraDeNavegacion';
import Proyectos from './componentes/proyectos/Proyectos';
import NuevoProyecto from './componentes/proyectos/NuevoProyecto';
import DetalleProyecto from './componentes/proyectos/DetalleProyecto';
import { EditarProyecto } from './componentes/proyectos/Configurador';
import Catalogo from './componentes/catalogo/Catalogo';
import Estandares from './componentes/estandares/Estandares';
import AprobacionDeEstandares from './componentes/estandares/AprobacionDeEstandares';
import Aprobaciones from "./componentes/aprobaciones/Aprobaciones";
import Administrador from "./componentes/administrador/Administrador";
import Ingresar from './componentes/sesion/Ingresar';
import CambiarClave from './componentes/sesion/CambiarClave';
import { SesionContext, useSesion } from './sesion';
import { INICIO_POR_ROL, puede } from './permisos';
import { api } from './api';

// Pagina no encontrada
const NoEncontrada = ({ titulo }) => <Typography variant="h4" component="h1">{titulo}</Typography>;

// Barra lateral a la izquierda y el apartado de la dirección actual a la derecha. Sin sesión, a ingresar;
// con contraseña temporal, a cambiarla
function Layout() {
  const { usuario } = useSesion();
  if (!usuario) return <Navigate to="/ingresar" replace />;
  if (usuario.claveTemporal) return <Navigate to="/cambiar-clave" replace />;
  return (
    <Box sx={{ display: 'flex', minHeight: '100vh' }}>
      <BarraDeNavegacion />
      <Box component="main" sx={{ flexGrow: 1, minWidth: 0, p: 4 }}>
        <Outlet />
      </Box>
    </Box>
  );
}

// Cada rol entra a su pantalla de inicio
function Inicio() {
  const { usuario } = useSesion();
  return <Navigate to={INICIO_POR_ROL[usuario.rolId] ?? '/cambiar-clave'} replace />;
}

// Apartado de otro rol: "Sin acceso". La API también rechaza el pedido
function ConPermiso({ permiso, children }) {
  const { usuario } = useSesion();
  return puede(usuario, permiso) ? children : <NoEncontrada titulo="Sin acceso a este apartado" />;
}
const protegida = (permiso, elemento) => <ConPermiso permiso={permiso}>{elemento}</ConPermiso>;

const router = createBrowserRouter([
  { path: '/ingresar', element: <Ingresar /> },
  { path: '/cambiar-clave', element: <CambiarClave /> },
  {
    path: '/',
    element: <Layout />,
    children: [
      { index: true, element: <Inicio /> },
      { path: 'proyectos', element: protegida('proyectos.ver', <Proyectos />) },
      { path: 'proyectos/nuevo', element: protegida('proyectos.editar', <NuevoProyecto />) },
      { path: 'proyectos/:id', element: protegida('proyectos.ver', <DetalleProyecto />) },
      { path: 'proyectos/:id/editar', element: protegida('proyectos.editar', <EditarProyecto />) },
      { path: 'catalogo', element: protegida('catalogo.ver', <Catalogo />) },
      { path: 'estandares', element: protegida('estandares.ver', <Estandares />) },
      { path: 'estandares/aprobacion', element: protegida('estandares.aprobar', <AprobacionDeEstandares />) },
      { path: 'administrador', element: protegida('cuentas.administrar', <Administrador />) },
      { path: 'aprobaciones', element: protegida('aprobaciones.resolver', <Aprobaciones />) },
      { path: 'aprobaciones/:id', element: protegida('aprobaciones.resolver', <DetalleProyecto revision />) },
      { path: '*', element: <NoEncontrada titulo="Página no encontrada" /> }
    ],
  },
]);

// Al abrir la página pregunta a la API quién ingresó. undefined: todavía no se sabe; null: sin sesión
export default function App() {
  const [usuario, setUsuario] = useState(undefined);
  useEffect(() => {
    api('/sesion').then((r) => setUsuario(r.usuario)).catch(() => setUsuario(null));
  }, []);

  if (usuario === undefined) return <CircularProgress sx={{ m: 4 }} />;
  return (
    <SesionContext.Provider value={{ usuario, setUsuario }}>
      <RouterProvider router={router} />
    </SesionContext.Provider>
  );
}
