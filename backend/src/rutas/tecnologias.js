import { Router } from 'express';
import { cambiarEstado, crear, editar, listar } from '../controladores/tecnologias.js';
import { permitir } from '../middlewares/sesion.js';

// Consulta: quien ve el catálogo o los estándares (el borrador usa el catálogo). Alta, edición y estado: Colaborador operacional
const rutasTecnologias = Router();
rutasTecnologias.get('/', permitir('catalogo.ver', 'estandares.ver'), listar);
rutasTecnologias.post('/', permitir('catalogo.editar'), crear);
rutasTecnologias.put('/:id', permitir('catalogo.editar'), editar);
rutasTecnologias.patch('/:id/estado', permitir('catalogo.editar'), cambiarEstado);

export default rutasTecnologias;
