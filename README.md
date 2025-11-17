# 🎛️ LibreDeck

**Alternativa de código abierto a StreamDeck**

LibreDeck es una aplicación local que proporciona una interfaz web para gestionar botones programables similares a StreamDeck. Permite crear perfiles, páginas y botones personalizables con acciones automatizadas.

## ✨ Características

- 🌐 **Interfaz Web**: Panel de administración moderno con Astro + Vue
- 🔌 **Sistema de Plugins**: Extensible con plugins JavaScript
- 📊 **Perfiles y Páginas**: Organización flexible de botones
- ⚡ **Tiempo Real**: Sincronización vía WebSocket
- 🛠️ **CLI Completo**: Herramientas de línea de comandos (sdctl)
- 💾 **Base de Datos**: Persistencia con SQLite
- 🔒 **Seguridad**: Sandboxing de plugins y CORS
- 📱 **Responsive**: Compatible con móviles y tablets

## 🏗️ Arquitectura

```
LibreDeck/
├── daemon/     # Servidor Bun (API + WebSocket)
├── web/        # Frontend Astro + Vue
├── cli/        # CLI de administración
├── data/       # Datos en tiempo de ejecución
└── docs/       # Documentación
```

### Componentes Principales

- **Daemon (Bun)**: Servidor local con API REST y WebSocket
- **Base de datos (SQLite)**: Almacenamiento de configuración y logs  
- **Frontend (Astro + Vue)**: Panel de administración web
- **Plugins**: Paquetes JS extensibles con sandbox
- **CLI (sdctl)**: Herramientas de gestión y desarrollo

## 🚀 Inicio Rápido

### Prerrequisitos

- [Bun](https://bun.sh/) v1.0+
- [Node.js](https://nodejs.org/) v18+ (para el frontend)

### Instalación

1. **Clonar el repositorio**:
   ```bash
   git clone https://github.com/tu-usuario/LibreDeck.git
   cd LibreDeck
   ```

2. **Instalar dependencias del daemon**:
   ```bash
   cd daemon
   bun install
   cd ..
   ```

3. **Instalar dependencias del frontend**:
   ```bash
   cd web
   npm install
   cd ..
   ```

4. **Instalar dependencias del CLI**:
   ```bash
   cd cli
   bun install
   cd ..
   ```

### Desarrollo

1. **Iniciar el daemon**:
   ```bash
   cd daemon
   bun run dev
   ```

2. **Iniciar el frontend** (en otra terminal):
   ```bash
   cd web
   npm run dev
   ```

3. **Acceder al panel**: http://localhost:4321

### Usando el CLI

```bash
# Instalar CLI globalmente (opcional)
cd cli
bun run build
npm link

# Comandos disponibles
sdctl status              # Estado del daemon
sdctl start              # Iniciar daemon
sdctl stop               # Detener daemon
sdctl profile list       # Listar perfiles
sdctl plugin list        # Listar plugins
sdctl logs --follow      # Ver logs en tiempo real
```

## 📖 Uso

### 1. Crear un Perfil

```bash
sdctl profile create "Mi Perfil"
```

O desde el panel web: **Perfiles** → **+ Nuevo Perfil**

### 2. Configurar Botones

1. Accede al panel web
2. Selecciona un perfil
3. Configura botones con acciones:
   - **Shell**: Ejecutar comandos
   - **HTTP**: Llamadas API
   - **Hotkey**: Simulación de teclas
   - **Multimedia**: Control de audio/video

### 3. Instalar Plugins

```bash
sdctl plugin install /ruta/al/plugin
```

O sube un archivo ZIP desde el panel web.

## 🔌 Sistema de Plugins

Los plugins extienden la funcionalidad de LibreDeck con nuevas acciones.

### Estructura de Plugin

```
mi-plugin/
├── manifest.json    # Configuración del plugin
├── main.js         # Código principal  
├── ui/             # Componentes Vue (opcional)
└── assets/         # Recursos (opcional)
```

### Ejemplo: manifest.json

```json
{
  "id": "com.ejemplo.mi-plugin",
  "name": "Mi Plugin",
  "version": "1.0.0",
  "permissions": ["exec", "network"],
  "actions": [
    {
      "id": "saludar",
      "name": "Saludar",
      "schema": {
        "type": "object",
        "properties": {
          "message": { "type": "string" }
        }
      }
    }
  ]
}
```

### Ejemplo: main.js

```javascript
export function register(api) {
  api.onAction('saludar', async ({ args }) => {
    const message = args.message || 'Hola!';
    api.emitEvent('log', { message });
    return { success: true, message };
  });
}
```

### Crear Plugin

```bash
sdctl dev create-plugin mi-plugin
```

## 🛠️ API

### REST Endpoints

- `GET /api/v1/profiles` - Listar perfiles
- `POST /api/v1/profiles` - Crear perfil  
- `GET /api/v1/plugins` - Listar plugins
- `POST /api/v1/actions/execute` - Ejecutar acción

### WebSocket Events

- `profile.updated` - Perfil actualizado
- `button.pressed` - Botón presionado
- `action.started` - Acción iniciada
- `action.finished` - Acción completada

## 🔧 Configuración

### Variables de Entorno

```bash
PORT=3001           # Puerto API HTTP
WS_PORT=3002        # Puerto WebSocket  
NODE_ENV=development
```

### Configuración del Daemon

Editar configuración desde el panel web o directamente en la base de datos:

```bash
sdctl config set api.port 3001
sdctl config set security.cors_origins "http://localhost:4321"
```

## 📂 Estructura de Datos

```
data/
├── db.sqlite       # Base de datos principal
├── assets/         # Assets subidos (iconos, etc.)
├── plugins/        # Plugins instalados
└── logs/           # Archivos de log
```

## 🔒 Seguridad

- **Sandboxing**: Plugins ejecutados en entorno controlado
- **Permisos**: Sistema de permisos granular para plugins
- **CORS**: Protección contra solicitudes no autorizadas
- **Validación**: Validación de manifiestos de plugins

## 🧪 Testing

```bash
# Tests del daemon
cd daemon
bun test

# Tests del frontend  
cd web
npm run test

# Tests del CLI
cd cli
bun test
```

## 📦 Build y Deploy

### Build de Producción

```bash
# Build daemon
cd daemon
bun run build

# Build frontend
cd web
npm run build

# Build CLI
cd cli
bun run build
```

### Instaladores

```bash
# Generar instalador Windows
npm run build:windows

# Generar instalador macOS  
npm run build:macos

# Generar instalador Linux
npm run build:linux
```

## 🤝 Contribuir

1. Fork el proyecto
2. Crea una rama feature (`git checkout -b feature/nueva-caracteristica`)
3. Commit tus cambios (`git commit -am 'Añadir nueva característica'`)
4. Push a la rama (`git push origin feature/nueva-caracteristica`)
5. Crea un Pull Request

## 📋 Roadmap

### v0.2.0 - Próximo Release
- [ ] Editor visual de botones (drag & drop)
- [ ] Más tipos de acciones built-in
- [ ] Soporte para hardware físico (HID)
- [ ] Marketplace de plugins

### v0.3.0 - Futuro
- [ ] Sincronización en la nube (opcional)
- [ ] App móvil companion
- [ ] Automatizaciones (triggers por tiempo/eventos)
- [ ] Temas personalizables

## 🐛 Problemas Conocidos

- Los plugins con permisos de red requieren configuración adicional
- El hot-reload de plugins en desarrollo puede ser lento
- WebSocket puede desconectarse en redes inestables (se reconecta automáticamente)

## 💡 Plugins Oficiales

- **OBS Studio**: Control de escenas y fuentes
- **Spotify**: Control de reproducción  
- **Discord**: Estados y notificaciones
- **System Monitor**: CPU, RAM, temperatura
- **File Manager**: Operaciones de archivos

## 📄 Licencia

Este proyecto está bajo la Licencia MIT. Ver [LICENSE](LICENSE) para más detalles.

## 🙏 Agradecimientos

- Inspirado por [Stream Deck](https://www.elgato.com/stream-deck)
- Construido con [Bun](https://bun.sh/), [Astro](https://astro.build/) y [Vue.js](https://vuejs.org/)
- Iconos de [Lucide](https://lucide.dev/)

---

**¿Preguntas?** Abre un [issue](https://github.com/tu-usuario/LibreDeck/issues) o únete a nuestro [Discord](https://discord.gg/libredeck)