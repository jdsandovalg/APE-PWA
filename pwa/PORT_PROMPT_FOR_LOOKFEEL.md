# Prompt para portar el Look & Feel de APE-PWA

Este archivo contiene un prompt listo para usar con un agente (ChatGPT/GitHub Copilot-like) que trabajará en otro proyecto para replicar el aspecto visual, animaciones y patrones UX que implementamos en `APE-PWA`.

Copia todo el contenido de este archivo y pégalo como la instrucción inicial al iniciar una sesión con el asistente en el otro proyecto.

---

INSTRUCCIONES (PROMPT) — ESPAÑOL

Actúa como un desarrollador front-end experto que debe portar el "look & feel" (UI/UX) de un proyecto fuente a otro proyecto destino. El proyecto fuente es una PWA React + TypeScript con Tailwind CSS, `framer-motion`, `lucide-react` y pequeñas utilidades (helpers), y cuenta con los siguientes rasgos visuales y de interacción que debes reproducir:

- Diseño oscuro y cristalizado (glass-card, glass-button, sombras suaves y gradientes sutiles).
- Tarjetas animadas con `framer-motion` (entradas con stagger, elevación al hover, microtransiciones en botones y logo).
- Pull-to-refresh en la vista Dashboard con indicador y spinner.
- Iconografía consistente con `lucide-react` (tamaños y colores coherentes).
- Uso de utilidades `clsx` y clases Tailwind para variaciones (micro-spacing, responsive grid `grid-cards`).
- Modal para comparar PDF vs cálculo del sistema (abrible desde un icono por fila en facturación). El modal carga el parser de PDF de forma diferida (lazy) para no inflar el chunk inicial.
- Persistencia de la selección activa (medidor) en `localStorage` con evento global `ape:meterChange` para sincronizar vistas.
- Fallback de cálculo local para facturación cuando la RPC `get_invoices` no devuelve filas correctas; marcar visualmente las facturas calculadas localmente.

Tu objetivo es entregar un plan de trabajo y aplicar cambios mínimos y seguros en el proyecto destino para reproducir esas características. Sigue este checklist y responde con acciones concretas (archivos a crear/editar, parches `git` y comandos a ejecutar):

1) Inspección inicial
- Pide la estructura del proyecto destino (o busca `package.json`, `src/`, `vite.config.*` o `webpack.config.js`).
- Identifica si el proyecto usa React+TS y Tailwind. Si no, propone una alternativa mínima (ej.: adicionar Tailwind o ajustar estilos CSS puros).

2) Dependencias y arquitectura
- Si faltan, añade: `framer-motion`, `lucide-react`, `clsx`. Menciona exactos `npm install` o `pnpm` comandos.
- Propón un esquema de carga diferida (dynamic import) para `pdfjs-dist` en el modal de comparación.
- Proponer `vite config` con `manualChunks` si el proyecto usa Vite (opcional) y explicar por qué.

3) Implementación mínima (paso a paso)
- Crear/editar `src/components/Dashboard.tsx` con:
  - Grid `grid-cards` y tarjetas tipo `glass-card`.
  - `framer-motion` wrapper: `motion.div` con `initial/animate/variants` y `whileHover` en tarjetas.
  - Pull-to-refresh básico para movil usando `onTouchStart/Move/End` y un `pullDistance` state con indicador.
- Crear/editar `src/components/Billing.tsx` con:
  - Icono PDF por fila (ej. `FileText` de `lucide-react`) que abre `InvoiceCompareModal`.
  - Lógica: cuando el RPC `get_invoices` no devuelve filas o el segmento es inconsistente, llamar `computeInvoiceForPeriod` (helper) y marcar `_computed_local=true`.
- Crear `src/components/InvoiceCompareModal.tsx` con:
  - Carga lazy del parser de PDF (ej. `const pdf = await import('pdfjs-dist')`).
  - UI para mostrar el PDF en un iframe o canvas y el cálculo paralelo en una columna para comparar.
- Crear `src/utils/pdfClientValidator.ts` (o portar el helper) para parsear facturas PDF con heurísticas (nombre, total, periodos).
- Añadir persistencia de selección: util `localStorage` key `ape_currentMeterId` y emitir `window.dispatchEvent(new CustomEvent('ape:meterChange', { detail: { meterId } }))`.

4) Estilos
- Añadir utilidades en `src/styles/index.css` o adaptar `tailwind.config.js` para variables de color y utilidades `glass-*` si no existen.
- Proveer clases de ejemplo: `.glass-card`, `.glass-button`, `grid-cards` y spinner.

5) Pruebas y build
- Ejecutar `npm run dev` y `npm run build`, validar que el bundle no incluyó `pdfjs` en `main` (ver `dist/` y tamaños) — sugiere ejecutar `npm run build` y revisar tamaños.

6) Commit y PR
- Genera commits pequeños y descriptivos; incluye mensajes sugeridos.
- Si hay un CI/CD en destino, sugiere ejecutar build en PR.

7) Opcionales (mejoras)
- Externalizar `pdf.worker` si se necesita CDN.
- Mover servicios o claves a backend y ofrecer endpoints que no expongan claves en frontend.

Requisitos de salida del asistente (qué quiero que me entregues):
- Un plan de archivos a crear/editar con parches `git` estilo `apply_patch` (si se dispone de acceso) o cambios propuestos en diff/patch form.
- Comandos exactos para instalar dependencias y correr build.
- Ejemplos de código para los componentes clave (`Dashboard`, `Billing`, `InvoiceCompareModal`) y el helper `pdfClientValidator` listos para pegar.
- Lista de verificaciones para QA (funcional y visual).

Contexto adicional que puedes asumir si no te dan más detalles:
- Proyecto destino es React + TypeScript con Vite y Tailwind (si no, pide autorización para adaptar).
- Tenemos acceso a editar los archivos del repositorio destino.
- No hay credenciales secretas locales; toda interacción con Supabase (o similar) debe usar endpoints públicos o demandar credenciales por separado.

---

USO: pega el contenido de este archivo como la instrucción inicial al asistente en la sesión de trabajo del otro proyecto. Después, adjunta (o el asistente preguntará por) la estructura del repo destino para obtener pasos precisos.

---

Fin del prompt.

ADICIONAL: INSTRUCCIONES PARA PANTALLA DE LOGIN Y RPC DE USUARIOS

Incluye también las siguientes tareas en la instrucción que pegues al asistente en el repo destino. Pide al asistente que implemente o genere parches para las cosas siguientes:

- Crear una pantalla de login minimalista y centrada (`src/components/Login.tsx`):
  - Debe estar centrada vertical y horizontalmente en la pantalla (desktop y mobile).
  - Diseño limpio y coherente con el `look & feel` (usar `glass-card`, inputs con bordes suaves y botones `glass-button`).
  - Campos: `email` y `password` (con validación mínima: email con formato y password mínimo 6 caracteres).
  - Botones: `Cancelar` (cierra modal/limpia inputs o redirige a página anterior) y `Login` (envía credenciales).
  - Diseñado pensando en accesibilidad: labels visibles, `aria-*` en botones, `type="email"/"password"` y soporte de `Enter` para submit.
  - Mobile-first responsive: inputs full-width en pantallas pequeñas y ancho limitado en desktop.

- Login flow y RPC de validación:
  - El asistente debe **preguntar** la estructura de la tabla `users` en la base de datos destino. Si no se la das, debe proporcionar una plantilla SQL sugerida (ejemplo abajo) y solicitar confirmación antes de usarla.
  - Sugerir una RPC (Postgres function) `rpc_validate_user(email text, password text)` que:
    - Busque el usuario por `email` en la tabla `users`.
    - Compare el `password` hasheado (en DB se asume `password_hash` con bcrypt o similar). Si la base no tiene hash, el asistente debe indicar que es inseguro y ofrecer crear una columna `password_hash` y una función para setear el hash.
    - Retorne un objeto con `ok boolean`, `user_id uuid`, `roles text[]` y `message text`.
  - El prompt debe pedir al asistente que genere la consulta SQL para crear la RPC (o su equivalente para la DB que uses), y un wrapper fetch/Axios en `src/services/auth.ts` que llame a la RPC y entregue la respuesta al frontend.

- Seguridad y recomendaciones:
  - No incluir credenciales en el frontend; si el proyecto usa Supabase, indicar usar `anon` público para llamadas necesarias y mover la validación sensible a endpoint/Edge Function si se requiere proteger claves.
  - Usar HTTPS y protección contra bruteforce (sugerir rate-limiting en el servidor o usar servicio de autenticación dedicado si aplica).

- Entregables y pruebas:
  - Parche `apply_patch` o diff con los archivos modificados/creados: `src/components/Login.tsx`, `src/services/auth.ts`, `sql/rpc_validate_user.sql` (o `migrations/`), y cambios en `src/App.tsx` o rutas para exponer la pantalla de login.
  - Comandos para instalar dependencias si faltan (ej. `npm install bcryptjs` en el servidor para hashear, o `npm install` para libs frontend).
  - Pasos para probar localmente: `npm run dev`, visitar `/login`, intentar login con credenciales de prueba (el asistente debe indicar cómo inyectar un usuario de prueba en la tabla `users` si no existe).

Plantilla de tabla `users` sugerida (pide confirmación antes de usarla):

```sql
CREATE TABLE users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  full_name text,
  roles text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);
```

Plantilla de RPC sugerida (Postgres + pgcrypto/bcrypt pseudo):

```sql
-- Ejemplo: adaptar según funciones de hash disponibles (pgcrypto o extension bcrypt)
CREATE OR REPLACE FUNCTION rpc_validate_user(_email text, _password text)
RETURNS TABLE(ok boolean, user_id uuid, roles text[], message text) AS $$
DECLARE
  u RECORD;
BEGIN
  SELECT id, password_hash, roles INTO u FROM users WHERE email = _email LIMIT 1;
  IF NOT FOUND THEN
    ok := false; user_id := NULL; roles := ARRAY[]::text[]; message := 'Usuario no encontrado';
    RETURN NEXT;
    RETURN;
  END IF;

  -- Suponer que el hash se verifica con una función verify_password(password, hash)
  IF verify_password(_password, u.password_hash) THEN
    ok := true; user_id := u.id; roles := u.roles; message := 'OK';
  ELSE
    ok := false; user_id := NULL; roles := ARRAY[]::text[]; message := 'Credenciales inválidas';
  END IF;
  RETURN NEXT;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

Instrucción final para pegar en el proyecto destino (resumen breve que el asistente comprenderá rápidamente):

"Además de portar el look & feel, crea una pantalla de login minimalista y centrada (desktop/mobile), con campos `email` y `password`, botones `Cancelar` y `Login`. Antes de generar la RPC, pregúntame la estructura real de la tabla `users` o confirma usar la plantilla sugerida. Genera parches `apply_patch` para los archivos: `src/components/Login.tsx`, `src/services/auth.ts`, `sql/rpc_validate_user.sql` y actualiza rutas/`App.tsx` para exponer `/login`. Asegura que el login llame a una RPC `rpc_validate_user(email,password)` y entregue la respuesta al frontend." 

---

Fin de la actualización del prompt.
