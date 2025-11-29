Política: Cargos Financieros (Mora) — APE PWA
=============================================

Resumen
-------
Este documento aclara cómo trata APE PWA los cargos financieros (por ejemplo, **mora**, intereses o recargos) en el flujo operativo de lecturas y facturación.

Política
--------
- La aplicación APE PWA se encarga únicamente del manejo operativo de lecturas (`readings`) y de la gestión de tarifas (`tariffs`).
- Cualquier cargo financiero derivado de una factura (mora, intereses, recargos administrativos) se considera fuera del alcance operativo y **no se** almacena en la base de datos como parte de las lecturas.
- El comparador de facturas (PDF vs cálculo del sistema) mostrará visualmente los campos encontrados en el PDF (incluyendo, si existen, cantidades de mora), pero estos no se guardarán como lecturas ni modificarán los datos de `readings`.

Razonamiento
-----------
- Separar la responsabilidad operativa (medición, delta entre lecturas, cálculo de cargos basados en tarifas) de la responsabilidad financiera (cobro de mora, administración de cuentas por cobrar) evita mezclar estados y simplifica auditoría y conciliación con sistemas contables.

Comportamiento en la UI
-----------------------
- Si un `invoice_data` JSON o un PDF incluye un campo `mora` o `mora_Q`, el comparador lo mostrará en el detalle del invoice, pero la tabla de `readings` y las funciones de cálculo de deltas no almacenarán ese valor.
- Podemos opcionalmente mostrar una etiqueta visual en la tabla de facturación indicando "Incluye mora (visual)" cuando el JSON de la factura contenga ese campo.

Operaciones futuras
-------------------
- Si se desea gestionar cargos financieros desde este sistema, se recomienda:
  1. Añadir una tabla separada `financial_charges` con control de auditoría y permisos especiales.
  2. Implementar vistas o endpoints específicos para conciliación con el módulo contable.

Contacto
--------
- Para discutir cambios en la política o integración financiera, contactar al equipo responsable de producto.
