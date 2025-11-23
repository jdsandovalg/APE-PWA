# CHANGELOG

Todas las notas de cambios notables del proyecto.

## v0.1.0 - 2025-11-23

- Añadido: `InvoiceModal` mejora — muestra líneas de factura (Concepto / Valor/Tasa / Importe) y lecturas asociadas (Saldo Anterior, Lectura Actual, Saldo, Resultado).
- Cambiado: UI más compacta (botones icon-first, tamaños de fuente reducidos para tablas y cabeceras de modal a 10px).
- Mejorado: accesibilidad y comportamiento de modales — `role="dialog"`, `aria-modal`, cierre con `Escape`, enfoque programático al botón de cerrar y restauración del foco.
- Arreglo: se eliminó/archivó la carpeta duplicada accidental `pwa/APE-PWA` (movida a `~/APE-PWA.backup`) y se registró la eliminación en Git.
- Infra: script de despliegue `pwa/deploy_from_pwa.sh` revisado — helpers para `npm run build`, commit/push y deploy a Netlify (usa `NETLIFY_AUTH_TOKEN` o archivo `.netlify_token`).
- Build: generación de `pwa/dist` y `vite preview` corriendo localmente (por defecto en http://localhost:4173/).

### Notas de despliegue

- Para deploy completo desde `pwa` usar (recomendado en CI o con token en entorno):

```bash
cd pwa
export NETLIFY_AUTH_TOKEN="<tu_token>"
./deploy_from_pwa.sh -m "chore(deploy): release v0.1.0"
```

- Para solo push sin desplegar a Netlify:

```bash
cd pwa
./deploy_from_pwa.sh -s -m "chore(deploy): push only"
```

### Backup local

- Si necesitas restaurar la copia movida, está en `~/APE-PWA.backup`.

---

_Generado automáticamente el 2025-11-23_
