import { Router } from 'express';
import { asignarClaveTemporal, crear, desbloquear, editar, listar } from '../controladores/usuarios.js';
import { permitir } from '../middlewares/sesion.js';

// Solo el Administrador gestiona cuentas (y el Desarrollador, que tiene acceso a toda la aplicación)
const rutasUsuarios = Router();
rutasUsuarios.use(permitir('cuentas.administrar'));
rutasUsuarios.get('/', listar);
rutasUsuarios.post('/', crear);
rutasUsuarios.put('/:id', editar);
rutasUsuarios.post('/:id/clave-temporal', asignarClaveTemporal);
rutasUsuarios.post('/:id/desbloquear', desbloquear);

export default rutasUsuarios;
