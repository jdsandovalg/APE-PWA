# Propuesta de estrategia de respaldos (sin base de datos)

Este documento explica varias opciones para subir/almacenar respaldos JSON sin usar una base de datos tradicional. Está redactado para que puedas leerlo, comprenderlo y decidir la opción que prefieras. Está pensado para que cada archivo de respaldo incluya en su encabezado: número de correlativo, contador y fecha de generación; y para que el sistema registre, localmente por medidor, la última fecha de sincronización con ese "repositorio".

Ruta del archivo en el repositorio:
- `pwa/RESPALDOS_PROPOSAL_ES.md`

---

## 1) Requisitos mínimos
- No usar una base de datos relacional ni servidor complejo.
- El respaldo será un archivo JSON cuyo encabezado contiene metadatos:
  - `contador` (ej. `Z90018`)
  - `correlativo` (ej. `000123`)
  - `generatedAt` (ISO 8601, ej. `2025-11-22T10:15:30Z`)
- El sistema debe almacenar, por medidor, la fecha de la última sincronización con el "repositorio".
- Formato y nombre de archivo consistentes para facilitar listados y restauración.

## 2) Formato recomendado del archivo de respaldo
- Nombre de archivo sugerido:
  `{contador}_{correlativo}_{YYYYMMDDTHHMMSS}.json`
  - Ejemplo: `Z90018_000123_20251122T101530.json`

- Estructura JSON recomendada (ejemplo):

```json
{
  "header": {
    "contador": "Z90018",
    "correlativo": "000123",
    "generatedAt": "2025-11-22T10:15:30Z",
    "version": "1.0.0",
    "source": "apenergia-pwa",
    "clientId": "device-abc-123"
  },
  "readings": [
    { "date": "2025-11-01", "consumption": 123.45, "production": 0 },
    { "date": "2025-11-15", "consumption": 130.50, "production": 5.2 }
  ],
  "tariffs": { /* snapshot opcional de tarifas */ },
  "notes": "Backup exportado desde PWA local"
}
```

- El campo `header.generatedAt` sirve como la "marca de tiempo" principal del archivo.
- Incluir `clientId` ayuda a distinguir orígenes cuando haya varios dispositivos.

## 3) Cómo registrar `last_sync` por medidor
- Recomendado (cliente): guardar en `localStorage` una clave por medidor:
  - `apenergia:meter_sync:{contador}` = `2025-11-22T10:15:30Z`
- Alternativa: mantener un archivo índice en el repositorio (por ejemplo `indexes/{contador}.json`) con la última fecha y nombre de archivo.
- Tras subir exitosamente un archivo, el cliente actualiza `apenergia:meter_sync:{contador}` con `header.generatedAt`.

## 4) Opciones de almacenamiento (sin DB)
A continuación, las opciones con sus ventajas/desventajas y flujo de trabajo resumido.

### Opción A — Almacenamiento de objetos (S3 / Spaces / GCS) con URLs prefirmadas — RECOMENDADA
- Pros: segura, escalable, barata, no requiere usuarios con tokens permanentes (se usa URL pre-firmada corta duración).
- Contras: requiere una pequeña función de backend (serverless) para generar la URL pre-firmada.

Flujo:
1. Cliente pide a backend (ej. función Netlify) una URL pre-firmada para `PUT` con `Key` = `user/{contador}/{filename}`.
2. Backend genera la URL (usando credenciales del bucket) y la devuelve.
3. Cliente hace `PUT` con `Content-Type: application/json` y sube el JSON.
4. Si el `PUT` responde 200/201, cliente guarda `apenergia:meter_sync:{contador}` y opcionalmente llama a un endpoint para actualizar un índice.

Notas de implementación mínima (Node) — backend (pseudo):
```js
// Ejemplo conceptual con AWS SDK v3
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

const s3 = new S3Client({ region: 'us-east-1' })

export async function handler(event){
  const { key } = JSON.parse(event.body)
  const command = new PutObjectCommand({ Bucket: BUCKET, Key: key, ContentType: 'application/json' })
  const url = await getSignedUrl(s3, command, { expiresIn: 300 })
  return { statusCode: 200, body: JSON.stringify({ url }) }
}
```

Cliente (pseudocódigo):
```js
const payload = JSON.stringify(file)
const res = await fetch(presignedUrl, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: payload })
if (res.ok) {
  localStorage.setItem(`apenergia:meter_sync:${contador}`, file.header.generatedAt)
}
```

### Opción B — Repositorio Git (GitHub) — buen historial y UI
- Pros: historial automático, web UI para descargar/inspeccionar, sin infra nueva si usas GitHub.
- Contras: requiere token (o flujo OAuth), límites de API y tamaño de repositorio.

Flujo:
- Cliente usa GitHub REST API `PUT /repos/:owner/:repo/contents/:path` para crear/actualizar `backups/{contador}/{filename}.json`.
- Después de éxito, actualiza `apenergia:meter_sync:{contador}`.

Nota: para no pedir tokens en texto plano, usar OAuth o pedir al usuario un token temporal.

### Opción C — Dropbox / Google Drive (OAuth) — más simple para respaldos personales
- Pros: el usuario almacena en su propia cuenta; OAuth es directo; no necesitas servidor.
- Contras: cada usuario va a su propia cuenta (no centralizada), requiere permisos OAuth.

Flujo:
- El usuario autoriza a la app (OAuth), se obtiene token corto/renovable.
- Cliente sube archivo a carpeta `Apps/AutoProductorEnergía/` usando la API.
- Actualizar `apenergia:meter_sync:{contador}` tras la subida.

### Opción D — WebDAV / Nextcloud (self-hosted)
- Pros: control completo y versión si Nextcloud lo provee.
- Contras: tienes que mantener el servidor.

Flujo: cliente hace `PUT /dav/{user}/{contador}/{filename}.json` con autenticación.

## 5) Índices y listados
- Mantener un índice (opcional) por contador acelera la lista y evita leer todos los archivos.
- Ejemplo `indexes/Z90018.json`:
```json
{ "contador":"Z90018", "last_sync":"2025-11-22T10:15:30Z", "latest":"Z90018_000123_20251122T101530.json", "files": ["Z90018_000122_...json"] }
```
- El índice puede ser escrito por el backend al completar la subida o por el cliente si el almacenamiento lo permite (PUT).

## 6) Conflictos y política de merges
- Reglas simples (recomendadas):
  - `last-write-wins`: el backup con `header.generatedAt` más reciente prevalece.
  - Incluir `clientId` para detectar subidas desde distintos dispositivos.
  - Para conciliación manual: comparar `readings` y hacer merge por fecha (o pedir al usuario elegir).

## 7) Seguridad y buenas prácticas
- Nunca incrustes tokens permanentes en código o repositorios.
- Usa presigned URLs o OAuth cuando sea posible.
- Si hay un token comprometido (como el token en `netfily.sh`), revócalo inmediatamente y reemplázalo.
- Guarda `NETLIFY_AUTH_TOKEN` u otros secretos en GitHub Secrets para CI/CD.

## 8) Implementación mínima recomendada — opción A (S3 presigned) con Netlify Functions
¿Por qué?
- Tú ya estás usando Netlify para hospedar la PWA -> puedes añadir una función serverless para firmar uploads.
- No hay tokens en el cliente, sólo URLs de corta vida.

Pasos:
1. Crear bucket S3 (o DigitalOcean Spaces) y habilitar CORS para tu dominio.
2. Añadir una Netlify Function `getPresigned` en `pwa/netlify/functions/getPresigned.js` que reciba `key` y devuelva URL.
3. En `Navbar` (Export), añadir la opción `Subir a repositorio` que:
   - arma el nombre de archivo (según convención),
   - solicita la URL a la función,
   - hace `PUT` del JSON al URL,
   - actualiza `localStorage` con `apenergia:meter_sync:{contador}`.
4. (Opcional) Llamar a otra función para actualizar el índice `indexes/{contador}.json`.

## 9) Código cliente de ejemplo (upload con presigned url)
```js
async function uploadBackup(fileJson, contador, correlativo){
  const filename = `${contador}_${correlativo}_${new Date().toISOString().replace(/[:.-]/g,'').slice(0,15)}.json`
  // pedir presigned url
  const res = await fetch(`/.netlify/functions/getPresigned`, {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ key: `backups/${contador}/${filename}` })
  })
  const { url } = await res.json()
  // subir directamente
  const put = await fetch(url, { method: 'PUT', headers: {'Content-Type':'application/json'}, body: JSON.stringify(fileJson) })
  if (!put.ok) throw new Error('Upload failed')
  localStorage.setItem(`apenergia:meter_sync:${contador}`, fileJson.header.generatedAt)
}
```

## 10) Pasos siguientes que puedo implementar por ti
- Implementar la función serverless para presigned URLs (Netlify Function) y probarla.
- Añadir al `Navbar` una opción `Subir a repositorio` que use ese flujo y muestre toasts de progreso.
- Implementar (opcional) la escritura de un `indexes/{contador}.json` desde la función serverless tras confirmar el upload.

## 11) Cómo subir este archivo a OneDrive (opciones)
- Manual (simple): descarga el archivo desde el repositorio o cópialo localmente y súbelo por la web de OneDrive.
- Sincronización automática: si tu OneDrive está sincronizado con una carpeta local en macOS, copia el archivo a esa carpeta y OneDrive lo sube automáticamente.
- Programático (si quieres automatizar): usar `rclone` o la API de Microsoft Graph para subir el archivo desde la máquina o desde un script.

Ejemplo con `rclone` (si lo instalas):
```bash
# configurar remote: rclone config
rclone copy pwa/RESPALDOS_PROPOSAL_ES.md onedrive:Backups/APE/ -v
```

---

Si quieres, implemento la opción que prefieras:
- Si quieres lo más rápido (sin backend): implemento subida a **Dropbox/Google Drive** (OAuth) desde la PWA.
- Si quieres lo más robusto y escalable: implemento funciones Netlify que generen **presigned URLs** y el flujo cliente para subir a S3/Spaces.
- Si prefieres usar **GitHub** para historial y UI, implemento subida vía API a `backups/{contador}/` en un repo.

Dime cuál prefieres y lo implemento en el repositorio (`pwa/`) y lo dejo listo para que lo pruebes. ¡Si prefieres que te guíe para subir este mismo archivo a tu OneDrive ahora, dime y te doy los pasos rápidos para hacerlo desde tu Mac (o puedo ejecutar `rclone` si me autorizas a hacerlo aquí)!
