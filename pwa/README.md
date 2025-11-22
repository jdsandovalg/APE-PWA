# AutoProductor Energía — PWA

Proyecto PWA minimal para gestión de energía solar (React + TypeScript + Tailwind).

Quick start:

```bash
cd pwa
npm install
npm run dev
```

- App: `src/App.tsx`
- Service Worker: `public/sw.js`
- Manifest: `manifest.json`

Notas:
- Importa CSV con cabeceras `date,consumption,production,credit`.
- Exporta datos en JSON para backup.
