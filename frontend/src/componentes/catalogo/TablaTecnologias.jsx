// Tabla del catálogo: una fila por tecnología, con su categoría, precio, estado y el botón Editar.
import { Button, Chip, Paper, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from "@mui/material";
import { usd } from "../proyectos/Formato";

// Recibe la lista ya filtrada; "total" es el tamaño del catálogo completo. Sin "alEditar" (modo consulta) no hay botón Editar.
export default function TablaTecnologias({tecnologias, total, alEditar}){
 return(
    <Paper variant="outlined">
        <TableContainer>
            <Table size="small">
                <TableHead>
                    <TableRow sx={{'& th': {fontWeight: 700, bgcolor:'#f4f6f9'}}}>
                       <TableCell>Modelo</TableCell>
                       <TableCell>Marca</TableCell>
                       <TableCell>Categoría</TableCell>
                       <TableCell align="center">Precio (USD)</TableCell>
                       <TableCell>Estado</TableCell>
                       <TableCell />
                    </TableRow>
                </TableHead>
                <TableBody>
                    {tecnologias.map((t) => (
                        <TableRow key={t.id} hover sx={{opacity: t.estado === 'Inactiva' ? 0.55 : 1}}>
                            <TableCell>{t.modelo}</TableCell>
                            <TableCell>{t.marca}</TableCell>
                            <TableCell>{t.categoria.nombre}</TableCell>
                            <TableCell align="center">{usd(t.precioCentavos)}</TableCell>
                            <TableCell>
                                <Chip label={t.estado} size="small" variant="outlined" color={t.estado === 'Activa' ? 'success' : 'default'} />
                            </TableCell>
                            <TableCell>
                                {alEditar && (
                                    <Button size="small" onClick={() => alEditar(t)} aria-label={`Editar ${t.marca} ${t.modelo}`}>
                                        Editar
                                    </Button>
                                )}
                            </TableCell>
                        </TableRow>
                    ))}
                </TableBody>
            </Table>
        </TableContainer>

        {!tecnologias.length && (
                <Typography sx={{p:3, textAlign:'center'}} color="text.secondary">
                    {total ? 'Ninguna tecnología cumple con la búsqueda.' : 'Todavía no hay tecnologías. Cargá la primera con el formulario'}
                </Typography>
        )}

        <Typography variant="body2" color="text.secondary" sx={{p:2}}>
            {tecnologias.length} de {total} tecnologías
        </Typography>
    </Paper>
 )
}
