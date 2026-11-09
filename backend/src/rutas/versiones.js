import { Router } from 'express';
import { aprobar, listar, proponer, rechazar } from '../controladores/versiones.js';
import { permitir } from '../middlewares/sesion.js';

// Consulta: quien ve los estándares y el gestor (arma el proyecto con la versión vigente)
// Proponer: Colaborador operacional. Aprobar o rechazar: Líder de videoconferencias
const rutasVersiones = Router();
rutasVersiones.get('/', permitir('estandares.ver', 'proyectos.editar'), listar);
rutasVersiones.post('/', permitir('estandares.proponer'), proponer);
rutasVersiones.post('/:id/aprobar', permitir('estandares.aprobar'), aprobar);
rutasVersiones.post('/:id/rechazar', permitir('estandares.aprobar'), rechazar);

export default rutasVersiones;
