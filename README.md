# LPT Discovery — La Palma & El Tucán

Cuestionarios de discovery por área para informar el diseño del sistema de
asistencia ejecutiva con IA.

## Áreas

- **Contable** — Martica + Equipo LP&T
- **Tesorería y Bancos** — Catherine Monsalve
- **Planeación Financiera y Presupuestos** — William Nieto
- **Comercial** — Jeffrey
- **Operaciones de Café** — John Jairo Cruz
- **Cultivos Asociados** — John Jairo Cruz
- **Calidades e Inventarios** — Ismelda Cubillos + Sergio

## Stack

- HTML/CSS/JS estático (sin framework)
- Backend: Supabase REST (tabla `discovery_responses`, RLS solo-INSERT)
- Captura de archivos: carpeta Drive aparte (link en `assets/config.js`)
- Auto-save en `localStorage` por área

## Hosting

GitHub Pages — https://fsardi19.github.io/lpt-discovery/

## Estructura

```
discovery/
├── index.html                  ← landing
├── assets/
│   ├── styles.css              ← compartido
│   ├── form.js                 ← compartido (auto-save + submit a Supabase)
│   └── config.js               ← Supabase URL + anon key + Drive folder
├── contable/
├── tesoreria-bancos/
├── planeacion-financiera/
├── comercial/
├── operaciones-cafe/
├── cultivos-asociados/
└── calidades-inventarios/
```

## Privacidad

- La anon key de Supabase es pública por diseño; las RLS policies solo permiten
  `INSERT`, nunca `SELECT/UPDATE/DELETE` desde el navegador.
- Las respuestas viven en el proyecto Supabase `lpt-discovery` (cuenta La Palma
  y El Tucán).
- Nada del contenido viaja a terceros excepto Supabase.
