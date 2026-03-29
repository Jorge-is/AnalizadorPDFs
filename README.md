# RSL Analyzer — Analizador Semántico de PDFs

> Herramienta web para la extracción automática de metadatos y análisis de artículos científicos en PDF, orientada a Revisiones Sistemáticas de Literatura (RSL).

---

## 📋 Índice

- [Descripción](#descripción)
- [Características](#características)
- [Tecnologías](#tecnologías)
- [Estructura del proyecto](#estructura-del-proyecto)
- [Instalación y configuración](#instalación-y-configuración)
- [Arranque del servidor](#arranque-del-servidor)
- [Uso de la aplicación](#uso-de-la-aplicación)
- [Variables de entorno](#variables-de-entorno)

---

## Descripción

**RSL Analyzer** permite a investigadores y estudiantes subir artículos científicos en PDF y extraer automáticamente sus datos clave: título, autores, año, tema, país, palabras clave y un resumen generado por IA (Google Gemini). Los resultados se almacenan en una base de datos, se pueden visualizar en tablas interactivas y exportar a Excel. La página de estadísticas ofrece gráficos analíticos sobre toda la colección.

---

## Características

- 🔐 **Autenticación** — Registro e inicio de sesión por usuario. Cada usuario tiene su colección privada.
- 📂 **Gestión de archivos** — Subida, listado y eliminación de PDFs desde el panel lateral.
- ⚡ **Extracción con IA** — Procesamiento en segundo plano con Celery + Redis. La IA (Gemini 2.0 Flash) genera resúmenes y detecta el país del artículo.
- 📋 **Sesión actual** — Vista de los artículos procesados en la sesión de trabajo activa, con opción de limpiar la sesión sin borrar el historial.
- 🗂️ **Historial completo** — Página dedicada con todos los artículos procesados con éxito.
- ☑️ **Selección de filas** — Checkbox por fila y checkbox maestro para exportar subconjuntos de datos.
- 👁️ **Columnas visibles** — Toggles para mostrar/ocultar columnas. Por defecto: Título, Autores, Año, Tema y País.
- 📊 **Estadísticas visuales** — 4 KPI cards + 5 gráficos (barras por año, donut por país, ranking de países, tendencia acumulada, mapa coroplético).
- ⬇️ **Exportar a Excel** — Genera un `.xlsx` con las filas y columnas seleccionadas, con estilos.
- 🌙 **Diseño dark profesional** — Sistema de diseño con CSS Custom Properties, tipografía Space Grotesk, completamente responsive.

---

## Tecnologías

| Capa | Tecnología |
|---|---|
| Backend | Python 3, Flask 3, Flask-Login, Flask-SQLAlchemy |
| Base de datos | SQLite (desarrollo) |
| Colas de tareas | Celery + Redis |
| IA / OCR | Google Gemini 2.0 Flash (`google-genai`) |
| Extracción PDF | PyMuPDF (`fitz`) |
| Exportación | openpyxl |
| Frontend | HTML5, CSS3 (Custom Properties + BEM), JavaScript ES2020 |
| Gráficos | Chart.js 4 + chartjs-chart-geo 4 |
| Infraestructura | Docker (Redis), venv |

---

## Estructura del proyecto

```
AnalizadorPDFs/
│
├── main.py                        # Punto de entrada de Flask
├── config.py                      # Configuración (DB, Celery, rutas)
├── models.py                      # Modelos SQLAlchemy (User, Collection, Article)
├── tasks.py                       # Tareas Celery (procesar_pdf_background)
├── make_celery.py                 # Inicialización de Celery con contexto Flask
├── celery_worker.py               # Entrada del worker Celery
├── .env                           # Variables de entorno (no incluir en git)
│
├── controllers/
│   ├── auth_controller.py         # Rutas: /login, /register, /logout
│   ├── main_controller.py         # Rutas: /, /historial, /estadisticas, /buscar, etc.
│   └── export_controller.py       # Rutas: /exportar_excel, /descargar_excel
│
├── services/
│   ├── pdf_service.py             # Extracción de texto + llamadas a Gemini
│   └── file_service.py            # Guardado seguro de archivos (anti path-traversal)
│
├── templates/
│   ├── partials/                  # Fragmentos reutilizables (include)
│   │   ├── _header.html
│   │   ├── _footer.html
│   │   └── _flash_messages.html
│   ├── auth/
│   │   ├── login.html
│   │   └── register.html
│   └── main/
│       ├── index.html             # Sesión actual
│       ├── historial.html         # Historial completo
│       └── estadisticas.html      # Gráficos y KPIs
│
├── static/
│   ├── style.css                  # Sistema de diseño completo (CSS Custom Properties + BEM)
│   ├── assets/
│   │   └── logo.png
│   └── js/
│       ├── file-manager.js        # Clase GestorArchivos (subida, lista, extracción)
│       ├── table.js               # Visibilidad de columnas + selección de filas
│       ├── export.js              # Exportación a Excel (fetch + descarga)
│       └── estadisticas.js        # 5 gráficos Chart.js + KPI cards
│
├── uploads/                       # PDFs subidos (generado automáticamente)
├── instance/
│   └── app.db                     # Base de datos SQLite
└── requirements.txt
```

---

## Instalación y configuración

### 1. Clonar el repositorio

```bash
git clone <url-del-repo>
cd AnalizadorPDFs
```

### 2. Crear y activar el entorno virtual

```bash
python -m venv venv

# Windows
venv\Scripts\activate

# Linux / macOS
source venv/bin/activate
```

### 3. Instalar dependencias

```bash
pip install -r requirements.txt --break-system-packages
```

### 4. Configurar variables de entorno

Crea un archivo `.env` en la raíz del proyecto:

```env
GEMINI_API_KEY=tu_api_key_de_google_gemini
SECRET_KEY=una_clave_secreta_segura
CELERY_BROKER_URL=redis://localhost:6379/0
CELERY_RESULT_BACKEND=redis://localhost:6379/0
```

> **Obtener una API Key de Gemini:** ve a [Google AI Studio](https://aistudio.google.com/app/apikey) y crea una clave gratuita.

### 5. Levantar Redis con Docker

```bash
docker run -d -p 6379:6379 --name redis-rsl redis:alpine
```

Verificar que Redis responde:

```bash
docker exec -it redis-rsl redis-cli ping
# Debe responder: PONG
```

---

## Arranque del servidor

Necesitas **3 terminales** abiertas simultáneamente:

### Terminal 1 — Redis (Docker)
```bash
docker start redis-rsl
```

### Terminal 2 — Worker de Celery
```bash
# Desde la raíz del proyecto, con el venv activado:
celery -A celery_worker worker --pool=solo --loglevel=info
```

> ⚠️ `--pool=solo` es obligatorio en Windows. En Linux puedes omitirlo o usar `--pool=prefork`.

### Terminal 3 — Flask
```bash
python main.py
```

La aplicación quedará disponible en: **http://127.0.0.1:5000**

---

## Uso de la aplicación

1. **Regístrate** en `/register` o inicia sesión en `/login`.
2. En **Sesión Actual** (`/`), haz clic en la zona de subida para cargar uno o varios PDFs.
3. Pulsa **⚡ Extraer Datos** — las tareas se encolan en Celery y el worker las procesa en segundo plano.
4. Recarga la página para ver los resultados en la tabla.
5. Usa los **toggles de columnas** para mostrar u ocultar campos.
6. Marca **filas individuales** (o usa el checkbox maestro para seleccionar todas) antes de exportar.
7. Pulsa **⬇️ Exportar Excel** para descargar el `.xlsx` con los datos seleccionados.
8. En **Historial** (`/historial`) puedes ver todos los artículos procesados y buscar por título.
9. En **Estadísticas** (`/estadisticas`) explora los gráficos: distribución por año, países, tendencia acumulada y mapa mundial.
10. Usa **🧹 Limpiar Sesión** para vaciar la vista actual sin borrar el historial permanente.

---

## Variables de entorno

| Variable | Descripción | Ejemplo |
|---|---|---|
| `GEMINI_API_KEY` | Clave de API de Google Gemini | `AIzaSy...` |
| `SECRET_KEY` | Clave secreta para sesiones Flask | `mi-clave-segura-2025` |
| `CELERY_BROKER_URL` | URL del broker de mensajes (Redis) | `redis://localhost:6379/0` |
| `CELERY_RESULT_BACKEND` | URL del backend de resultados Celery | `redis://localhost:6379/0` |

---

*Proyecto académico — Universidad Tecnológica del Perú (UTP) · 2025*
