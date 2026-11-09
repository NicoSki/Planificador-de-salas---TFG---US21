// Sesión en la interfaz: quién ingresó. Lo informa la API (GET /api/sesion), porque la cookie no se puede leer desde JavaScript
import { createContext, useContext } from 'react';
import { api } from './api';

export const SesionContext = createContext(null);

// { usuario, setUsuario }. usuario: null sin sesión; si no, { id, nombre, apellido, email, rolId, rol, claveTemporal }
export const useSesion = () => useContext(SesionContext);

// Borra la cookie en la API y vuelve a la pantalla de ingreso
export async function salir(setUsuario) {
  await api('/sesion', 'DELETE').catch(() => {});
  setUsuario(null);
}
