**Propósito**: Documento de referencia para coordinar cambios, revisiones y despliegues del proyecto. Sirve como guía para la colaboración entre desarrolladores y agentes automatizados.

**Principios**:
- **Planificación**: Antes de implementar una característica (especialmente cambios que afecten despliegues), describir brevemente el objetivo, riesgos y pasos en un issue o PR.
- **Pequeños pasos**: Implementar por partes pequeñas y testeables; evitar cambios grandes y atómicos que esconden múltiples efectos.
- **Probar localmente**: Siempre ejecutar `npm run build` y prueba funcional básica en un entorno local antes de subir a remoto.
- **Entorno de previsualización**: Usar ramas de feature y previews (Vercel Preview Deployments) para validar en un entorno lo más parecido a producción.
- **Revisiones y autorización**: Ningún cambio disruptivo a producción se fusiona sin revisión y autorización explícita del responsable del proyecto.
- **Rollback seguro**: Documentar la estrategia de rollback y crear backups automáticos (branch de respaldo) antes de operaciones destructivas (por ejemplo `git push --force`).

**Flujo recomendado (paso a paso)**:
1. Crear un issue que describa el cambio: objetivo, impacto, y pasos para validar.
2. Crear una rama de feature: `feature/<breve-descripción>` desde `main`.
3. Implementar cambios en pequeños commits con mensajes claros. Ejecutar `npm run build` y pruebas locales.
4. Abrir Pull Request (PR) hacia `main`. Incluir descripción, pasos de verificación y screenshots o logs si aplica.
5. Revisiones: al menos una revisión de código por otro desarrollador (o por el responsable). Resolver comentarios antes de merge.
6. Probar Vercel Preview: revisar la Preview URL y confirmar que assets se sirven correctamente (no hay errores MIME, manifest o Service Worker rotos).
7. Merge a `main` sólo después de validación. Preferir `merge` o `squash` pero evitar `force push` sobre `main` salvo autorización explícita.
8. Desplegar a producción: si Vercel no hace auto-promotion, promover la deployment correcta desde el Dashboard o forzar deploy con un commit mínimo.
9. Verificación post-deploy: ejecutar `curl -I https://<produccion>/assets/<asset>.js` y comprobar `content-type` y que no devuelva `index.html` para assets estáticos.
10. Si algo falla, aplicar rollback rápido (promote previous deployment en Vercel o revert en git) y documentar el incidente.

**Checklist de PR (mínimo)**:
- **Descripción**: ¿Se describe qué y por qué?
- **Build**: ¿`npm run build` pasa localmente sin errores?
- **Preview**: ¿Preview en Vercel verificado?
- **Tests**: ¿Se añadieron/ejecutaron tests necesarios? (si aplica)
- **Docs**: ¿Se actualizaron docs o notas de despliegue?
- **Autorización**: ¿Quién aprobó el merge?

**Reglas para agentes/automatizaciones**:
- No empujar cambios a `main` sin que un humano autorizado verifique el PR y apruebe el merge.
- Cuando un agente proponga cambios, primero generar un patch en una rama de feature y abrir PR; notificar al responsable.
- Evitar acciones destructivas (por ejemplo, `git push --force`) sin confirmación humana explícita.

**Manejo de despliegues (Vercel)**:
- Preferir promover una deployment conocida en vez de hacer rollback por git cuando sea posible.
- Si se necesita forzar la historia en `main`, primero crear un branch backup `backup-before-rollback-<ts>` y subirlo a `origin`.
- Antes de cualquier cambio que afecte assets (manifest, sw.js, paths), verificar `public/` y `vite` config para evitar referencias a assets inexistentes.

**Comunicación y registro**:
- Registrar brevemente en el issue o en `CHANGELOG.md` cada despliegue mayor o rollback, con fecha, commit y responsable.
- Si un agente automatizado hizo cambios, incluir una nota con su identificación y el resumen del cambio.

**Cierre**:
Mantener esta guía actualizada. Antes de iniciar un nuevo ciclo de cambios significativos, revisar este documento y acordar responsables y ventanas de despliegue.

---

_Fecha creada: 23/11/2025_

## Acuerdos recientes

Estos acuerdos fueron propuestos por el equipo durante la sesión de trabajo y deben ser aplicados en futuras colaboraciones:

- **Plan antes de acción**: todo cambio significativo debe empezar con un plan breve (objetivo, pasos, riesgos) y ser aprobado por el responsable del proyecto.
- **Paso a paso y validación**: implementar en pequeñas etapas, probar localmente y en Preview (Vercel Preview) antes de fusionar a `main`.
- **No publicar sin revisión**: no pushear cambios directos a `main` que afecten despliegues sin un PR revisado y la autorización explícita del responsable.

Colocar estas reglas en práctica evita regresiones en producción y asegura que los despliegues se comporten según lo esperado.

## Secuencia de Implementación Exitosa (Caso: Gestión de Equipos)

Este flujo se utilizó para implementar el módulo de "Equipos y Proyecciones" (Enero 2026) y sirve como referencia para futuras funcionalidades:

1.  **Base de Datos**:
    *   Definición de tablas con restricciones (`CHECK`) y columnas generadas (`GENERATED ALWAYS`).
    *   Creación de índices y triggers para `updated_at`.
    *   Respaldo del SQL en carpeta `database/`.

2.  **Capa de Servicios**:
    *   Implementación de CRUD completo en servicio dedicado (`equipmentService.ts`).
    *   Manejo de tipos TypeScript estrictos.

3.  **Interfaz de Usuario (UI)**:
    *   Uso de **Headless UI** (Combobox, Listbox, Switch) para componentes interactivos complejos.
    *   Implementación de "Gestión Inline": Crear/Editar catálogos desde el mismo modal de uso.

4.  **Control de Versiones (Flujo Ágil)**:
    *   Desarrollo directo sobre rama principal (cuando se acuerda).
    *   `git status` -> `git add .`
    *   `git commit -m "feat: Título" -m "Detalles..."`
    *   `git push`
