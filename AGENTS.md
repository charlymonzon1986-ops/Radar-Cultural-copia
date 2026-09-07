# 🚨 RESTRICCIONES Y REGLAS DE MEMORIA PERMANENTE (AGENTS.MD)

## ⚡ REGLA DE ORO
```
EL AGENTE SOLO EDITA UI/UX — NUNCA TOCA DATOS, BACKEND, NI CONFIGURACIÓN
```

---

## ❌ ARCHIVOS QUE EL AGENTE NUNCA TOCA (CRÍTICOS Y PROHIBIDOS)

- `src/components/espacios.ts` — Base de datos de venues / espacios culturales.
- `.env` y `.env.local` — Credenciales y variables de entorno.
- `vercel.json` — Configuración de despliegue.
- `tsconfig.json` — Configuración de TypeScript.
- `package.json` — Dependencias y scripts.
- `.gitignore` — Configuración de Git.
- `vite.config.ts` — Configuración del bundler.
- Archivos dentro de `/src/lib/`, `/src/hooks/` o `/src/services/`.

---

## ❌ CÓDIGO QUE EL AGENTE NUNCA ESCRIBE NI MODIFICA

- **Supabase**: Conexiones, `createClient()`, `supabase.from()`, mutaciones.
- **API Queries / Fetching**: `fetch()`, `axios`, llamadas GraphQL.
- **Data Fetching Hooks**: `useEffect` que consulte eventos, hooks personalizados de fetching.
- **Estado Global / Contexto**: `createContext()`, `useContext()`.
- **Validaciones de datos**: Sanitización o chequeo de formato de base de datos.
- **Nuevos campos de base de datos**: No agregar ni inventar campos que no existan.
- **Scrapers o scripts de sincronización**.

---

## ✅ ARCHIVOS Y ACCIONES PERMITIDAS (SOLO UI/UX)

### Componentes de Interfaz:
- `src/components/EventosPopup.tsx`
- `src/components/Sidebar.tsx`
- `src/components/FilterPanel.tsx`
- `src/App.tsx` (exclusivamente la estructura visual/JSX, nunca la lógica de datos)

### Estilos y Diseño:
- `src/App.css`
- `src/index.css`
- `src/styles/*`
- Clases de Tailwind CSS, diseño responsivo (mobile, tablet, desktop), animaciones, paletas de colores, temas dark/light, microinteracciones y accesibilidad.
