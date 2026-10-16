# 📡 Radar Cultural — Sistema de Scraping y Sincronización Automática

Sistema automatizado de recolección de eventos culturales con validación estricta anti-alucinaciones, sincronización segura con Supabase y reporte interactivo por Telegram.

---

## 🔒 Reglas Críticas Implementadas

1. **Protección Absoluta de Instagram**: NUNCA se modifica `instagram_url` ni campos de redes en ninguna inserción o actualización.
2. **Circuit Breaker (>20 borrados)**: Si una corrida va a eliminar más de 20 eventos vencidos, el proceso aborta el borrado automáticamente y envía una alerta roja a Telegram para confirmación manual.
3. **Validación Estricta Anti-Alucinación**:
   - El título debe figurar literalmente en el texto de la fuente.
   - La fecha debe ser futura (dentro de los próximos 12 meses) o convención `'2026-01-01'` para eventos permanentes/recurrentes.
   - La `fuente_url` debe responder con HTTP 200.
   - El venue debe existir previamente en la tabla `lugares` de Supabase.
   - Lo que no califica pasa a la lista de **dudosos** y jamás toca la base de datos.
4. **Estado Inicial**: Todo evento nuevo ingresa con `estado = 'pendiente'` y requiere aprobación.
5. **Cálculo Dinámico**: `es_proximo` se calcula automáticamente (`true` si ocurre dentro de los próximos 7 días).

---

## 📁 Estructura del Módulo

```
scripts/scraper/
├── lib/
│   ├── scraper.js       # Extractores por venue (JSON-LD y Cheerio)
│   ├── validator.js     # Motor de validación estricta
│   ├── database.js      # Diff de eventos, inserción, actualización y circuito de seguridad
│   └── telegram.js      # Reporte diario y botones inline de aprobación
├── venues.config.json   # Configuración declarativa de venues y selectores
├── index.js             # Punto de entrada CLI (soporta --dry-run)
├── telegram-bot.js      # Listener de callbacks (Aprobar / Rechazar desde Telegram)
└── package.json         # Dependencias aisladas (no altera la app web)
```

---

## 🚀 Uso Local

### 1. Variables de Entorno (Opcional para pruebas locales)
Crea un archivo `.env` dentro de `scripts/scraper/` (este archivo está ignorado por git):

```env
SUPABASE_URL=https://boeurmldeqvcaikdhtvy.supabase.co
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key_aqui
TELEGRAM_BOT_TOKEN=tu_telegram_bot_token_aqui
TELEGRAM_CHAT_ID=tu_chat_id_aqui
```

### 2. Ejecutar en Modo Simulación (`--dry-run`)
Extrae y valida los eventos de los venues, comparando con la base pero **sin escribir ni borrar nada**:

```bash
cd scripts/scraper
npm run dry-run
```

### 3. Ejecutar en Producción
```bash
cd scripts/scraper
npm start
```

### 4. Escuchador de Telegram para Aprobaciones
Para procesar los clics en **✅ Aprobar** o **❌ Rechazar** desde Telegram:

```bash
cd scripts/scraper
node telegram-bot.js
```

---

## ⚙️ Automatización en GitHub Actions

El workflow en `.github/workflows/scraper.yml` se ejecuta diariamente a las 08:00 AM hora de Argentina (11:00 UTC) o manualmente con el botón *Run workflow*.

### Secrets requeridos en el repositorio de GitHub:
1. `SUPABASE_URL`: `https://boeurmldeqvcaikdhtvy.supabase.co`
2. `SUPABASE_SERVICE_ROLE_KEY`: Tu clave de rol de servicio (desde Supabase Dashboard -> Project Settings -> API).
3. `TELEGRAM_BOT_TOKEN`: Token proporcionado por `@BotFather`.
4. `TELEGRAM_CHAT_ID`: Tu ID de chat o canal de Telegram.
