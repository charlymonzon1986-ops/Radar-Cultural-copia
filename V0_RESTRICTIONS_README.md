# 🚨 RESTRICCIONES PARA GOOGLE AI STUDIO (v0) - RADAR CULTURAL

## ⚡ REGLA DE ORO
```
v0 SOLO edita UI/UX - NUNCA toca datos, backend, ni configuración
Si lo haces, rompes el proyecto
```

---

## ✅ ARCHIVOS QUE v0 PUEDE EDITAR (SEGURO)

### Componentes React (Seguro cambiar diseño):
- `src/components/EventosPopup.tsx` — Popup de eventos
- `src/components/Sidebar.tsx` — Filtros y navegación
- `src/components/FilterPanel.tsx` — Panel de filtrado
- `src/App.tsx` — **SOLO la parte visual, nunca data fetching**

### Estilos (Seguro cambiar colores, fonts, layouts):
- `src/App.css` — Estilos de la app
- `src/index.css` — Estilos globales
- `src/styles/*` — Cualquier archivo CSS

### Qué puede hacer:
✅ Cambiar colores, fonts, tamaños  
✅ Reordenar elementos visuales  
✅ Agregar animaciones, transiciones  
✅ Mejorar responsive (mobile, tablet, desktop)  
✅ Crear cards, buttons, inputs bonitos  
✅ Agregar temas (light/dark mode)  
✅ Mejorar accesibilidad  

---

## ❌ ARCHIVOS QUE v0 NUNCA TOCA (CRÍTICOS)

| Archivo | Razón | Si lo toca |
|---------|-------|-----------|
| `src/components/espacios.ts` | Base de datos de venues | ☠️ Se pierden todos los pines |
| `.env` | Credenciales | ☠️ No conecta a Supabase |
| `.env.local` | Config local | ☠️ Rompe desarrollo local |
| `vercel.json` | Config de deploy | ☠️ El deploy falla |
| `tsconfig.json` | Config TypeScript | ☠️ Errores de compilación |
| `package.json` | Dependencias | ☠️ Conflictos de versiones |
| `.gitignore` | Config de Git | ☠️ Pushea archivos prohibidos |
| `vite.config.ts` | Config de build | ☠️ La app no compila |

---

## ❌ CÓDIGO QUE v0 NUNCA ESCRIBE

### Aunque lo vea en el proyecto, NO lo modifica:

```javascript
❌ Supabase conexiones
   createClient(), supabase.from()

❌ API queries/mutations
   fetch(), axios calls, GraphQL

❌ Data fetching hooks
   useEffect(() => fetch eventos)

❌ Context/Estado global
   createContext(), useContext()

❌ Custom hooks de datos
   useEventos(), useFecthData()

❌ Validaciones de datos
   Data sanitization, format checking
```

---

## 🗂️ RESTRICCIONES POR CARPETA

### `/src/components/`
- ✅ EventosPopup.tsx — SEGURO
- ✅ Sidebar.tsx — SEGURO
- ✅ FilterPanel.tsx — SEGURO
- ❌ espacios.ts — **NUNCA TOCAR**
- ❌ Otros componentes que usen Supabase — **NUNCA TOCAR**

### `/src/`
- ✅ *.css — SEGURO
- ❌ `/lib/` — **NUNCA TOCAR** (funciones de utilidad)
- ❌ `/hooks/` — **NUNCA TOCAR** (data fetching)
- ❌ `/services/` — **NUNCA TOCAR** (APIs y Supabase)

### `/` (raíz del proyecto)
- ❌ .env — **NUNCA TOCAR**
- ❌ vercel.json — **NUNCA TOCAR**
- ❌ tsconfig.json — **NUNCA TOCAR**
- ❌ package.json — **NUNCA TOCAR**

---

## ⚡ FLUJO CORRECTO PARA v0

```
1. Entra a v0 (Google AI Studio)
   ↓
2. Selecciona UNA tarea de UI
   (ej: "Mejorar popup de eventos")
   ↓
3. Edita SOLO: src/components/*.tsx y src/*.css
   ↓
4. Previsualiza en v0
   ↓
5. Pushea a GitHub main
   ↓
6. Vercel redeploy automático (30-60 seg)
   ↓
7. Cambios en radarcultural.vercel.app ✅
```

---

## 📞 SI v0 QUIERE HACER ALGO NO PERMITIDO

### Situación:
v0 ve que necesita modificar algo fuera de su scope

### Qué hacer:
```
1. NO lo hace directamente
2. Le pregunta a Claude:
   "Necesito acceso a X para poder hacer Y"
3. Claude lo agrega al backend si es seguro
4. v0 usa el nuevo componente/función
5. Profit ✅
```

### Ejemplo:
```
v0: "Quiero mostrar precio en el popup de eventos"
Claude: "Voy a agregar campo 'precio' a Supabase"
v0: "Ahora edito EventosPopup.tsx para mostrar el precio"
Result: Cambio seguro en ambos lados ✅
```

---

## 🚨 CHECKLIST ANTES DE PUSHEAR

Antes de que v0 pushee cambios, verificar:

```
☑️ ¿Edité SOLO archivos de componentes o CSS?
☑️ ¿NO toqué espacios.ts?
☑️ ¿NO toqué .env, vercel.json, tsconfig.json?
☑️ ¿NO agregué código de Supabase?
☑️ ¿NO cambié lógica de data fetching?
☑️ ¿Preview funciona en v0?
☑️ ¿Es solo cambios visuales?
```

**Si alguno es NO:** No pushees, preguntale a Claude primero

---

## ✅ EJEMPLOS DE TAREAS SEGURAS

```
✅ Cambiar el color del popup de eventos
✅ Hacer el sidebar collapsible en mobile
✅ Agregar animaciones a los pines
✅ Mejorar estilos de buttons y inputs
✅ Crear tema dark mode
✅ Mejorar responsive del mapa
✅ Rediseñar el FilterPanel
✅ Agregar íconos a los eventos
✅ Mejorar accesibilidad (contraste, font size)
✅ Cambiar tipografía de la app
```

---

## ❌ EJEMPLOS DE TAREAS PROHIBIDAS

```
❌ Agregar nuevos campos de eventos (eso es DB)
❌ Modificar espacios.ts (lista de venues)
❌ Cambiar cómo se traen datos de Supabase
❌ Crear nuevas APIs
❌ Modificar .env o vercel.json
❌ Cambiar tsconfig.json o package.json
❌ Hacer scrapers de datos
❌ Modificar lógica de filtrado (eso es backend)
❌ Cambiar rutas de importe críticas
```

---

## 🎯 RESUMEN

| Concepto | Descripción |
|----------|-------------|
| **v0 es** | Frontend developer - UI/UX specialist |
| **v0 maneja** | Componentes React, CSS, animaciones, responsive |
| **v0 nunca toca** | Supabase, backend, config, datos |
| **v0 recibe datos de** | El código React existente que Claude mantiene |
| **v0 es seguro para** | Cambiar cómo se ven las cosas |
| **v0 NUNCA cambia** | Qué datos hay o de dónde vienen |
| **Si tiene dudas** | Preguntale a Claude, no hagas nada |

---

## 🔐 PROTECCIÓN DEL PROYECTO

Este archivo existe para:
1. ✅ Evitar que v0 rompa cosas accidentalmente
2. ✅ Mantener separadas responsabilidades (backend ≠ frontend)
3. ✅ Proteger la base de datos de modificaciones no autorizadas
4. ✅ Garantizar que Vercel siga desplegando correctamente
5. ✅ Mantener el código limpio y mantenible

---

**¿Preguntas? Preguntale a Claude, no lo hagas solo.**
