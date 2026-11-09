import { Router } from 'express';
import { aprobar, crear, denegar, documento, editar, listar, obtener } from '../controladores/proyectos.js';
import { permitir } from '../middlewares/sesion.js';

// Crear, editar y descargar el documento PDF: Gestor de proyectos. Aprobar o denegar: Analista o Jefe de control de gestión
// El rango de monto de cada uno (20.000 USD) lo controla el controlador, porque depende del total del proyecto
const rutasProyectos = Router();
rutasProyectos.get('/', permitir('proyectos.ver'), listar);
rutasProyectos.post('/', permitir('proyectos.editar'), crear);
rutasProyectos.get('/:id', permitir('proyectos.ver'), obtener);
rutasProyectos.put('/:id', permitir('proyectos.editar'), editar);
rutasProyectos.get('/:id/documento', permitir('proyectos.editar'), documento);
rutasProyectos.post('/:id/aprobar', permitir('aprobaciones.resolver'), aprobar);
rutasProyectos.post('/:id/denegar', permitir('aprobaciones.resolver'), denegar);

export default rutasProyectos;
