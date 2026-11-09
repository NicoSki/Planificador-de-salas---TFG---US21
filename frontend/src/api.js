export async function api(ruta, metodo = 'GET', cuerpo) {
  const respuesta = await fetch(`/api${ruta}`, {
    method: metodo,
    headers: cuerpo ? { 'Content-Type': 'application/json' } : undefined,
    body: cuerpo ? JSON.stringify(cuerpo) : undefined,
  });
  // Sesión vencida en medio del uso: vuelve a la pantalla de ingreso. En /sesion, un 401 es correo o contraseña incorrectos
  if (respuesta.status === 401 && ruta !== '/sesion') window.location.assign('/ingresar');
  const datos = await respuesta.json().catch(() => ({}));
  if (!respuesta.ok) {
    const mensaje = datos.error ?? (datos.errores ? 'Revisá los datos marcados' : 'No se pudo conectar con el servidor');
    throw Object.assign(new Error(mensaje), { errores: datos.errores ?? {} });
  }
  return datos;
}

// Descarga un archivo de la API (el PDF de referencia) con el nombre que manda el servidor
export async function descargar(ruta) {
  const respuesta = await fetch(`/api${ruta}`);
  if (respuesta.status === 401) window.location.assign('/ingresar');
  if (!respuesta.ok) throw new Error((await respuesta.json().catch(() => ({}))).error ?? 'No se pudo descargar el archivo');
  const nombre = respuesta.headers.get('Content-Disposition')?.match(/filename="([^"]+)"/)?.[1] ?? 'documento.pdf';
  const url = URL.createObjectURL(await respuesta.blob());
  Object.assign(document.createElement('a'), { href: url, download: nombre }).click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
