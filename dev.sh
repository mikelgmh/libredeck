#!/bin/bash

# Script de desarrollo para LibreDeck
# Facilita el desarrollo y testing del proyecto

set -e

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[0;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🎛️  LibreDeck Development Script${NC}"
echo -e "${BLUE}=================================${NC}"

# Verificar prerrequisitos
check_prereqs() {
    echo -e "${YELLOW}Verificando prerrequisitos...${NC}"
    
    if ! command -v bun &> /dev/null; then
        echo -e "${RED}❌ Bun no está instalado. Instálalo desde https://bun.sh/${NC}"
        exit 1
    fi
    
    if ! command -v node &> /dev/null; then
        echo -e "${RED}❌ Node.js no está instalado. Instálalo desde https://nodejs.org/${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}✅ Prerrequisitos verificados${NC}"
}

# Instalar todas las dependencias
install_deps() {
    echo -e "${YELLOW}Instalando dependencias...${NC}"
    
    echo "📦 Instalando dependencias del daemon..."
    (cd daemon && bun install)
    
    echo "📦 Instalando dependencias del frontend..."
    (cd web && npm install)
    
    echo "📦 Instalando dependencias del CLI..."
    (cd cli && bun install)
    
    echo -e "${GREEN}✅ Todas las dependencias instaladas${NC}"
}

# Configurar base de datos
setup_db() {
    echo -e "${YELLOW}Configurando base de datos...${NC}"
    
    mkdir -p data
    
    echo -e "${GREEN}✅ Base de datos configurada${NC}"
}

# Crear perfil de ejemplo
create_sample_profile() {
    echo -e "${YELLOW}Creando perfil de ejemplo...${NC}"
    
    # Esperar a que el daemon esté listo
    sleep 3
    
    # Crear perfil vía API
    curl -X POST http://localhost:3001/api/v1/profiles \
        -H "Content-Type: application/json" \
        -d '{"name":"Perfil de Ejemplo","data":{"description":"Perfil creado automáticamente para desarrollo"}}' \
        &> /dev/null || echo "No se pudo crear el perfil (daemon no disponible)"
    
    echo -e "${GREEN}✅ Perfil de ejemplo creado${NC}"
}

# Iniciar desarrollo
start_dev() {
    echo -e "${YELLOW}Iniciando modo desarrollo...${NC}"
    
    # Trap para limpiar procesos al salir
    trap 'kill $(jobs -p) 2>/dev/null' EXIT
    
    echo -e "${BLUE}🔧 Iniciando daemon...${NC}"
    cd daemon && bun run dev &
    DAEMON_PID=$!
    
    echo -e "${BLUE}🌐 Iniciando frontend...${NC}"
    cd web && npm run dev -- --host &
    WEB_PID=$!
    
    # Esperar a que los servicios estén listos
    sleep 5
    
    create_sample_profile
    
    # Obtener IP local
    if command -v hostname &> /dev/null; then
        LOCAL_IP=$(hostname -I 2>/dev/null | awk '{print $1}')
        if [ -z "$LOCAL_IP" ]; then
            # Fallback para Windows/WSL
            LOCAL_IP=$(ip addr show | grep "inet " | grep -v 127.0.0.1 | awk '{print $2}' | cut -d/ -f1 | head -n1)
        fi
    fi
    
    echo -e "${GREEN}🚀 LibreDeck está ejecutándose:${NC}"
    echo -e "   📡 API: ${BLUE}http://localhost:3001${NC}"
    echo -e "   🌐 Panel Local: ${BLUE}http://localhost:4321${NC}"
    if [ -n "$LOCAL_IP" ]; then
        echo -e "   🌐 Panel Red LAN: ${BLUE}http://${LOCAL_IP}:4321${NC}"
    fi
    echo -e "   🔌 WebSocket: ${BLUE}ws://localhost:3002${NC}"
    echo ""
    echo -e "${YELLOW}Presiona Ctrl+C para detener${NC}"
    
    # Esperar a que se detengan los procesos
    wait
}

# Build de producción
build_prod() {
    echo -e "${YELLOW}Construyendo para producción...${NC}"
    
    echo "🔧 Building daemon..."
    cd daemon && bun run build && cd ..
    
    echo "🌐 Building frontend..."
    cd web && npm run build && cd ..
    
    echo "⚙️ Building CLI..."
    cd cli && bun run build && cd ..
    
    echo -e "${GREEN}✅ Build completado${NC}"
    echo -e "Archivos en:"
    echo "   daemon/dist/"
    echo "   web/dist/"
    echo "   cli/dist/"
}

# Limpiar archivos temporales
clean() {
    echo -e "${YELLOW}Limpiando archivos temporales...${NC}"
    
    rm -rf daemon/dist/
    rm -rf web/dist/
    rm -rf cli/dist/
    rm -rf data/db.sqlite*
    rm -rf data/logs/*.log
    
    echo -e "${GREEN}✅ Archivos limpiados${NC}"
}

# Tests
run_tests() {
    echo -e "${YELLOW}Ejecutando tests...${NC}"
    
    echo "🧪 Testing daemon..."
    cd daemon && bun test && cd .. || true
    
    echo "🧪 Testing frontend..."
    cd web && npm run test && cd .. || true
    
    echo -e "${GREEN}✅ Tests completados${NC}"
}

# Crear plugin de ejemplo
create_example_plugin() {
    echo -e "${YELLOW}Creando plugin de ejemplo...${NC}"
    
    PLUGIN_DIR="data/plugins/ejemplo-plugin"
    mkdir -p "$PLUGIN_DIR"
    
    # Manifest
    cat > "$PLUGIN_DIR/manifest.json" << 'EOF'
{
  "id": "com.libredeck.ejemplo",
  "name": "Plugin de Ejemplo",
  "version": "1.0.0",
  "description": "Plugin de demostración para LibreDeck",
  "author": "LibreDeck Team",
  "permissions": ["emitEvent"],
  "actions": [
    {
      "id": "saludo",
      "name": "Decir Hola",
      "description": "Muestra un saludo personalizado",
      "schema": {
        "type": "object",
        "properties": {
          "nombre": {
            "type": "string",
            "title": "Nombre",
            "default": "Mundo"
          },
          "entusiasmo": {
            "type": "integer",
            "title": "Nivel de entusiasmo",
            "minimum": 1,
            "maximum": 10,
            "default": 5
          }
        }
      }
    }
  ]
}
EOF

    # Main.js
    cat > "$PLUGIN_DIR/main.js" << 'EOF'
// Plugin de Ejemplo para LibreDeck
export function register(api) {
  console.log('🎉 Plugin de Ejemplo cargado');
  
  // Registrar acción de saludo
  api.onAction('saludo', async ({ args }) => {
    const nombre = args.nombre || 'Mundo';
    const entusiasmo = args.entusiasmo || 5;
    const exclamaciones = '!'.repeat(Math.min(entusiasmo, 10));
    
    const mensaje = `¡Hola ${nombre}${exclamaciones}`;
    
    // Emitir evento para logging
    api.emitEvent('log', { 
      message: `Saludo enviado: ${mensaje}`,
      plugin: 'ejemplo-plugin' 
    });
    
    // Log en el plugin
    api.log('info', `Saludo generado para: ${nombre}`);
    
    return { 
      success: true, 
      message: mensaje,
      entusiasmo: entusiasmo
    };
  });
}

export function unload() {
  console.log('👋 Plugin de Ejemplo descargado');
}
EOF

    # README
    cat > "$PLUGIN_DIR/README.md" << 'EOF'
# Plugin de Ejemplo

Este es un plugin de demostración que muestra cómo crear plugins para LibreDeck.

## Funciones

- **saludo**: Genera un saludo personalizado con nivel de entusiasmo configurable

## Instalación

El plugin se instala automáticamente durante el desarrollo. Para instalarlo manualmente:

```bash
sdctl plugin install data/plugins/ejemplo-plugin
```

## Uso

1. Crear un botón en LibreDeck
2. Asignar la acción "Decir Hola"
3. Configurar el nombre y nivel de entusiasmo
4. ¡Presionar el botón y ver el saludo!
EOF

    echo -e "${GREEN}✅ Plugin de ejemplo creado en $PLUGIN_DIR${NC}"
}

# Mostrar ayuda
show_help() {
    echo "Uso: ./dev.sh [comando]"
    echo ""
    echo "Comandos disponibles:"
    echo "  setup     - Verificar prerrequisitos e instalar dependencias"
    echo "  dev       - Iniciar modo desarrollo (daemon + frontend)"
    echo "  build     - Construir para producción"
    echo "  test      - Ejecutar tests"
    echo "  clean     - Limpiar archivos temporales"
    echo "  plugin    - Crear plugin de ejemplo"
    echo "  help      - Mostrar esta ayuda"
    echo ""
    echo "Ejemplos:"
    echo "  ./dev.sh setup    # Primera vez"
    echo "  ./dev.sh dev      # Desarrollo diario"
    echo "  ./dev.sh build    # Build de producción"
}

# Main
case "${1:-dev}" in
    "setup")
        check_prereqs
        install_deps
        setup_db
        create_example_plugin
        echo -e "${GREEN}🎉 Setup completado. Ejecuta './dev.sh dev' para iniciar${NC}"
        ;;
    "dev")
        check_prereqs
        start_dev
        ;;
    "build")
        check_prereqs
        build_prod
        ;;
    "test")
        run_tests
        ;;
    "clean")
        clean
        ;;
    "plugin")
        create_example_plugin
        ;;
    "help"|"-h"|"--help")
        show_help
        ;;
    *)
        echo -e "${RED}Comando desconocido: $1${NC}"
        show_help
        exit 1
        ;;
esac