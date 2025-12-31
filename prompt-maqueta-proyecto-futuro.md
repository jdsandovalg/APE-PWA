# PROMPT PARA CREAR MAQUETA DE APLICACIÓN WEB MODERNA
# Proyecto: Sistema de Gestión Empresarial con Look & Feel Inspirado en APE-PWA

## 🎯 OBJETIVO
Crear una maqueta (mockup) de aplicación web que replique exactamente el look & feel del sistema de autoproductores de energía solar, enfocándonos únicamente en el diseño visual y experiencia de usuario. Los datos serán mock/static inicialmente.

## 🎨 LOOK & FEEL DETALLADO

### Paleta de Colores (Tema Oscuro Principal)
```css
:root {
  /* Fondos */
  --bg-primary: #0f172a;      /* Azul muy oscuro - fondo principal */
  --bg-secondary: #1e293b;    /* Azul oscuro - cards, modales */
  --bg-tertiary: #334155;     /* Azul grisáceo - elementos secundarios */
  --bg-glass: rgba(255, 255, 255, 0.05);  /* Fondo vidrio */
  --bg-glass-hover: rgba(255, 255, 255, 0.08);  /* Hover vidrio */

  /* Texto */
  --text-primary: #f8fafc;    /* Blanco casi puro */
  --text-secondary: #cbd5e1;  /* Gris claro */
  --text-muted: #64748b;     /* Gris medio */
  --text-accent: #fbbf24;    /* Amarillo dorado */

  /* Acentos */
  --accent-primary: #fbbf24;  /* Amarillo dorado - botones principales */
  --accent-secondary: #f97316; /* Naranja - gradientes */
  --accent-hover: #f59e0b;   /* Amarillo más oscuro */

  /* Estados */
  --success: #34d399;        /* Verde */
  --warning: #f59e0b;        /* Amarillo warning */
  --error: #fb7185;          /* Rojo/rosado */
  --info: #38bdf8;           /* Azul claro */

  /* Bordes y sombras */
  --border-glass: rgba(255, 255, 255, 0.1);
  --border-subtle: rgba(255, 255, 255, 0.05);
  --shadow-glass: 0 8px 32px rgba(0, 0, 0, 0.3);
  --shadow-card: 0 4px 16px rgba(0, 0, 0, 0.2);
}
```

### Gradientes Característicos
```css
/* Gradiente principal para headers/accentos */
--gradient-primary: linear-gradient(135deg, #fbbf24 0%, #f97316 100%);

/* Gradiente sutil para fondos */
--gradient-bg: linear-gradient(135deg, #0f172a 0%, #1e293b 100%);

/* Gradiente para botones */
--gradient-button: linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%);
```

### Tipografía
- **Fuente principal**: Inter (Google Fonts)
- **Pesos**: 300 (light), 400 (regular), 600 (semibold), 700 (bold), 800 (extrabold)
- **Tamaños base**:
  - xs: 0.75rem (12px)
  - sm: 0.875rem (14px)
  - base: 1rem (16px)
  - lg: 1.125rem (18px)
  - xl: 1.25rem (20px)
  - 2xl: 1.5rem (24px)
  - 3xl: 1.875rem (30px)

## 🏗️ ARQUITECTURA TÉCNICA

### Stack Tecnológico
- **Framework**: Next.js 14+ (App Router)
- **Lenguaje**: TypeScript
- **Styling**: Tailwind CSS 3.4+
- **Componentes**: React 18+
- **Animaciones**: Framer Motion
- **Icons**: Lucide React
- **Charts**: Recharts (para maqueta)
- **Deployment**: Vercel

### Estructura de Carpetas
```
/
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── dashboard/
│   │   ├── page.tsx
│   │   └── components/
│   └── globals.css
├── components/
│   ├── ui/
│   │   ├── button.tsx
│   │   ├── card.tsx
│   │   ├── input.tsx
│   │   ├── modal.tsx
│   │   └── table.tsx
│   ├── layout/
│   │   ├── navbar.tsx
│   │   ├── sidebar.tsx
│   │   └── footer.tsx
│   └── charts/
│       └── metric-chart.tsx
├── lib/
│   ├── utils.ts
│   └── mock-data.ts
├── styles/
│   └── globals.css
└── public/
    ├── icons/
    └── images/
```

## 🎨 COMPONENTES UI ESPECÍFICOS

### 1. Cards Glassmorphism
```tsx
// Estilo característico
className="glass-card bg-glass border border-glass rounded-xl p-6 backdrop-blur-md shadow-glass hover:bg-glass-hover transition-all duration-300"
```

### 2. Botones
```tsx
// Botón principal
className="glass-button bg-accent-primary hover:bg-accent-hover text-bg-primary px-4 py-2 rounded-lg font-semibold transition-all duration-200 shadow-lg hover:shadow-xl"

// Botón secundario
className="glass-button-secondary bg-glass border border-glass hover:bg-glass-hover px-4 py-2 rounded-lg transition-all duration-200"
```

### 3. Layout Grid
```tsx
// Grid responsive para dashboard
className="grid grid-cards gap-4 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
```

### 4. Animaciones
```tsx
// Animación de entrada para cards
<motion.div
  initial={{ opacity: 0, y: 20 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.3, delay: index * 0.1 }}
  whileHover={{ y: -4 }}
  className="card-class"
>
```

## 📱 PÁGINAS Y SECCIONES

### 1. Layout Principal
- **Navbar**: Logo + navegación + tema toggle
- **Sidebar**: Menú lateral responsive
- **Main**: Área de contenido con padding responsive

### 2. Dashboard
- **Header**: Título + métricas principales
- **Grid de Cards**: 4-6 cards con métricas
- **Gráficos**: 2-3 gráficos principales
- **Tabla**: Lista de elementos recientes

### 3. Páginas Secundarias
- **Lista**: Tabla con filtros y búsqueda
- **Detalle**: Vista de elemento individual
- **Formulario**: Modal/formulario de creación/edición

## 🎯 CARACTERÍSTICAS VISUALES ESPECIALES

### Efectos Glassmorphism
- `backdrop-blur-md` para desenfoque
- `bg-glass` con opacidad baja
- Bordes sutiles con `border-glass`
- Sombras suaves

### Tema Responsivo
- Mobile-first approach
- Breakpoints: sm, md, lg, xl
- Sidebar colapsable en móvil
- Cards adaptativas

### Estados Interactivos
- Hover: Elevación y cambio de opacidad
- Focus: Anillos de color accent
- Loading: Spinners con gradientes
- Disabled: Opacidad reducida

### Iconografía
- Lucide React para consistencia
- Tamaños: 16px, 20px, 24px, 32px
- Colores contextuales (success, warning, error)

## 📊 DATOS MOCK PARA MAQUETA

### Dashboard Metrics
```typescript
const mockMetrics = [
  { title: "Total Ventas", value: "$45,231", change: "+12.5%", icon: TrendingUp },
  { title: "Clientes Activos", value: "1,234", change: "+8.2%", icon: Users },
  { title: "Pedidos Hoy", value: "89", change: "+23.1%", icon: ShoppingCart },
  { title: "Ingresos Mensuales", value: "$12,345", change: "+4.7%", icon: DollarSign }
]
```

### Gráficos
- **Línea**: Tendencia de ventas (últimos 7 días)
- **Barra**: Comparación mensual
- **Área**: Acumulado anual

### Tabla de Datos
- Columnas: ID, Nombre, Estado, Fecha, Acciones
- Estados: Activo, Pendiente, Completado
- Acciones: Ver, Editar, Eliminar

## 🚀 IMPLEMENTACIÓN PASO A PASO

### Fase 1: Setup Base
1. Crear proyecto Next.js con TypeScript
2. Configurar Tailwind CSS con variables personalizadas
3. Instalar dependencias (Framer Motion, Lucide, Recharts)
4. Crear estructura de carpetas

### Fase 2: Componentes Base
1. Crear componentes UI (Button, Card, Input, Modal)
2. Implementar layout principal (Navbar, Sidebar)
3. Configurar tema y variables CSS

### Fase 3: Dashboard
1. Crear página principal con grid de métricas
2. Implementar cards con animaciones
3. Agregar gráficos básicos

### Fase 4: Páginas Secundarias
1. Crear páginas de lista y detalle
2. Implementar formularios y modales
3. Agregar navegación completa

### Fase 5: Pulido
1. Optimizar responsive design
2. Agregar micro-interacciones
3. Testing visual en diferentes dispositivos

## 🎨 ASSETS VISUALES

### Iconos Requeridos
- Logo principal (SVG con gradiente)
- Iconos de métricas (Lucide)
- Iconos de navegación
- Favicons múltiples tamaños

### Imágenes
- Avatares placeholder
- Imágenes de productos (placeholders)
- Backgrounds sutiles

## 📋 CRITERIOS DE ÉXITO

### Visuales
- ✅ Replicación exacta del glassmorphism
- ✅ Paleta de colores idéntica
- ✅ Animaciones y transiciones suaves
- ✅ Responsive perfecto

### Técnicos
- ✅ Código limpio y mantenible
- ✅ Componentes reutilizables
- ✅ Performance óptima
- ✅ TypeScript completo

### UX
- ✅ Navegación intuitiva
- ✅ Estados de carga apropiados
- ✅ Feedback visual claro
- ✅ Accesibilidad básica

---

## 🎯 RESULTADO ESPERADO
Una maqueta visualmente idéntica al sistema APE-PWA, que sirva como base para cualquier proyecto futuro que requiera el mismo look & feel profesional y moderno.</content>
<parameter name="filePath">/Users/danielsandoval/appdev/AutoProductorEnergia/prompt-maqueta-proyecto-futuro.md