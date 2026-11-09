import { useEffect, useState } from "react";
import { Alert, Box, Button, CircularProgress, MenuItem, Stack, TextField, Typography } from '@mui/material';
import TablaTecnologias from "./TablaTecnologias";
import FormularioTecnologias from "./FormularioTecnologias";
import { api } from "../../api";
import { avisarCambioEstandares, etiquetaTipo } from "../estandares/Versiones";
import { useSesion } from "../../sesion";
import { puede } from "../../permisos";


const FILTRO_SELECCIONADO = {inputLabel: {shrink: true}, select: {displayEmpty: true}};

export default function Catalogo(){
    const { usuario } = useSesion();
    const editable = puede(usuario, 'catalogo.editar'); // el líder lo ve en modo consulta
    const [tecnologias, setTecnologias] = useState([]);
    const [categorias, setCategorias] = useState([]);
    const [tiposSala, setTiposSala] = useState([]);
    const [vigentes, setVigentes] = useState([]); 
    const [cargando, setCargando] = useState(true);
    const [error, setError] = useState('');
    const [aviso, setAviso] = useState('');
    const [filtro, setFiltro] = useState({texto: '', categoriaId: '', estado: ''});
    const [seleccionado, setSeleccionado] = useState(null);
    const [reinicio, setReinicio] = useState(0);
    const [enfocar, setEnfocar] = useState(false);

    useEffect(() => {
            Promise.all([api('/tecnologias'), api('/categorias'), api('/tipos-sala'), api('/versiones?estado=Vigente')])
            .then(([listaTecnologias, listaCategorias, listaTiposSala, listaVigentes]) => {
                setTecnologias(listaTecnologias);
                setCategorias(listaCategorias);
                setTiposSala(listaTiposSala);
                setVigentes(listaVigentes);
            })
            .catch((e) => setError(e.message))
            .finally(() => setCargando(false));
    }, []);

    function reiniciarFormulario(enfocarPrimero = false) {
        setSeleccionado(null);
        setEnfocar(enfocarPrimero);
        setReinicio((n) => n + 1);
    }

    // Alta, edición o cambio de estado ya guardados: actualiza la fila (o la agrega) y vacía el formulario
    function guardada(t, mensaje) {
        setTecnologias((lista) => (lista.some((x) => x.id === t.id) ? lista.map((x) => (x.id === t.id ? t : x)) : [...lista, t]));
        reiniciarFormulario();
        const pendiente = t.versionPendiente ? ` Quedó en la versión ${t.versionPendiente} del estándar, pendiente de aprobación del líder` : '';
        setAviso(`${t.marca} ${t.modelo}: ${mensaje}${pendiente}`);
        if (t.versionPendiente) avisarCambioEstandares();

    }

    const texto = filtro.texto.trim().toLowerCase();
    const lista = tecnologias.filter(
        (t) => (!texto || `${t.modelo} ${t.marca}`.toLowerCase().includes(texto))
            && (!filtro.categoriaId || t.categoriaId === filtro.categoriaId)
            && (!filtro.estado || t.estado === filtro.estado)
    );
    const cambiar = (campo) => (e) => setFiltro({...filtro, [campo]: e.target.value});
    const estandaresDe = (t) => (t ? vigentes.filter((v) => v.items.some((i) => i.tecnologiaId === t.id)).map((v) => etiquetaTipo(v.tipoSala)) : []);

    return (
      <Box>
        <Typography variant="h4" component="h1" sx={{mb:3}}>
          Catálogo de tecnologías
        </Typography>
        {!editable && <Typography color="text.secondary" sx={{mt: -2, mb: 3}}>Modo consulta: el alta y la edición las hace el colaborador operacional</Typography>}

        {error && <Alert severity="error" sx={{mb: 2}}>{error}</Alert>}
        {aviso && <Alert severity="success" onClose={() => setAviso('')} sx={{mb: 2}}>{aviso}</Alert>}

        <Box sx={{display: 'grid', gap:3, gridTemplateColumns: {xs:'1fr',lg: editable ? '1fr 360px' : '1fr'}, alignItems: 'start'}}>
          <Stack spacing={2}>
              <Stack direction={{xs: 'column', md:'row'}} spacing={1.5} role="search">
                  <TextField size="small" type="search" label="Buscar por modelo o marca" value={filtro.texto} onChange={cambiar('texto')} sx={{flexGrow:1, bgcolor:'#fff'}} />
                  <TextField size="small" select label="Categoría" value={filtro.categoriaId} onChange={cambiar('categoriaId')} slotProps={FILTRO_SELECCIONADO} sx={{minWidth: 180, bgcolor:'#fff'}}>
                      <MenuItem value="">Todas</MenuItem>
                      {categorias.map((c) => <MenuItem key={c.id} value={c.id}>{c.nombre}</MenuItem>)}
                  </TextField>
                  <TextField size="small" select label="Estado" value={filtro.estado} onChange={cambiar('estado')} slotProps={FILTRO_SELECCIONADO} sx={{minWidth: 140, bgcolor:'#fff'}}>
                      <MenuItem value="">Todos</MenuItem>
                      <MenuItem value="Activa">Activa</MenuItem>
                      <MenuItem value="Inactiva">Inactiva</MenuItem>
                  </TextField>
              </Stack>
              {editable && (
                  <Stack>
                      <Button variant="contained" onClick={() => reiniciarFormulario(true)} sx={{whiteSpace: 'nowrap'}}>
                          + Nueva tecnología
                      </Button>
                  </Stack>
              )}

              {cargando ? (
                  <CircularProgress sx={{alignSelf: 'center'}} />
              ) : (
                  <TablaTecnologias tecnologias={lista} total={tecnologias.length} alEditar={editable ? (t) => { setSeleccionado(t); setAviso(''); } : undefined} />
              )}
          </Stack>

          {editable && <FormularioTecnologias key={`${seleccionado?.id ?? 'nueva'}-${reinicio}`} tecnologia={seleccionado} categorias={categorias} tiposSala={tiposSala} estandares={estandaresDe(seleccionado)} enfocar={enfocar} alCancelar={() => reiniciarFormulario()} alGuardar={guardada} />}
        </Box>
      </Box>
    );
}
