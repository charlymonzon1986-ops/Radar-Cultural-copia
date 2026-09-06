# 👨‍💻 Developer Guidelines - Radar Cultural

## Para Google AI Studio (v0)

Este documento explica **qué puede hacer y qué NO puede hacer** Google AI Studio (v0) en Radar Cultural.

### 🎯 ¿Qué es v0?
[Google AI Studio](https://studio.google.com) es una herramienta que genera código UI/UX sin que escribas código manualmente. Puedes:
- Decirle "mejora el diseño del popup de eventos"
- Decirle "haz responsive el mapa en mobile"
- Decirle "cambia los colores de la app"

Y v0 genera automáticamente el código TypeScript/CSS.

### ⚠️ IMPORTANTE
**v0 solo debe editar UI/UX**. NO debe tocar:
- Base de datos (Supabase)
- Variables de entorno (.env)
- Configuración (vercel.json, tsconfig.json)
- Backend/lógica de datos

---

## 📖 Documentos de Restricciones

**Lee estos antes de usar v0:**

1. **[V0_RESTRICTIONS_README.md](./V0_RESTRICTIONS_README.md)** ← COMIENZA AQUÍ
   - Guía rápida de qué sí y qué no
   - Ejemplos prácticos
   - Checklist antes de pushear

2. **[v0-restrictions.json](./v0-restrictions.json)**
   - Referencia técnica completa
   - Todos los archivos prohibidos
   - Patrones de código que NO escribir

---

## 🚀 Flujo para usar v0

### Paso 1: Abre Google AI Studio
Ve a https://studio.google.com

### Paso 2: Conecta el repo
Importa: `charlymonzon1986-ops/Radar-Cultural-copia`

### Paso 3: Lee las restricciones
Abre [V0_RESTRICTIONS_README.md](./V0_RESTRICTIONS_README.md)

### Paso 4: Elige una tarea de UI
Ejemplo:
- "Mejora el diseño del popup de eventos"
- "Haz responsive el sidebar en mobile"
- "Cambia los colores de la app"

### Paso 5: v0 genera el código
v0 edita SOLO:
- `src/components/EventosPopup.tsx`
- `src/components/Sidebar.tsx`
- `src/App.css`
- Otros archivos TypeScript/CSS de UI

### Paso 6: Verifica antes de pushear
✅ ¿Edité solo archivos de UI/CSS?
✅ ¿NO toqué espacios.ts, .env, vercel.json?
✅ ¿Funciona el preview en v0?

### Paso 7: Pushea a GitHub
v0 pushea automáticamente → Vercel redeploy → ¡Cambios en vivo!

---

## ✅ QUÉ PUEDE HACER v0

```
✅ Cambiar colores, fonts, tamaños
✅ Reordenar elementos visuales
✅ Agregar animaciones
✅ Mejorar responsive (mobile, tablet, desktop)
✅ Crear cards, buttons, inputs bonitos
✅ Agregar temas (light/dark mode)
✅ Mejorar accesibilidad
✅ Rediseñar componentes visuales
```

---

## ❌ QUÉ NUNCA PUEDE HACER v0

```
❌ Tocar Supabase o queries de datos
❌ Modificar espacios.ts (lista de venues)
❌ Cambiar .env, vercel.json, tsconfig.json
❌ Agregar/modificar package.json
❌ Crear APIs o scrapers
❌ Cambiar lógica de data fetching
❌ Modificar rutas de importe críticas
```

---

## 📞 Coordinación entre Claude y v0

### Si Claude dice:
"Acabo de cargar 10 eventos nuevos en Supabase"

### Entonces v0 puede:
"Mejoro cómo se muestran esos 10 eventos en el popup"

### Si v0 quiere:
"Agregar campo 'precio' en el popup"

### Entonces Claude:
"Agrego campo 'precio' a Supabase, luego v0 lo muestra"

---

## 🚨 Checklist Antes de Pushear

```
☑️ ¿Edité SOLO archivos de componentes o CSS?
☑️ ¿NO toqué espacios.ts?
☑️ ¿NO toqué .env, vercel.json, tsconfig.json?
☑️ ¿NO agregué código de Supabase?
☑️ ¿Preview funciona en v0?
☑️ ¿Es solo cambios visuales?
```

Si alguno es "NO" → NO PUSHEES, pregunta primero

---

## 🎯 Ejemplo Real

### Tarea: "Mejorar el popup de eventos"

**v0 puede hacer:**
1. Abre `src/components/EventosPopup.tsx`
2. Cambia el diseño:
   - Imagen del evento arriba
   - Título más grande
   - Descripción con mejor formato
   - Botón de entrada más destacado
3. Agrega colores por categoría
4. Mejora tipografía y espaciado
5. Pushea a GitHub

**Resultado:** Popup más bonito, mismos datos ✅

---

## 💡 Consejos

- **Siempre previsualiza** antes de pushear
- **Usa componentes existentes** en lugar de crear nuevos
- **Mantén consistencia** con el diseño actual
- **Cambios incrementales** (una cosa a la vez)
- **Si necesitas funcionalidad nueva**, pídele a Claude

---

## 📚 Archivos Importantes

```
PERMITIDOS (v0 puede editar):
├── src/components/EventosPopup.tsx
├── src/components/Sidebar.tsx
├── src/components/FilterPanel.tsx
├── src/App.tsx (solo UI)
└── src/*.css

PROHIBIDOS (v0 NUNCA toca):
├── src/components/espacios.ts ❌
├── .env ❌
├── vercel.json ❌
├── tsconfig.json ❌
├── package.json ❌
└── vite.config.ts ❌
```

---

## ❓ ¿Dudas?

1. **Lee [V0_RESTRICTIONS_README.md](./V0_RESTRICTIONS_README.md)**
2. **Lee [v0-restrictions.json](./v0-restrictions.json)**
3. **Pregúntale a Claude**
4. **NO lo hagas si no estás seguro**

---

**Última actualización:** 2026-09-06
