// Formulario de alta y edición de una tecnología. Guarda en la API y muestra sus errores en cada campo.
import { useState } from "react";
import {Alert, Button, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, MenuItem, Paper, Stack, TextField, Typography} from '@mui/material';
import { api } from "../../api";

const VACIO = {modelo: '', marca: '', categoriaId: '', precio: '', tipoSalaId: ''};

// Categorías y tipos de sala llegan del catálogo, que los pidió a la API.
// "estandares": tipos de sala cuya versión vigente incluye esta tecnología (HU-003: piden confirmación antes de desactivarla).
export default function FormularioTecnologias({tecnologia, categorias, tiposSala, estandares = [], enforcar, alCancelar, alGuardar}){
    const [form, setForm] = useState(tecnologia
        ? {...VACIO, modelo: tecnologia.modelo, marca: tecnologia.marca, categoriaId: tecnologia.categoriaId, precio: String(tecnologia.precioCentavos / 100)}
        : VACIO);
    const [errores, setErrores] = useState({});
    const [enviando, setEnviando] = useState(false);
    const [confirmar, setConfirmar] = useState(false); // diálogo de desactivación de una tecnología de un estándar vigente
    const editar = (campo) => (e) => {
        setForm({...form, [campo]: e.target.value});
        setErrores({...errores, [campo]: undefined, general: undefined});
    };

    // Espera la respuesta de la API. Si vuelve con errores, los muestra arriba y en cada campo.
    async function enviar(pedido, mensaje){
        setEnviando(true);
        try {
            alGuardar(await pedido, mensaje);
        } catch (e) {
            setErrores({general: e.message, ...e.errores});
        } finally {
            setEnviando(false);
        }
    }

    function guardar(e){
        e.preventDefault();
        const datos = {modelo: form.modelo, marca: form.marca, categoriaId: form.categoriaId, precio: form.precio};
        enviar(
            tecnologia
                ? api(`/tecnologias/${tecnologia.id}`, 'PUT', datos)
                : api('/tecnologias', 'POST', {...datos, tipoSalaId: form.tipoSalaId}),
            tecnologia ? 'cambios guardados.' : 'agregada al catálogo.',
        );
    }

    // No se borra: queda inactiva y conserva su historial en estándares y proyectos.
    function ejecutarCambioEstado(){
        setConfirmar(false);
        const estado = tecnologia.estado === 'Activa' ? 'Inactiva' : 'Activa';
        enviar(api(`/tecnologias/${tecnologia.id}/estado`, 'PATCH', {estado}), estado === 'Activa' ? 'Activada' : 'Desactivada');
    }

    // HU-003: si está en un estándar vigente, primero pide confirmación. Activar no la necesita.
    function cambiarEstado(){
        if (tecnologia.estado === 'Activa' && estandares.length) setConfirmar(true);
        else ejecutarCambioEstado();
    }

    return(
        <Paper component="form" variant="outlined" onSubmit={guardar} noValidate sx={{p:3}}>
            <Typography variant="h6" component="h2" sx={{mb:2}}>
                {tecnologia ? 'Editar tecnología' : 'Nueva tecnología'}
            </Typography>

            {errores.general && <Alert severity="error" sx={{mb: 2}}>{errores.general}</Alert>}

            <Stack spacing={2}>
                {!tecnologia && (
                    <TextField select label="Tipo de sala" required value={form.tipoSalaId} onChange={editar('tipoSalaId')}
                        error={Boolean(errores.tipoSalaId)} helperText={errores.tipoSalaId ?? 'Se suma a ese estándar en una versión que aprueba el líder'}>
                        {tiposSala.map((s) => <MenuItem key={s.id} value={s.id}>{s.estandar} - {s.tamano}</MenuItem>)}
                    </TextField>
                )}
                <TextField select label="Categoría" required value={form.categoriaId} onChange={editar('categoriaId')}
                    error={Boolean(errores.categoriaId)} helperText={errores.categoriaId}>
                    {categorias.map((c) => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}
                </TextField>
                <TextField label="Modelo" required value={form.modelo} onChange={editar('modelo')} slotProps={{htmlInput: {maxLength:60}}} />
                <TextField label="Marca" required value={form.marca} onChange={editar('marca')} error={Boolean(errores.marca)} helperText={errores.marca} slotProps={{htmlInput: {maxLength:40}}} />
                <TextField label="Precio (USD)" required type="number" value={form.precio} onChange={editar('precio')} error={Boolean(errores.precio)} helperText={errores.precio} slotProps={{htmlInput: {min:0.01, step: 0.01}}} />
            </Stack>

            <Stack direction="row" spacing={1} sx={{mt: 3}}>
                {tecnologia && (
                    <Button color={tecnologia.estado === 'Activa' ? 'error' : 'primary'} onClick={cambiarEstado} disabled={enviando}>
                        {tecnologia.estado === 'Activa' ? 'Desactivar' : 'Activar'}
                    </Button>
                )}
                <Button variant="outlined" onClick={alCancelar} sx={{ml: 'auto !important'}}>Cancelar</Button>
                <Button variant="contained" type="submit" disabled={enviando}>Guardar</Button>
            </Stack>

            <Dialog open={confirmar} onClose={() => setConfirmar(false)}>
                <DialogTitle>¿Desactivar la tecnología?</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        {tecnologia?.marca} {tecnologia?.modelo} forma parte del estándar vigente de {estandares.join(', ')}.
                        Si la desactivás, no se va a poder elegir en proyectos nuevos. Los proyectos que ya la tienen la conservan con su precio cotizado
                    </DialogContentText>
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setConfirmar(false)}>Cancelar</Button>
                    <Button variant="contained" color="error" onClick={ejecutarCambioEstado}>Desactivar</Button>
                </DialogActions>
            </Dialog>
        </Paper>
    )
}
