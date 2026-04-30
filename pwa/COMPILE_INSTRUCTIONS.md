# 🛠️ Instrucciones de Compilación y Desarrollo

## Entorno local (macOS)

### Requisitos
- Node.js (v22.x recomendado)
- npm

### Problema común
En algunos macOS, `node` y `npm` no están en el PATH por defecto cuando se ejecuta desde shells no interactivos.

### Solución: Usar ruta completa

```bash
# Navegar al proyecto
cd /Volumes/ssddev/appdev/AutoProductorEnergia/pwa

# Agregar /usr/local/bin al PATH temporalmente
export PATH="/usr/local/bin:$PATH"

# Verificar que node y npm estén disponibles
which node    # Debería mostrar: /usr/local/bin/node
which npm     # Debería mostrar: /usr/local/bin/npm

# Instalar dependencias (solo primera vez)
npm install

# Servidor de desarrollo
npm run dev
# Accede a: http://localhost:5173

# Build de producción
npm run build

# Linter (si está configurado)
npm run lint

# Formato (si está configurado)
npm run format
```

### Atajos útiles

**Si `node`/`npm` no se encuentran:**
```bash
# Encontrar la ruta de node
find /usr/local -name "node" -type f 2>/dev/null | head -5
# Normalmente: /usr/local/bin/node

# Usar node directamente
/usr/local/bin/node --version
/usr/local/bin/npm --version
```

**Ejecutar scripts con ruta completa:**
```bash
# En lugar de: npm run dev
/usr/local/bin/npm run dev

# O con export PATH (una vez por sesión)
export PATH="/usr/local/bin:$PATH"
npm run dev
```

---

## Notas importantes

- El proyecto está en **`pwa/`** dentro del repositorio
- El archivo de entorno es `.env.local` (no se commitea)
- Base de datos: Supabase (schema `energia`)
- Para despliegues, ver `DEPLOY_FIX_BILLING.md`

---

*Última actualización: 30-Abr-2026*
