# APE-PWA

**AutoProductor Energía** - Aplicación web progresiva para gestión de autoproducción energética.

## 📋 Descripción

Sistema completo para el monitoreo y gestión de instalaciones de autoproducción energética. Incluye seguimiento de lecturas, cálculo de facturación, gestión de tarifas y exportación de reportes.

### ✨ Características Principales

- **📊 Dashboard Interactivo**: Visualización de datos en tiempo real con gráficos de producción, consumo y saldos
- **📈 Gestión de Lecturas**: Registro y seguimiento histórico de lecturas de medidores
- **💰 Cálculo de Facturación**: Sistema automático de cálculo de facturas basado en tarifas activas
- **🏢 Gestión de Empresas**: Administración de compañías distribuidoras y códigos de tarifa
- **📄 Exportación PDF**: Generación de reportes imprimibles (temporalmente deshabilitado)
- **🔄 Sincronización**: Sincronización automática con base de datos remota
- **📱 PWA**: Funciona como aplicación nativa en dispositivos móviles

## 🚀 Inicio Rápido

### Prerrequisitos

- Node.js 18+
- npm o yarn

### Instalación

```bash
# Clonar el repositorio
git clone <repository-url>
cd AutoProductorEnergia/pwa

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm run dev

# Construir para producción
npm run build
```

### Despliegue

```bash
# Desde la carpeta pwa
npm run build

# Desplegar usando los scripts disponibles
./deploy_via_ftp.sh  # Para FTP
# o configurar Vercel para despliegues automáticos
```

## 📁 Estructura del Proyecto

```
AutoProductorEnergia/
├── pwa/                    # Aplicación principal
│   ├── src/
│   │   ├── components/     # Componentes React
│   │   ├── services/       # Servicios (API, storage)
│   │   ├── utils/          # Utilidades
│   │   └── App.tsx         # Aplicación principal
│   ├── dist/               # Build de producción
│   └── package.json
├── scripts/                # Scripts de automatización
├── CHANGELOG.md           # Historial de cambios
├── pendientes.md          # Lista de tareas pendientes
└── README.md              # Este archivo
```

## 🔧 Estado Actual

### ✅ Funcionalidades Operativas

- Gestión completa de medidores y lecturas
- Cálculo automático de facturación
- Dashboard con gráficos interactivos
- Sincronización con Supabase
- Gestión de empresas y tarifas
- Interfaz responsive y accesible

### ⚠️ Funcionalidades Temporalmente Deshabilitadas

- **Exportación PDF**: Deshabilitada debido a problemas técnicos con gráficos
- **Importación/Exportación de datos**: Deshabilitada temporalmente

### 🔍 Problemas Conocidos

- **Fechas de tarifas**: Algunas tarifas tienen fechas que no corresponden a trimestres válidos
- **PDF Export**: Gráficos no se renderizan correctamente en PDFs

## 📚 Documentación

- [Colaboración Profesional](Colaboracion_Profesional.md) - Guías de desarrollo y colaboración
- [Pendientes](pendientes.md) - Lista actual de tareas pendientes
- [CHANGELOG](CHANGELOG.md) - Historial completo de cambios

## 🛠️ Tecnologías

- **Frontend**: React 18 + TypeScript + Vite
- **UI**: Tailwind CSS + Lucide Icons
- **Charts**: Recharts
- **Backend**: Supabase (PostgreSQL)
- **PWA**: Service Workers + Web App Manifest
- **Build**: Vite + Rollup

## 🤝 Contribución

1. Lee las [guías de colaboración](Colaboracion_Profesional.md)
2. Crea una rama para tu feature: `git checkout -b feature/nueva-funcionalidad`
3. Realiza tus cambios siguiendo las convenciones del proyecto
4. Crea un Pull Request con descripción detallada

## 📞 Soporte

Para soporte técnico o reportar problemas, utiliza los issues del repositorio.

---

## 🆕 Últimas mejoras (2025-11-28)

- Añadido modal de comparación de facturas (`pwa/src/components/InvoiceCompareModal.tsx`) para subir PDFs y comparar línea a línea con los cálculos del sistema.
- Parser cliente para PDF (`pwa/src/utils/pdfClientValidator.ts`) usando `pdfjs-dist` y heurísticas de extracción para cargos y totales.
- Mejora en la tabla de facturación: icono de comparar integrado en la columna `Fecha`, tooltip accesible y correcciones visuales.
- Herramientas de auditoría y utilidades consolidadas en `pwa/jsutils/` (scripts de validación y recomputo).
- Ajustes en Git: PDFs de ejemplo removidos del índice y añadidos a `.gitignore` para evitar subir binarios grandes.

**Última actualización**: 28 de noviembre de 2025