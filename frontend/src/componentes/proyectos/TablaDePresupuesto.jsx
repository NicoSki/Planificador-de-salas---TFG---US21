// Tecnologías del proyecto con el precio cotizado y los totales 
import { Box, Button, IconButton, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography } from '@mui/material';
import { PORCENTAJE_MANO_OBRA, calcularPresupuesto } from './Presupuesto';
import { usd } from './Formato';


export default function TablaPresupuesto({ items, alSumar, alRestar, alQuitar, puedeSumar }) {
  const editable = Boolean(alSumar);
  const { subtotal, manoObra, total } = calcularPresupuesto(items);

  return (
    <>
      {items.length ? (
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow sx={{ '& th': { fontWeight: 700, bgcolor: '#f4f6f9' } }}>
                <TableCell>Tecnología</TableCell>
                <TableCell>Cantidad</TableCell>
                <TableCell>Precio (USD)</TableCell>
                <TableCell>Subtotal (USD)</TableCell>
                {editable && <TableCell />}
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((i) => {
                const t = i.tecnologia;
                const nombre = `${t.marca} ${t.modelo}`;

                return (
                  <TableRow key={t.id}>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 600 }}>{t.modelo}</Typography>
                      <Typography variant="caption" color="text.secondary">{t.marca} - {t.categoria.nombre}</Typography>
                      {t.precioCentavos !== i.precioCentavos && (
                        <Typography variant="caption" color="warning.dark" sx={{ display: 'block' }}>
                          El precio de referencia cambió a USD {usd(t.precioCentavos)}. El proyecto conserva el precio cotizado
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      {editable ? (
                        <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'flex-end' }}>
                          <IconButton size="small" onClick={() => alRestar(t.id)} aria-label={`Restar una unidad de ${nombre}`}>−</IconButton>
                          <Typography component="span" sx={{ mx: 1 }}>{i.cantidad}</Typography>
                          <IconButton size="small" onClick={() => alSumar(t.id)} disabled={!puedeSumar(t.id)} aria-label={`Sumar una unidad de ${nombre}`}>+</IconButton>
                        </Stack>
                      ) : (
                        i.cantidad
                      )}
                    </TableCell>
                    <TableCell>{usd(i.precioCentavos)}</TableCell>
                    <TableCell>{usd(i.cantidad * i.precioCentavos)}</TableCell>
                    {editable && (
                      <TableCell>
                        <Button size="small" color="error" onClick={() => alQuitar(t.id)}>Quitar</Button>
                      </TableCell>
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </TableContainer>
      ) : (
        <Typography color="text.secondary" sx={{ py: 2 }}>
          Todavía no hay tecnologías en el proyecto
        </Typography>
      )}

      {/* //*Etiqueta a la izquierda y monto a la derecha, a todo el ancho */}
      <Box sx={{ display: 'grid', gridTemplateColumns: '1fr auto', rowGap: 0.75, mt: 2, pt: 2, borderTop: '1px solid #e0e6ed', '& > :nth-of-type(even)': { textAlign: 'right' } }}>
        <Typography color="text.secondary">Subtotal de equipos</Typography>
        <Typography>USD {usd(subtotal)}</Typography>
        <Typography color="text.secondary">Mano de obra ({PORCENTAJE_MANO_OBRA} %)</Typography>
        <Typography>USD {usd(manoObra)}</Typography>
        <Typography sx={{ fontWeight: 700, fontSize: 18 }}>Total estimado</Typography>
        <Typography sx={{ fontWeight: 700, fontSize: 18 }}>USD {usd(total)}</Typography>
      </Box>
      <Typography variant="caption" color="text.secondary" component="p" sx={{ mt: 0.5 }}>
        Dólares estadounidenses, sin impuestos. Mano de obra: 25 % fijo por acuerdos con los proveedores
      </Typography>
    </>
  );
}
