# Pendientes

Este archivo contiene la lista actual de tareas pendientes para el proyecto. Usa este archivo como una fuente simple y humana para coordinar el trabajo diario.

Formato recomendado (línea por tarea):
- [ ] breve-titulo: descripción corta. (responsable) [prioridad]

-Ejemplos:
- [ ] sync-feature: Revisar diseño de sincronización local/remote y definir API. (Daniel) [alta]
- [ ] vercel-deploy-check: Confirmar alias de producción y promote a deploy estable. (Daniel) [alta]

Tareas recomendadas inmediatas:
- [ ] vercel-promote: Revisar el estado de deployments en Vercel y promover la deploy estable asociada a `2b83429`. (Daniel) [alta]
- [ ] crear-branch-backup: Crear rama backup con commits posteriores al rollback por si necesitamos recuperar trabajo. (Daniel) [media]
- [ ] ci-protection: Añadir comprobación en CI para impedir merges a `main` sin PR aprobado y build exitoso. (Daniel) [alta]
- [ ] test-sync-scenario: Escribir pruebas y/o checklist manual para la funcionalidad de sincronización (incluye mocks para remote). (Daniel) [media]
- [ ] deploy-sanity-check: Script o checklist para comprobar `curl -I` en assets después del deploy (content-type y no servir index.html). (Daniel) [alta]

Instrucciones rápidas para el asistente:
- Para pedirme que lea este archivo: escribe `Lee pendientes.md` o `Revisa pendientes`.
- Para pedirme que agregue una tarea: escribe `Agrega a pendientes: <tarea breve> — <descripción> (responsable) [prioridad]`.
- Para marcar una tarea como completada y moverla a `changelog.md`: escribe `Marca completada: <tarea breve> — <nota opcional>`.

Última actualización: 23/11/2025
