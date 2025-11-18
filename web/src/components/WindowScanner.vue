<template>
  <div class="window-scanner-overlay show">
    <div class="window-scanner-modal">
      <h3 class="text-lg font-bold mb-4">Seleccionar Ventana Abierta</h3>

      <div class="scanner-controls mb-4">
        <div class="flex gap-2">
          <button
            @click="testConnection"
            class="btn btn-outline btn-sm"
          >
            🔗 Probar Conexión
          </button>
          <button
            @click="scanWindows"
            class="btn btn-primary btn-sm"
            :disabled="isScanning || connectionError"
          >
            <RefreshCw :size="16" class="mr-2" :class="{ 'animate-spin': isScanning }" />
            {{ isScanning ? 'Escaneando...' : 'Escanear Ventanas' }}
          </button>
        </div>
        
        <!-- Connection error indicator -->
        <div v-if="connectionError" class="alert alert-error mt-2 text-sm">
          <span>{{ connectionError }}</span>
        </div>
      </div>

      <div class="windows-list">
        <div
          v-for="window in windows"
          :key="window.hwnd"
          :class="[
            'window-item',
            { selected: selectedWindow?.hwnd === window.hwnd }
          ]"
          @click="selectWindow(window)"
        >
          <div class="window-info">
            <div class="window-title">{{ window.title }}</div>
            <div class="window-details">
              <span class="process-name">{{ window.processName }}</span>
              <span class="executable-path">{{ window.executablePath?.split('\\').pop() }}</span>
            </div>
          </div>
          <div v-if="selectedWindow?.hwnd === window.hwnd" class="selected-indicator">
            <Check :size="16" />
          </div>
        </div>

        <div v-if="windows.length === 0 && !isScanning" class="empty-state">
          <p>Haz clic en "Escanear Ventanas" para ver las ventanas abiertas.</p>
        </div>
      </div>

      <div class="modal-actions">
        <button @click="$emit('close')" class="btn btn-ghost">
          Cancelar
        </button>
        <button
          @click="confirmSelection"
          class="btn btn-primary"
          :disabled="!selectedWindow"
        >
          Seleccionar
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { RefreshCw, Check } from 'lucide-vue-next'

interface WindowInfo {
  hwnd: string
  title: string
  processId: number
  processName: string
  executablePath: string
}

interface Emits {
  (e: 'window-selected', window: WindowInfo): void
  (e: 'close'): void
}

const emit = defineEmits<Emits>()

const windows = ref<WindowInfo[]>([])
const selectedWindow = ref<WindowInfo | null>(null)
const isScanning = ref(false)
const connectionError = ref<string | null>(null)

const checkConnection = async (): Promise<boolean> => {
  try {
    // Use dynamic hostname instead of hardcoded localhost
    const daemonUrl = `http://${window.location.hostname}:3001/api/v1/test`
    console.log('🔗 Checking daemon connection...')
    console.log('🌐 URL:', daemonUrl)
    console.log('📡 Origin:', window.location.origin)
    
    const response = await fetch(daemonUrl, {
      method: 'GET',
      headers: { 
        'Content-Type': 'application/json',
        'X-Requested-With': 'XMLHttpRequest'
      },
      signal: AbortSignal.timeout(5000)
      // Removed explicit mode: 'cors' - let browser handle it
    })
    
    console.log('📡 Response status:', response.status)
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()))
    
    if (response.ok) {
      const data = await response.json()
      console.log('✅ Daemon connection OK:', data)
      connectionError.value = null
      return true
    } else {
      const errorText = await response.text()
      console.error('❌ Daemon connection failed:', response.status, errorText)
      connectionError.value = `Daemon responde pero con error (${response.status})`
      return false
    }
  } catch (error) {
    console.error('💥 Connection check failed:', error)
    console.error('💥 Error type:', error.constructor.name)
    console.error('💥 Error message:', error.message)
    console.error('💥 Error stack:', error.stack)
    connectionError.value = `No se puede conectar al daemon: ${error instanceof Error ? error.message : 'Error desconocido'}`
    return false
  }
}

const scanWindows = async () => {
  isScanning.value = true
  console.log('🔍 Starting window scan...')
  
  // First check if daemon is running
  const isConnected = await checkConnection()
  if (!isConnected) {
    alert('El daemon de LibreDeck no está ejecutándose. Por favor, inicia el daemon primero.')
    isScanning.value = false
    return
  }
  
  // Use dynamic hostname instead of hardcoded localhost
  const daemonUrl = `http://${window.location.hostname}:3001/api/v1/windows/list`
  console.log('🌐 Fetching from:', daemonUrl)
  
  try {
    const response = await fetch(daemonUrl, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      },
      signal: AbortSignal.timeout(10000) // Increased timeout
      // Removed explicit mode: 'cors'
    })
    
    console.log('📡 API Response status:', response.status)
    console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()))
    
    if (response.ok) {
      const windowsList = await response.json()
      console.log('✅ Windows found:', windowsList.length)
      console.log('📋 Windows data:', windowsList)
      windows.value = windowsList
      connectionError.value = null
    } else {
      const errorText = await response.text()
      console.error('❌ Failed to scan windows:', response.status, errorText)
      connectionError.value = `Error al escanear: ${response.status} - ${errorText}`
      windows.value = []
    }
  } catch (error) {
    console.error('💥 Error scanning windows:', error)
    console.error('💥 Error type:', error.constructor.name)
    console.error('💥 Error message:', error.message)
    console.error('💥 Error stack:', error.stack)
    connectionError.value = `Error de conexión: ${error instanceof Error ? error.message : 'Error desconocido'}`
    windows.value = []
  } finally {
    isScanning.value = false
  }
}

const selectWindow = (window: WindowInfo) => {
  selectedWindow.value = window
}

const confirmSelection = () => {
  if (selectedWindow.value) {
    emit('window-selected', selectedWindow.value)
  }
}

const testConnection = async () => {
  console.log('🧪 Testing connection manually...')
  const isConnected = await checkConnection()
  if (isConnected) {
    alert('✅ Conexión exitosa: El daemon está respondiendo correctamente.')
  } else {
    alert('❌ Error de conexión: ' + connectionError.value)
  }
}

// Auto-scan on mount
onMounted(async () => {
  const isConnected = await checkConnection()
  if (isConnected) {
    scanWindows()
  }
})
</script>

<style scoped>
.window-scanner-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.window-scanner-overlay.show {
  opacity: 1;
}

.window-scanner-modal {
  background-color: hsl(var(--b1));
  border-radius: 0.5rem;
  padding: 1.5rem;
  box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.3);
  max-width: 32rem;
  width: 100%;
  margin: 1rem;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.scanner-controls {
  display: flex;
  justify-content: center;
}

.windows-list {
  flex: 1;
  overflow-y: auto;
  max-height: 300px;
  margin: 1rem 0;
}

.window-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-radius: 0.375rem;
  cursor: pointer;
  transition: all 0.2s ease;
  border: 1px solid hsl(var(--b3));
}

.window-item:hover {
  background-color: hsl(var(--b2));
}

.window-item.selected {
  background-color: hsl(var(--p));
  color: hsl(var(--pc));
  border-color: hsl(var(--p));
}

.window-info {
  flex: 1;
}

.window-title {
  font-weight: 500;
  margin-bottom: 0.25rem;
}

.window-details {
  display: flex;
  gap: 0.5rem;
  font-size: 0.875rem;
  opacity: 0.7;
}

.process-name {
  font-weight: 500;
}

.executable-path {
  font-family: monospace;
}

.selected-indicator {
  color: hsl(var(--pc));
}

.empty-state {
  text-align: center;
  padding: 2rem;
  color: hsl(var(--bc));
}

.modal-actions {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
}
</style>