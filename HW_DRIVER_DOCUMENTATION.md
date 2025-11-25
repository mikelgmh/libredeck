# Documentación de Integración con Hardware StreamDeck

## Librerías Instaladas

### @elgato-stream-deck/node (v7.4.0)

Paquete principal para integración completa con StreamDeck en Node.js

- **Licencia**: MIT
- **Autor**: Julian Waller (git@julusian.co.uk)
- **Repositorio**: [https://github.com/Julusian/node-elgato-stream-deck](https://github.com/Julusian/node-elgato-stream-deck)
- **Dependencias incluidas**:
  - `@elgato-stream-deck/core`: Lógica core del StreamDeck
  - `@elgato-stream-deck/node-lib`: Utilidades (JPEG encoding)
  - `node-hid`: Acceso a dispositivos USB HID
  - `eventemitter3`: Manejo de eventos
  - `tslib`: Utilidades TypeScript

### @elgato-stream-deck/node-lib (v7.4.0)

Librería helper interna para codificación JPEG

### @julusian/jpeg-turbo (v2.3.0)

Codificador JPEG optimizado (peer dependency)

## API Principal (@elgato-stream-deck/node)

Esta librería proporciona la API completa para interactuar con dispositivos StreamDeck.

### Funciones Principales

```typescript
// Escanear dispositivos conectados
listStreamDecks(): Promise<StreamDeckDeviceInfo[]>

// Obtener info de un dispositivo específico
getStreamDeckInfo(path: string): Promise<StreamDeckDeviceInfo | undefined>

// Abrir un StreamDeck
openStreamDeck(devicePath: string, userOptions?: OpenStreamDeckOptionsNode): Promise<StreamDeck>
```

### Eventos del StreamDeck

- `down`: Se dispara cuando se presiona un botón (keyIndex)
- `up`: Se dispara cuando se suelta un botón (keyIndex)
- `error`: Errores del dispositivo (siempre agregar listener)

### Métodos del StreamDeck

- `fillKeyColor(keyIndex, r, g, b)`: Rellenar botón con color sólido
- `fillKeyBuffer(keyIndex, buffer)`: Rellenar botón con imagen
- `fillPanelBuffer(buffer)`: Rellenar todo el panel con imagen
- `setBrightness(percentage)`: Ajustar brillo
- `close()`: Cerrar conexión

### Ejemplo de Uso Básico

```typescript
import { openStreamDeck, listStreamDecks } from '@elgato-stream-deck/node';

// Listar dispositivos conectados
const devices = await listStreamDecks();
if (devices.length === 0) throw new Error('No hay StreamDecks conectados!');

// Abrir el primer dispositivo
const streamDeck = await openStreamDeck(devices[0].path);

// Escuchar eventos de botones
streamDeck.on('down', (keyIndex) => {
    console.log('Botón %d presionado', keyIndex);
});

streamDeck.on('up', (keyIndex) => {
    console.log('Botón %d soltado', keyIndex);
});

// Siempre agregar listener de errores
streamDeck.on('error', (error) => {
    console.error(error);
});

// Rellenar botón 4 con rojo
await streamDeck.fillKeyColor(4, 255, 0, 0);
console.log('Botón 4 pintado de rojo');
```

### Características

- Soporte multiplataforma: Windows, MacOS, Linux, Raspberry Pi
- Soporte para todos los modelos: Original, Mini, XL
- Eventos de presión y liberación de botones
- Rellenar botones con imágenes o colores RGB
- Rellenar panel completo con imagen
- Control de brillo
- Soporte TypeScript

### Consideraciones para Windows

- Requiere Node.js >= 18.18
- Acceso USB HID puede requerir permisos administrativos
- No se necesitan drivers adicionales (usa node-hid)

### Interfaz JPEGEncodeOptions

```typescript
interface JPEGEncodeOptions {
    quality: number;        // Calidad de compresión (0-100)
    subsampling?: number;   // Submuestreo opcional
}
```

### Función encodeJPEG

```typescript
function encodeJPEG(
    buffer: Uint8Array,      // Buffer de la imagen RGB
    width: number,           // Ancho de la imagen
    height: number,          // Alto de la imagen
    options: JPEGEncodeOptions | undefined
): Promise<Uint8Array>       // Retorna buffer JPEG comprimido
```

**Descripción**: Codifica un buffer de imagen RGB en formato JPEG. Utiliza `@julusian/jpeg-turbo` si está disponible como peer dependency, de lo contrario cae de vuelta a `jpeg-js`.

### Dependencias

- **jpeg-js**: ^0.4.4 - Codificador JPEG fallback
- **tslib**: ^2.8.1 - Utilidades TypeScript

### Peer Dependencies

- **@julusian/jpeg-turbo**: ^1.1.2 || ^2.0.0 - Codificador JPEG optimizado (opcional)

### Uso en LibreDeck

Aunque esta librería es interna, podría ser útil para comprimir imágenes antes de enviarlas al StreamDeck. Sin embargo, para una integración completa con hardware StreamDeck, se recomienda instalar y usar `@elgato-stream-deck/node` en su lugar, que proporciona la API completa para:

- Detección de dispositivos StreamDeck conectados
- Manejo de eventos de pulsación de botones
- Actualización de imágenes y colores en botones
- Soporte para múltiples modelos (Original, Mini, XL, etc.)

### Instalación Recomendada para Integración Completa

```bash
cd daemon
bun add @elgato-stream-deck/node
```

### Ejemplo de Uso Básico (Teórico)

```typescript
import { encodeJPEG } from '@elgato-stream-deck/node-lib';

// Crear una imagen RGB simple (ejemplo)
const width = 72;
const height = 72;
const rgbBuffer = new Uint8Array(width * height * 3); // RGB

// Llenar con color rojo
for (let i = 0; i < rgbBuffer.length; i += 3) {
    rgbBuffer[i] = 255;     // R
    rgbBuffer[i + 1] = 0;   // G
    rgbBuffer[i + 2] = 0;   // B
}

// Codificar a JPEG
const jpegBuffer = await encodeJPEG(rgbBuffer, width, height, {
    quality: 80
});

// jpegBuffer ahora contiene la imagen comprimida
console.log('Imagen JPEG creada:', jpegBuffer.length, 'bytes');
```

### Requisitos del Sistema

- Requiere Node.js >= 18.18
- Acceso USB HID puede requerir permisos administrativos
- No se necesitan drivers adicionales (usa node-hid)

### Recursos Adicionales

- [Repositorio Principal](https://github.com/Julusian/node-elgato-stream-deck)
- [Documentación de Paquetes Públicos](https://www.npmjs.com/org/elgato-stream-deck)
- [Demo WebHID](https://julusian.github.io/node-elgato-stream-deck/) (requiere Chromium v89+)

### Integración en LibreDeck

Para integrar esta funcionalidad en el hw-driver de LibreDeck:

1. Crear archivos en `daemon/src/hw-driver/`:
   - `streamdeck-driver.ts`: Implementación del driver usando @elgato-stream-deck/node
   - `index.ts`: Punto de entrada que exporta funciones de inicialización

2. En `streamdeck-driver.ts`:

```typescript
import { openStreamDeck, listStreamDecks, StreamDeck } from '@elgato-stream-deck/node';

export class StreamDeckDriver {
    private streamDeck: StreamDeck | null = null;

    async init() {
        const devices = await listStreamDecks();
        if (devices.length > 0) {
            this.streamDeck = await openStreamDeck(devices[0].path);
            this.setupEventHandlers();
        }
    }

    private setupEventHandlers() {
        if (!this.streamDeck) return;

        this.streamDeck.on('down', (keyIndex) => {
            // Emitir evento al daemon para procesar acción
            // ws.emit('hardware.button.down', { keyIndex });
        });

        this.streamDeck.on('error', (error) => {
            console.error('StreamDeck error:', error);
        });
    }

    async setButtonColor(keyIndex: number, r: number, g: number, b: number) {
        if (this.streamDeck) {
            await this.streamDeck.fillKeyColor(keyIndex, r, g, b);
        }
    }
}
```3. Integrar con el daemon en `server.ts` o `ws.ts` para publicar eventos WebSocket.

4. Actualizar la UI para reflejar estados de botones físicos.
