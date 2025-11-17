# Arquitectura completa — StreamDeck-like (Bun + SQLite + Astro + Vue)

Este documento describe una **arquitectura completa** para una alternativa web a StreamDeck, usando **Bun** (daemon local), **SQLite** (persistencia), **Astro + Vue** (frontend), y cubriendo funcionalidades habituales: perfiles, páginas, botones, acciones, plugins, assets, sincronización en tiempo real, seguridad y empaquetado.

---

## Índice

1. Visión general y objetivos
2. Componentes principales
3. Flujo de datos y comunicación
4. Modelo de datos (SQLite)
5. Estructura de ficheros del proyecto
6. API HTTP y WebSocket (endpoints principales)
7. Sistema de plugins
8. Gestión de perfiles y páginas
9. Tipos de acciones y ejecución
10. Assets, iconos y cache
11. Seguridad y sandboxing
12. Integración con hardware (HID / Microcontroladores)
13. Arranque/servicio e instalación
14. CLI y herramientas dev
15. Tests, CI/CD y packaging
16. Roadmap y mejoras opcionales
17. Ejemplos y snippets

---

## 1. Visión general y objetivos

Crear una aplicación local que exponga una UI web (panel) para gestionar botones programables similares a StreamDeck. Debe permitir:

* Perfiles y páginas (layouts) por dispositivo o usuario.
* Botones con estado (toggle, momentary, multi-state).
* Acciones: ejecutar comandos, scripts, multimedia, atajos, HTTP, integración con apps (OBS, Spotify, Discord), macros.
* Plugins: extensible con paquetes JS que añaden acciones, UI y recursos.
* Sincronización en tiempo real entre daemon y frontend (WebSockets).
* Persistencia robusta en SQLite.
* Almacenamiento de assets (icons, imágenes) en disco.
* Opcional: soporte para hardware físico conectado por USB/HID o microcontroladores vía red.

Pilares: rendimiento, seguridad (sandboxing de plugins), portabilidad (Windows/Mac/Linux), facilidad de backup/restore.

---

## 2. Componentes principales

* **Daemon (Bun)**: servidor local que maneja: API REST, WebSocket, ejecutor de acciones, manager de plugins, acceso a hardware, persistencia.
* **Base de datos (SQLite)**: almacenamiento de configuración, perfiles, registros y metadatos.
* **Almacenamiento en disco**: carpeta `data/` con assets, DB, logs y plugins instalados.
* **Frontend (Astro + Vue)**: UI de administración y panel en tiempo real. Componentes interactivos (editor de botones, gestor de perfiles, tienda de plugins local).
* **Plugins**: paquetes instalables (ZIP / carpeta) con manifest y código JS (sandboxed por el daemon).
* **CLI**: para instalar, iniciar/stop, export/import perfiles y empaquetado.

---

## 3. Flujo de datos y comunicación

* Frontend ↔ Bun: REST para operaciones CRUD, WebSocket para eventos en tiempo real (botón presionado, estado de ejecución, cambios en perfiles).
* Bun ↔ Plugins: IPC interno (módulo loader) que ejecuta código del plugin en un entorno controlado.
* Bun ↔ Hardware: acceso directo a HID o comunicación con microcontroladores por HTTP/WebSocket.
* Persistencia: Bun escribe/lee SQLite y archivos en `data/`.

---

## 4. Modelo de datos (SQLite)

Tablas principales y campos sugeridos (simplificado):

```sql
CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT
);

CREATE TABLE IF NOT EXISTS profiles (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  created_at INTEGER,
  updated_at INTEGER,
  data JSON -- layout, metadata
);

CREATE TABLE IF NOT EXISTS pages (
  id TEXT PRIMARY KEY,
  profile_id TEXT,
  name TEXT,
  order_idx INTEGER,
  data JSON,
  FOREIGN KEY(profile_id) REFERENCES profiles(id)
);

CREATE TABLE IF NOT EXISTS buttons (
  id TEXT PRIMARY KEY,
  page_id TEXT,
  position INTEGER,
  data JSON,
  FOREIGN KEY(page_id) REFERENCES pages(id)
);

CREATE TABLE IF NOT EXISTS plugins (
  id TEXT PRIMARY KEY,
  name TEXT,
  version TEXT,
  manifest JSON,
  enabled INTEGER DEFAULT 1,
  installed_at INTEGER
);

CREATE TABLE IF NOT EXISTS assets (
  id TEXT PRIMARY KEY,
  path TEXT,
  hash TEXT,
  size INTEGER,
  created_at INTEGER
);

CREATE TABLE IF NOT EXISTS logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  level TEXT,
  message TEXT,
  meta JSON,
  ts INTEGER
);
```

* **Notas**: `data JSON` permite evolución flexible del esquema (ej. acciones múltiples por botón, states, colores, animaciones).

---

## 5. Estructura de ficheros del proyecto

```
project-root/
├─ daemon/                    # Bun backend
│  ├─ src/
│  │  ├─ server.ts
│  │  ├─ api/
│  │  ├─ ws.ts
│  │  ├─ plugin-loader.ts
│  │  ├─ action-runner.ts
│  │  ├─ hw-driver/
│  │  └─ db.ts
│  ├─ bunfig.toml
│  └─ package.json
├─ web/                       # Astro + Vue frontend
│  ├─ src/
│  │  ├─ pages/
│  │  ├─ components/
│  │  └─ store/
│  └─ astro.config.mjs
├─ data/                      # runtime data (no subir a repo)
│  ├─ db.sqlite
│  ├─ assets/
│  ├─ plugins/
│  └─ logs/
├─ cli/                       # scripts de instalación/packaging
├─ docs/
└─ README.md
```

---

## 6. API HTTP y WebSocket (endpoints principales)

### REST (ejemplos)

* `GET /api/v1/profiles` — lista perfiles
* `GET /api/v1/profiles/:id` — perfil
* `POST /api/v1/profiles` — crear perfil
* `PUT /api/v1/profiles/:id` — actualizar perfil
* `DELETE /api/v1/profiles/:id` — borrar perfil
* `GET /api/v1/plugins` — lista plugins
* `POST /api/v1/plugins/install` — subir/instalar plugin (zip o carpeta)
* `POST /api/v1/assets` — subir icono/asset
* `POST /api/v1/actions/execute` — ejecutar acción desde UI (body: action descriptor)
* `GET /api/v1/health` — estado del daemon

### WebSocket

Usar un canal de eventos con mensajes tipados JSON:

* `event: profile.updated` — payload: perfil cambiado
* `event: button.pressed` — payload: { buttonId, pageId, ts }
* `event: action.started` / `action.finished` / `action.error`
* `event: plugin.installed` / `plugin.enabled`

Permitir al frontend suscribirse a topics concretos para optimizar.

---

## 7. Sistema de plugins

### Objetivos

* Permitir a terceros añadir nuevas acciones, UI en el panel de administración y hooks (ej. cuando se presiona un botón).
* Mantener seguridad: plugins no deben ejecutar código arbitrario con privilegios del sistema sin control.

### Formato de plugin

Estructura mínima del paquete:

```
my-plugin/
├─ manifest.json
├─ main.js        # entry para el daemon (node-style exports)
├─ ui/            # opcional: componentes Vue para el panel
├─ assets/
└─ README.md
```

`manifest.json` ejemplo:

```json
{
  "id": "com.miempresa.mi-plugin",
  "name": "Mi Plugin",
  "version": "1.0.0",
  "permissions": ["exec","fs","network"],
  "actions": [
    {"id": "say-hello", "name": "Decir Hola", "schema": {"message":"string"}}
  ]
}
```

### Loader y ciclo de vida

* **Instalación**: el daemon mueve la carpeta zip a `data/plugins/<id>@<version>/` y registra en DB.
* **Registro**: el daemon lee `manifest.json` y registra acciones/hooks.
* **Runtime**: cuando se ejecuta una acción del plugin, el daemon llama al entry `main.js` en un entorno sandbox.
* **Sandboxing**: ejecutar plugins en workers aislados (si Bun los soporta) o en subprocesos con comunicación por IPC. Limitar permisos (ej: no permitir `fs` salvo rutas aprobadas).

### API interna para plugins

Proveer una API controlada que los plugins puedan usar:

* `emitEvent(eventName, payload)` — comunicar al daemon
* `callAction(name, args)` — invocar otras acciones
* `getSetting(key)` / `setSetting(key, value)` — persistencia propia del plugin
* `http.request()` — con whitelist de dominios si procede

### Firmado/Marketplace

Si piensas distribuir: firmar plugins y ofrecer una tienda integrada que verifique firmas.

---

## 8. Gestión de perfiles y páginas

* **Perfil** = conjunto de páginas, settings, bindings (por ejemplo: "Streaming", "Edición", "Atajos").
* **Página** = layout de botones (ej. 3x5) con orden y meta.
* **Botón** contiene:

  * id
  * label
  * icon (asset id o URL)
  * action(s): lista de acciones ejecutables (secuencia)
  * state: momentary/toggle/multistate
  * cooldown/debounce
  * visibility rules (ej. solo cuando app X esté activa)

Permitir import/export de perfiles como JSON para compartir.

---

## 9. Tipos de acciones y ejecución

Acciones comunes:

* `shell` — ejecutar comando/shell script
* `script` — ejecutar JS sandboxed (plugin)
* `hotkey` — simular combinación de teclas (requiere permisos y libs nativas)
* `multimedia` — play/pause, volumen
* `obs` — llamadas a OBS WebSocket (plugin)
* `http` — llamada HTTP
* `sequence` — ejecutar varias acciones en orden con delays
* `toggle` — alternar estado (ej. mic on/off)

Ejecución:

* Validar la acción (permission, cooldown)
* Emitir `action.started` por WS
* Ejecutar en contexto seguro
* Emitir `action.finished|error` con resultado

Registro y metrics: trackear duración, éxitos/errores, últimas veces ejecutadas.

---

## 10. Assets, iconos y cache

* Carpeta `data/assets/` donde el daemon guarda los archivos subidos (nombres con hash para evitar colisiones).
* Metadatos en tabla `assets` (hash, path, origin).
* Servir assets mediante endpoint estático con headers `cache-control` versionados.
* Opcional: soporte para SVG dinámicos y composición (texto + icono) desde server.

---

## 11. Seguridad y sandboxing

* **Plugins**: ejecutar en procesos separados con permisos mínimos. Lista blanca de APIs (storage limitado a `data/plugins/<id>`). No ejecutar `eval` en el daemon.
* **Acciones shell**: marcar como peligrosas; pedir confirmación del usuario o permitir solo scripts firmados.
* **CSRF / CORS**: daemon debe aceptar conexiones sólo desde `localhost` por defecto. Habilitar origin-check para el frontend y usar tokens para la UI remota.
* **Autenticación**: opcionalmente proteger el panel con contraseña o token para acceder desde otra máquina.
* **Actualizaciones**: firmar actualizaciones y verificar checksum.

---

## 12. Integración con hardware (HID / Microcontroladores)

### USB HID (hardware estilo StreamDeck)

* Usar librería nativa que permita enumerar dispositivos HID y leer eventos.
* Daemon mapea cada dispositivo a una entidad `device` y publica events vía WS al frontend.
* Exponer API para escribir a pantalla (si tiene) o para controlar LEDs.

### Microcontroladores (ESP32, Raspberry Pico)

* Recomendado: dispositivo expone WebSocket/HTTP y el daemon se conecta como cliente.
* Ventaja: no necesitas permisos nativos; puedes usar WiFi.

---

## 13. Arranque/servicio e instalación

* Proveer instaladores/paquetes por plataforma que instalen daemon como servicio (systemd en Linux, LaunchAgent en macOS, Windows Service).
* Opciones:

  * `--user` modo para un único usuario
  * `--system` modo system-wide
* Configurar auto-start y logs rotativos.

---

## 14. CLI y herramientas dev

**Objetivo:** proporcionar herramientas para administrar el daemon, manejar plugins, importar/exportar perfiles y facilitar el desarrollo (scaffolding, testing).

### Comandos propuestos (sdctl):

* `sdctl start` — inicia el daemon en primer plano.
* `sdctl stop` — detiene el servicio.
* `sdctl restart` — reinicia el daemon.
* `sdctl status` — muestra el estado, PID y puerto.
* `sdctl install-plugin <path|url>` — instala un plugin desde disco o URL.
* `sdctl uninstall-plugin <plugin-id>` — desinstala un plugin.
* `sdctl enable-plugin <plugin-id>` / `sdctl disable-plugin <plugin-id>` — activa/desactiva plugin.
* `sdctl export-profile <id> -o file.json` — exporta perfil a JSON.
* `sdctl import-profile file.json` — importa perfil de JSON.
* `sdctl backup --out backup.zip` — empaqueta `data/` (DB, assets, plugins) en un ZIP.
* `sdctl migrate` — aplica migrations DB (si se usan esquemas evolutivos).
* `sdctl logs --follow` — stream de logs del daemon.

### Herramientas dev

* **Scaffold**: `sdctl create-plugin <plugin-id>` genera esqueleto de plugin con `manifest.json`, `main.js` y ejemplos de acciones.
* **Linting**: reglas para plugins (eslint config, schema validation del manifest).
* **Tests**: utilidades para testear actions/plugins en un runner de pruebas (mocks de API interna del daemon).
* **Watcher**: modo desarrollo que recarga el plugin al guardar cambios.

---

## 15. Tests, CI/CD y packaging

**Testing**:

* Unit tests para:

  * action-runner (simulación de acciones y manejo de errores).
  * plugin-loader (instalación, actualización, rollback).
  * DB layer (migrations y consultas críticas).
* Integration tests:

  * End-to-end del flow: crear perfil → asignar acciones → pulsar botón → verificar evento y resultado.
* E2E UI tests: Playwright para flujos clave (gestor de perfiles, editor de botones, instalación de plugins).

**CI/CD**:

* Pipeline habitual: `lint` → `test` → `build daemon` → `build web` → `package`.
* Ejecutar tests de plugins en sandbox en CI para evitar ejecución de código arbitrario en runners públicos.

**Packaging / Releases**:

* Generar instaladores por plataforma:

  * Linux: AppImage / deb / rpm
  * macOS: signed .dmg o homebrew formula
  * Windows: NSIS / MSI
* Releases contienen checksum y firma de los artefactos.
* Publicar en GitHub Releases y, si procede, en un repositorio propio para updates.

---

## 16. Roadmap y mejoras opcionales

**Corto plazo (MVP)**:

* Profiles / Pages / Buttons CRUD
* Ejecución de acciones: HTTP, shell (limitado), sequence
* WebSocket en tiempo real y panel básico en Astro+Vue
* Persistencia con SQLite y manejo básico de assets

**Medio plazo**:

* Sistema de plugins con sandboxing y API estable
* Integraciones oficiales (OBS, Spotify, Discord)
* Instaladores multiplataforma y servicio/daemon
* UI mejorada: tienda de plugins, editor visual de páginas (drag & drop)

**Largo plazo**:

* Sincronización en la nube y cuentas de usuario (opt-in)
* Marketplace con firma y pagos para plugins premium
* SDK para hardware y referencia de firmware para dispositivos físicos
* Mobile companion app y control remoto seguro

---

## 17. Ejemplos y snippets (extendido)

### Scaffold básico del daemon (estructura)

```text
daemon/
├─ src/
│  ├─ server.ts        # arranque, routing HTTP
│  ├─ ws.ts            # WebSocket handlers
│  ├─ db.ts            # conexión a sqlite
│  ├─ plugin-loader.ts # instalación y registry
│  ├─ action-runner.ts # execution core
│  └─ hw-driver/       # drivers HID / USB / network
└─ bunfig.toml
```

### Ejemplo de manifest.json (plugin)

```json
{
  "id": "com.ejemplo.saludo",
  "name": "Saludo",
  "version": "0.1.0",
  "author": "TuNombre",
  "permissions": ["emitEvent"],
  "actions": [
    {
      "id": "saludar",
      "name": "Saludar",
      "schema": {
        "type": "object",
        "properties": {
          "message": {"type": "string"}
        }
      }
    }
  ]
}
```

### Ejemplo mínimo main.js (plugin)

```js
// main.js (plugin)
export function register(api) {
  // api.onAction('saludar', handler)
  api.onAction('saludar', async ({ args, context }) => {
    const message = args.message || 'Hola desde plugin!';
    api.emitEvent('log', { message });
    return { ok: true, message };
  });
}
```

### Ejemplo de ejecución de acción desde el daemon

```ts
// action-runner.ts (simplified)
async function runAction(actionDescriptor) {
  // validar permisos, cooldown, etc.
  if (actionDescriptor.type === 'http') {
    const res = await fetch(actionDescriptor.url, { method: actionDescriptor.method || 'GET' });
    return { status: res.status };
  }
  if (actionDescriptor.type === 'shell') {
    // ejecutar en entorno controlado
    const { stdout, stderr } = Bun.spawnSync({ cmd: ["/bin/sh", "-c", actionDescriptor.cmd] });
    return { stdout: stdout.toString(), stderr: stderr.toString() };
  }
}
```

---

> Si necesitas, ahora puedo:

* generar el esqueleto del proyecto (scaffold) con archivos iniciales y un MVP funcional (daemon Bun + WebSocket + Astro/Vue panel básico), o
* crear un ejemplo completo de plugin con manifest, pruebas unitarias y su integración en el loader del daemon.

Dime cuál prefieres y lo creo (scaffold o plugin).

14. Configuración avanzada de acciones (Action Binding System)

Cada acción debe poder definirse con un sistema flexible que permita:

14.1. Tipos de acciones

Acciones simples: ejecutar un comando, abrir una URL, enviar una pulsación.

Acciones con parámetros: volumen +10, lanzar OBS escena X, enviar texto “Hola”.

Acciones reactivas: dependen de estado (mute ON → toggle).

Acciones con UI de configuración: los plugins añaden paneles de config.

14.2. Ciclo de vida de una acción

onInstall()

onLoad(deviceContext)

onPress(shortPress | longPress | repeat)

onHold(ticks)

onRelease()

onUnload()

Esto permite que una acción pueda ser compleja (como las de OBS o Spotify).

14.3. Parámetros dinámicos

Cada acción puede definir un schema.json con parámetros:

{
  "volume": { "type": "number", "min": 0, "max": 100 },
  "deviceId": { "type": "string" }
}


El panel web genera automáticamente formularios usando este schema.

14.4. Binding a teclas físicas o virtuales

Una acción puede:

estar en un “botón virtual” (web dashboard)

asociarse a una tecla física externa (HID, USB, MIDI)

15. Sistema de iconos

Cada acción, botón o perfil puede tener:

15.1. Iconos estáticos

PNG, SVG o WebP.

15.2. Iconos animados

GIF

APNG

WebP animado

Lottie (JSON) → renderizado en web & opcional en pantallas físicas

15.3. Iconos generados por el plugin

El plugin puede generar iconos on-demand:

iconos con indicadores de estado (audio peak, CPU usage)

iconos renderizados en canvas o SVG

15.4. Caching de iconos

Para eficiencia:

Cache en SQLite (BLOBs)

Cache en filesystem /cache/icons/

16. Integración con dispositivos físicos (opcional pero recomendado)

Aunque tu sistema es web-based, puedes soportar hardware:

16.1. Comunicación hardware

HID USB

WebUSB (desde el panel Astro/Vue)

Serial / UART / USB-Serial

WebSockets si el dispositivo es WiFi

16.2. Protocolo para pantallas

Si usas pantallas individuales (como StreamDeck):

72x72 PNG

96x96

O renderizado dinámico en WebP

Envío:

{ "cmd": "updateButton", "index": 4, "image": "<base64>" }

16.3. Lectura de pulsaciones

Single short press

Long press

Double press

Hold events

Emitido al servidor Bun vía WebSocket.

17. Sincronización y perfiles multi-dispositivo

Tu sistema puede funcionar con varios dispositivos conectados:

17.1. Perfiles independientes

Cada dispositivo tiene su propio perfil:

grid (3x5, 4x8, 8x8…)

layout asignado

acciones individuales

17.2. Cloud Sync opcional

Puedes permitir sincronización con:

supabase

firebase

bun server remoto propio

Sincronizando:

perfiles

iconos

ajustes

17.3. Hot-swap de perfiles

Cambio automático:

por app activa (como StreamDeck)

por ventana enfocada

por evento (ej: entrar en OBS cambia el perfil)

18. Sistema de eventos global (Event Bus)

Impulsa acciones avanzadas:

18.1. Emisor interno

El core de Bun emite eventos:

appFocused

audioLevelChanged

pluginInstalled

buttonPressed

networkConnected

18.2. Listener en plugins

Los plugins pueden engancharse:

bus.on('appFocused', (app) => { /* … */ })

18.3. Eventos externos vía WebSocket

Clientes conectados pueden emitir eventos, como:

{ "event": "obs.sceneChanged", "value": "Main" }

19. Sistema de automatizaciones

Permite que el sistema ejecute acciones basadas en condiciones:

19.1. Tipos

por hora

por app abierta

por cambio de sistema (ejemplo: micro mute)

por evento de plugin (OBS, Spotify, Discord)

19.2. Editor visual (web)

Tipo Node-RED minimal:

nodos: acciones, condiciones, temporizadores

drag & drop

se guardan en JSON

20. Seguridad

Como expones un servidor local:

20.1. CORS estricto

Solo permitir:

localhost

dominios firmados

20.2. API Keys por WebSocket

Cada cliente genera clave.

20.3. Sandbox para plugins

Plugins limitados:

sin acceso arbitrario a FS (solo rutas permitidas)

sin acceso a red externa sin permiso

21. Empaquetado y distribución

Tu aplicación puede distribuirse como:

21.1. App Desktop

Bun backend → empaquetado con Nebo, Electron, Tauri o Wails

Panel Astro/Vue embebido

21.2. Servicio puro local

Sin desktop app:

el usuario abre dashboard en el navegador

21.3. Plugins empaquetados

ZIP con:

manifest.json

iconos

código JS de acciones

páginas Vue (UI config)

22. Hot reload de plugins y acciones

Actualización sin reinicio del servidor Bun:

22.1. Watcher de plugins

Al modificar un plugin:

recargar manifest

recargar acciones

notificar al frontend

22.2. HMR para configuraciones de acciones

Sistema reactive usando WebSocket.

23. API REST + WebSocket consolidada

Tu API debe tener dos capas:

23.1. REST para operaciones persistentes

CRUD de perfiles

CRUD de acciones

CRUD de plugins

ajustes del sistema

23.2. WebSocket para tiempo real

pulsaciones

eventos

actualizaciones de iconos

estado de plugins

24. Virtual StreamDeck en navegador

Una feature potente:

24.1. Botonera 100% web

Que simule StreamDeck:

botones

iconos

animaciones

feedback

24.2. Control desde el móvil

El panel puede abrirse en smartphone y usarlo como StreamDeck.

Si quieres, puedo añadir más puntos como:

25. Marketplace interno de plugins

26. Testing del core y plugins

27. CLI para administrarlo todo

28. Sistema de logs avanzado

29. API de estadísticas

30. Telemetría local opcional

25. Marketplace interno de plugins

Permite instalar y actualizar plugins desde un repositorio controlado:

25.1. Funcionalidades

Lista de plugins disponibles con versión, autor y descripción.

Instalación directa desde el panel web.

Actualización automática o manual.

Deshabilitar plugins sin desinstalarlos.

25.2. Seguridad

Plugins firmados con checksum.

Sandbox en ejecución.

Validación de manifest antes de instalar.

26. Testing del core y plugins

Asegura estabilidad y facilita desarrollo de terceros:

26.1. Tipos de tests

Unitarios: action-runner, plugin-loader, DB layer.

Integración: flujo completo botón → acción → evento.

End-to-end: pruebas del panel web (Playwright o Cypress).

26.2. Herramientas

Runner integrado en Bun.

Scripts de sdctl test-plugin <plugin-id> para testear individualmente.

27. CLI para administración completa

Extensión de sdctl:

27.1. Comandos clave

start | stop | restart | status

install-plugin | uninstall-plugin | enable-plugin | disable-plugin

export-profile | import-profile

backup | restore

logs --follow

list-devices | monitor-device

27.2. Funcionalidades avanzadas

Configuración remota.

Scripts batch para despliegues de perfiles.

Generación automática de scaffolds para plugins.

28. Sistema de logs avanzado

Registro detallado para debugging y auditoría:

28.1. Niveles

DEBUG, INFO, WARN, ERROR

28.2. Almacenamiento

Base SQLite (logs table)

Archivos rotativos en /data/logs/

28.3. Visualización

Panel web con filtros por nivel, fecha, plugin o perfil.

29. API de estadísticas y métricas

Permite medir uso y optimizar la experiencia:

29.1. Métricas

Pulsaciones de botones por perfil/página.

Tiempo medio de ejecución de acciones.

Plugins más utilizados.

Estado del hardware conectado (HID, microcontroladores).

29.2. Acceso

REST API /api/v1/stats

WebSocket event: stats.update

30. Telemetría local opcional

Opcional y siempre bajo control del usuario.

Datos locales o enviados a servidor privado para analítica.

Usos: mejorar UX, detectar bugs, optimizar rendimiento.

Debe poder activarse/desactivarse desde ajustes del panel web.