<template>
  <div class="dashboard">
    <!-- Header -->
    <header class="header">
      <div class="container">
        <div class="header-content">
          <div class="logo">
            <h1>🎛️ LibreDeck</h1>
            <p>Open Source StreamDeck Alternative</p>
          </div>
          
          <div class="connection-status">
            <span :class="['status-indicator', connectionStatus]"></span>
            {{ connectionText }}
          </div>
        </div>
      </div>
    </header>

    <!-- Navigation -->
    <nav class="nav">
      <div class="container">
        <ul class="nav-list">
          <li>
            <button 
              @click="activeTab = 'dashboard'"
              :class="['nav-item', { active: activeTab === 'dashboard' }]"
            >
              Dashboard
            </button>
          </li>
          <li>
            <button 
              @click="activeTab = 'profiles'"
              :class="['nav-item', { active: activeTab === 'profiles' }]"
            >
              Perfiles
            </button>
          </li>
          <li>
            <button 
              @click="activeTab = 'plugins'"
              :class="['nav-item', { active: activeTab === 'plugins' }]"
            >
              Plugins
            </button>
          </li>
          <li>
            <button 
              @click="activeTab = 'settings'"
              :class="['nav-item', { active: activeTab === 'settings' }]"
            >
              Configuración
            </button>
          </li>
        </ul>
      </div>
    </nav>

    <!-- Content -->
    <div class="content">
      <div class="container">
        
        <!-- Dashboard Tab -->
        <div v-if="activeTab === 'dashboard'" class="tab-content">
          <h2>Panel de Control</h2>
          
          <div class="grid grid-3" style="margin-top: 2rem;">
            <!-- Stats Cards -->
            <div class="card">
              <h3>Perfiles</h3>
              <div class="stat">{{ profiles.length }}</div>
            </div>
            
            <div class="card">
              <h3>Plugins Activos</h3>
              <div class="stat">{{ activePlugins }}</div>
            </div>
            
            <div class="card">
              <h3>Acciones Ejecutadas</h3>
              <div class="stat">{{ executedActions }}</div>
            </div>
          </div>

          <!-- StreamDeck Grid -->
          <div class="card" style="margin-top: 2rem;">
            <div class="deck-header">
              <h3>{{ currentProfile ? `Perfil: ${currentProfile.name}` : 'StreamDeck Virtual' }}</h3>
              <div class="deck-controls">
                <select v-model="selectedProfile" @change="loadProfile" class="profile-select">
                  <option value="">Seleccionar perfil...</option>
                  <option v-for="profile in profiles" :key="profile.id" :value="profile.id">
                    {{ profile.name }}
                  </option>
                </select>
                <button @click="showGridSettings = !showGridSettings" class="btn btn-secondary">
                  ⚙️ Grid
                </button>
              </div>
            </div>
            
            <!-- Grid Settings -->
            <div v-if="showGridSettings" class="grid-settings">
              <div class="setting-row">
                <label>Columnas:</label>
                <input v-model.number="gridCols" @change="updateGrid" type="number" min="3" max="8" class="input small">
              </div>
              <div class="setting-row">
                <label>Filas:</label>
                <input v-model.number="gridRows" @change="updateGrid" type="number" min="2" max="6" class="input small">
              </div>
            </div>
            
            <!-- StreamDeck Button Grid -->
            <div 
              class="streamdeck-grid" 
              :style="{ 
                gridTemplateColumns: `repeat(${gridCols}, 1fr)`,
                gridTemplateRows: `repeat(${gridRows}, 1fr)`
              }"
            >
              <div 
                v-for="index in (gridCols * gridRows)" 
                :key="index"
                @click="handleButtonClick(index - 1)"
                @contextmenu.prevent="editButton(index - 1)"
                :class="['streamdeck-button', { 
                  'has-action': getButton(index - 1)?.data?.actions?.length > 0,
                  'executing': executingButtons.includes(index - 1)
                }]"
                :style="getButtonStyle(index - 1)"
              >
                <!-- Button Icon -->
                <div v-if="getButton(index - 1)?.data?.icon" class="button-icon">
                  <img :src="getButton(index - 1).data.icon" :alt="getButton(index - 1).data.label" />
                </div>
                <div v-else-if="getButton(index - 1)?.data?.emoji" class="button-emoji">
                  {{ getButton(index - 1).data.emoji }}
                </div>
                <div v-else class="button-placeholder">
                  {{ index }}
                </div>
                
                <!-- Button Label -->
                <div class="button-label">
                  {{ getButton(index - 1)?.data?.label || '' }}
                </div>
                
                <!-- Action Count Indicator -->
                <div 
                  v-if="getButton(index - 1)?.data?.actions?.length > 0" 
                  class="action-count"
                >
                  {{ getButton(index - 1).data.actions.length }}
                </div>
              </div>
            </div>
            
            <!-- Quick Action Bar -->
            <div class="quick-actions">
              <button @click="clearAllButtons" class="btn btn-secondary">
                🗑️ Limpiar Todo
              </button>
              <button @click="saveCurrentLayout" class="btn btn-primary">
                💾 Guardar Layout
              </button>
              <button @click="loadSampleLayout" class="btn btn-secondary">
                🎯 Layout de Ejemplo
              </button>
            </div>
          </div>
        </div>

        <!-- Profiles Tab -->
        <div v-if="activeTab === 'profiles'" class="tab-content">
          <div class="tab-header">
            <h2>Perfiles</h2>
            <button @click="createProfile" class="btn btn-primary">
              + Nuevo Perfil
            </button>
          </div>
          
          <div class="grid grid-2" style="margin-top: 2rem;">
            <div v-for="profile in profiles" :key="profile.id" class="card profile-card">
              <h3>{{ profile.name }}</h3>
              <p>Creado: {{ formatDate(profile.created_at) }}</p>
              <div class="profile-actions">
                <button @click="selectProfile(profile)" class="btn btn-secondary">
                  Seleccionar
                </button>
                <button @click="editProfile(profile)" class="btn btn-secondary">
                  Editar
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Plugins Tab -->
        <div v-if="activeTab === 'plugins'" class="tab-content">
          <div class="tab-header">
            <h2>Plugins</h2>
            <button @click="installPlugin" class="btn btn-primary">
              + Instalar Plugin
            </button>
          </div>
          
          <div class="grid" style="margin-top: 2rem;">
            <div v-for="plugin in plugins" :key="plugin.id" class="card plugin-card">
              <div class="plugin-header">
                <h3>{{ plugin.name }}</h3>
                <span :class="['status-badge', plugin.enabled ? 'enabled' : 'disabled']">
                  {{ plugin.enabled ? 'Activo' : 'Desactivado' }}
                </span>
              </div>
              <p>{{ plugin.manifest?.description || 'Sin descripción' }}</p>
              <div class="plugin-actions">
                <button 
                  @click="togglePlugin(plugin)" 
                  :class="['btn', plugin.enabled ? 'btn-secondary' : 'btn-primary']"
                >
                  {{ plugin.enabled ? 'Desactivar' : 'Activar' }}
                </button>
              </div>
            </div>
          </div>
        </div>

        <!-- Settings Tab -->
        <div v-if="activeTab === 'settings'" class="tab-content">
          <h2>Configuración</h2>
          
          <div class="grid" style="margin-top: 2rem;">
            <div class="card">
              <h3>Conexión</h3>
              <div class="setting-item">
                <label>Puerto API:</label>
                <input v-model="settings.apiPort" type="number" class="input" />
              </div>
              <div class="setting-item">
                <label>Puerto WebSocket:</label>
                <input v-model="settings.wsPort" type="number" class="input" />
              </div>
            </div>
            
            <div class="card">
              <h3>Logs</h3>
              <div class="logs-container">
                <div v-for="log in recentLogs" :key="log.id" :class="['log-item', log.level]">
                  <span class="log-time">{{ formatTime(log.ts) }}</span>
                  <span class="log-message">{{ log.message }}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

// State
const activeTab = ref('dashboard')
const connectionStatus = ref('status-offline')
const connectionText = ref('Desconectado')
const profiles = ref([])
const currentProfile = ref(null)
const currentButtons = ref([])
const plugins = ref([])
const activePlugins = ref(0)
const executedActions = ref(0)
const recentLogs = ref([])
const settings = ref({
  apiPort: 3001,
  wsPort: 3002
})

// StreamDeck Grid State
const selectedProfile = ref('')
const gridCols = ref(5)
const gridRows = ref(3)
const showGridSettings = ref(false)
const executingButtons = ref([])
const currentPage = ref(null)

// WebSocket
let ws: WebSocket | null = null

// API Base URL
const API_BASE = 'http://localhost:3001/api/v1'

// Methods
const connectWebSocket = () => {
  try {
    ws = new WebSocket(`ws://localhost:${settings.value.wsPort}`)
    
    ws.onopen = () => {
      connectionStatus.value = 'status-online'
      connectionText.value = 'Conectado'
      console.log('✓ Connected to LibreDeck daemon')
      
      // Subscribe to events
      ws?.send(JSON.stringify({
        type: 'subscribe',
        payload: { topics: ['profiles', 'buttons', 'actions', 'plugins'] }
      }))
    }
    
    ws.onclose = () => {
      connectionStatus.value = 'status-offline'
      connectionText.value = 'Desconectado'
      console.log('✗ Disconnected from LibreDeck daemon')
      
      // Retry connection after 3 seconds
      setTimeout(connectWebSocket, 3000)
    }
    
    ws.onerror = (error) => {
      connectionStatus.value = 'status-warning'
      connectionText.value = 'Error de conexión'
      console.error('WebSocket error:', error)
    }
    
    ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data)
        handleWebSocketMessage(message)
      } catch (error) {
        console.error('Invalid WebSocket message:', error)
      }
    }
  } catch (error) {
    console.error('Failed to connect WebSocket:', error)
  }
}

const handleWebSocketMessage = (message: any) => {
  switch (message.type) {
    case 'profile.updated':
      loadProfiles()
      break
    case 'button.pressed':
      console.log('Button pressed:', message.payload)
      break
    case 'action.started':
      console.log('Action started:', message.payload)
      break
    case 'action.finished':
      executedActions.value++
      break
    default:
      console.log('Received message:', message.type, message.payload)
  }
}

const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    })
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`)
    }
    
    return await response.json()
  } catch (error) {
    console.error('API Request failed:', error)
    throw error
  }
}

const loadProfiles = async () => {
  try {
    profiles.value = await apiRequest('/profiles')
  } catch (error) {
    console.error('Failed to load profiles:', error)
  }
}

const loadPlugins = async () => {
  try {
    const data = await apiRequest('/plugins')
    plugins.value = data.installed || []
    activePlugins.value = data.loaded?.length || 0
  } catch (error) {
    console.error('Failed to load plugins:', error)
  }
}

const loadLogs = async () => {
  try {
    recentLogs.value = await apiRequest('/logs?limit=20')
  } catch (error) {
    console.error('Failed to load logs:', error)
  }
}

const createProfile = () => {
  const name = prompt('Nombre del perfil:')
  if (!name) return
  
  apiRequest('/profiles', {
    method: 'POST',
    body: JSON.stringify({ name })
  }).then(() => {
    loadProfiles()
  })
}

const selectProfile = async (profile: any) => {
  currentProfile.value = profile
  try {
    const pages = await apiRequest(`/pages?profileId=${profile.id}`)
    if (pages.length > 0) {
      const buttons = await apiRequest(`/buttons?pageId=${pages[0].id}`)
      currentButtons.value = buttons
    }
  } catch (error) {
    console.error('Failed to load profile data:', error)
  }
}

const editProfile = (profile: any) => {
  const name = prompt('Nuevo nombre:', profile.name)
  if (!name) return
  
  apiRequest(`/profiles/${profile.id}`, {
    method: 'PUT',
    body: JSON.stringify({ name })
  }).then(() => {
    loadProfiles()
  })
}

const executeButton = async (button: any) => {
  if (!button.data?.actions?.length) {
    console.log('No actions configured for this button')
    return
  }
  
  for (const action of button.data.actions) {
    try {
      await apiRequest('/actions/execute', {
        method: 'POST',
        body: JSON.stringify({
          action,
          context: {
            buttonId: button.id,
            pageId: button.page_id,
            profileId: currentProfile.value?.id
          }
        })
      })
    } catch (error) {
      console.error('Failed to execute action:', error)
    }
  }
}

const installPlugin = () => {
  alert('Instalación de plugins no implementada aún')
}

const togglePlugin = (plugin: any) => {
  alert('Toggle de plugins no implementado aún')
}

// StreamDeck Grid Methods
const getButton = (position: number) => {
  return currentButtons.value.find((btn: any) => btn.position === position)
}

const getButtonStyle = (position: number) => {
  const button = getButton(position)
  if (!button?.data) return {}
  
  return {
    backgroundColor: button.data.backgroundColor || 'var(--bg-tertiary)',
    color: button.data.textColor || 'var(--text-primary)',
    backgroundImage: button.data.backgroundImage ? `url(${button.data.backgroundImage})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center'
  }
}

const handleButtonClick = async (position: number) => {
  const button = getButton(position)
  
  if (!button) {
    // No button configured, open editor
    editButton(position)
    return
  }
  
  if (!button.data?.actions?.length) {
    console.log('No actions configured for this button')
    editButton(position)
    return
  }
  
  // Add visual feedback
  executingButtons.value.push(position)
  
  try {
    // Execute all actions for this button
    for (const action of button.data.actions) {
      await apiRequest('/actions/execute', {
        method: 'POST',
        body: JSON.stringify({
          action,
          context: {
            buttonId: button.id,
            pageId: button.page_id,
            profileId: currentProfile.value?.id,
            position
          }
        })
      })
    }
  } catch (error) {
    console.error('Failed to execute button action:', error)
  } finally {
    // Remove visual feedback after delay
    setTimeout(() => {
      const index = executingButtons.value.indexOf(position)
      if (index > -1) {
        executingButtons.value.splice(index, 1)
      }
    }, 300)
  }
}

const editButton = (position: number) => {
  const button = getButton(position)
  
  if (button) {
    // Edit existing button
    const newLabel = prompt('Nuevo texto del botón:', button.data?.label || '')
    if (newLabel !== null) {
      updateButtonData(position, { 
        ...button.data, 
        label: newLabel 
      })
    }
  } else {
    // Create new button
    const label = prompt('Texto del botón:')
    if (!label) return
    
    const actionType = prompt('Tipo de acción (shell, http, hotkey):', 'shell')
    if (!actionType) return
    
    let actionConfig = {}
    
    switch (actionType) {
      case 'shell':
        const command = prompt('Comando a ejecutar:')
        if (command) {
          actionConfig = { type: 'shell', parameters: { command } }
        }
        break
      case 'http':
        const url = prompt('URL:')
        if (url) {
          actionConfig = { type: 'http', parameters: { url, method: 'GET' } }
        }
        break
      case 'hotkey':
        const keys = prompt('Teclas (ej: ctrl+c):')
        if (keys) {
          actionConfig = { type: 'hotkey', parameters: { keys } }
        }
        break
    }
    
    if (Object.keys(actionConfig).length > 0) {
      createButton(position, label, [actionConfig])
    }
  }
}

const createButton = async (position: number, label: string, actions: any[]) => {
  if (!currentPage.value) {
    alert('No hay página seleccionada')
    return
  }
  
  try {
    const buttonData = {
      page_id: currentPage.value.id,
      position,
      data: {
        label,
        actions,
        backgroundColor: '#374151',
        textColor: '#f1f5f9'
      }
    }
    
    const newButton = await apiRequest('/buttons', {
      method: 'POST',
      body: JSON.stringify(buttonData)
    })
    
    // Add to current buttons array
    currentButtons.value.push(newButton)
  } catch (error) {
    console.error('Failed to create button:', error)
  }
}

const updateButtonData = async (position: number, data: any) => {
  const button = getButton(position)
  if (!button) return
  
  try {
    await apiRequest(`/buttons/${button.id}`, {
      method: 'PUT',
      body: JSON.stringify({ data })
    })
    
    // Update local data
    button.data = data
  } catch (error) {
    console.error('Failed to update button:', error)
  }
}

const updateGrid = () => {
  // Grid size changed, could trigger layout update
  console.log(`Grid updated to ${gridCols.value}x${gridRows.value}`)
}

const loadProfile = async () => {
  if (!selectedProfile.value) {
    currentProfile.value = null
    currentButtons.value = []
    return
  }
  
  try {
    const profile = await apiRequest(`/profiles/${selectedProfile.value}`)
    currentProfile.value = profile
    
    // Load first page of profile
    const pages = await apiRequest(`/pages?profileId=${profile.id}`)
    if (pages.length > 0) {
      currentPage.value = pages[0]
      const buttons = await apiRequest(`/buttons?pageId=${pages[0].id}`)
      currentButtons.value = buttons
    } else {
      // Create default page
      const newPage = await apiRequest('/pages', {
        method: 'POST',
        body: JSON.stringify({
          profile_id: profile.id,
          name: 'Página Principal',
          order_idx: 0,
          data: { gridCols: gridCols.value, gridRows: gridRows.value }
        })
      })
      currentPage.value = newPage
      currentButtons.value = []
    }
  } catch (error) {
    console.error('Failed to load profile:', error)
  }
}

const clearAllButtons = async () => {
  if (!confirm('¿Estás seguro de que quieres eliminar todos los botones?')) return
  
  try {
    for (const button of currentButtons.value) {
      await apiRequest(`/buttons/${button.id}`, { method: 'DELETE' })
    }
    currentButtons.value = []
  } catch (error) {
    console.error('Failed to clear buttons:', error)
  }
}

const saveCurrentLayout = () => {
  alert('Guardado automáticamente ✓')
}

const loadSampleLayout = async () => {
  if (!currentPage.value) {
    alert('Selecciona un perfil primero')
    return
  }
  
  const sampleButtons = [
    { position: 0, label: '🎵 Play/Pause', action: { type: 'multimedia', parameters: { action: 'playpause' } } },
    { position: 1, label: '🔊 Vol+', action: { type: 'multimedia', parameters: { action: 'volumeUp' } } },
    { position: 2, label: '🔉 Vol-', action: { type: 'multimedia', parameters: { action: 'volumeDown' } } },
    { position: 5, label: '📁 Carpeta', action: { type: 'shell', parameters: { command: 'explorer .' } } },
    { position: 6, label: '💻 Terminal', action: { type: 'shell', parameters: { command: 'cmd' } } },
    { position: 7, label: '🌐 Browser', action: { type: 'shell', parameters: { command: 'start https://google.com' } } },
  ]
  
  for (const buttonConfig of sampleButtons) {
    await createButton(buttonConfig.position, buttonConfig.label, [buttonConfig.action])
  }
}

const formatDate = (timestamp: number) => {
  return new Date(timestamp).toLocaleDateString()
}

const formatTime = (timestamp: number) => {
  return new Date(timestamp).toLocaleTimeString()
}

// Lifecycle
onMounted(() => {
  connectWebSocket()
  loadProfiles()
  loadPlugins()
  loadLogs()
})

onUnmounted(() => {
  ws?.close()
})
</script>

<style scoped>
.dashboard {
  min-height: 100vh;
}

.header {
  background-color: var(--bg-secondary);
  border-bottom: 1px solid var(--border);
  padding: 1rem 0;
}

.header-content {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.logo h1 {
  margin: 0;
  color: var(--primary);
}

.logo p {
  margin: 0;
  color: var(--text-secondary);
  font-size: 0.875rem;
}

.connection-status {
  display: flex;
  align-items: center;
  font-size: 0.875rem;
  color: var(--text-secondary);
}

.nav {
  background-color: var(--bg-tertiary);
  border-bottom: 1px solid var(--border);
}

.nav-list {
  display: flex;
  list-style: none;
  margin: 0;
  padding: 0;
}

.nav-item {
  background: none;
  border: none;
  color: var(--text-secondary);
  padding: 1rem 1.5rem;
  cursor: pointer;
  transition: all 0.2s;
  border-bottom: 3px solid transparent;
}

.nav-item:hover {
  color: var(--text-primary);
  background-color: rgba(255, 255, 255, 0.05);
}

.nav-item.active {
  color: var(--primary);
  border-bottom-color: var(--primary);
}

.content {
  padding: 2rem 0;
}

.tab-content {
  animation: fadeIn 0.3s ease-in;
}

.tab-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.stat {
  font-size: 2rem;
  font-weight: bold;
  color: var(--primary);
  margin-top: 0.5rem;
}

.button-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
  gap: 1rem;
}

.deck-button {
  aspect-ratio: 1;
  background-color: var(--bg-tertiary);
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  color: var(--text-primary);
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: center;
  transition: all 0.2s;
  background-size: cover;
  background-position: center;
}

.deck-button:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.profile-card, .plugin-card {
  position: relative;
}

.profile-actions, .plugin-actions {
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.plugin-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.status-badge {
  font-size: 0.75rem;
  padding: 0.25rem 0.5rem;
  border-radius: 0.25rem;
  font-weight: 500;
}

.status-badge.enabled {
  background-color: rgba(16, 185, 129, 0.2);
  color: var(--success);
}

.status-badge.disabled {
  background-color: rgba(239, 68, 68, 0.2);
  color: var(--error);
}

.setting-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.input {
  background-color: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  color: var(--text-primary);
  padding: 0.5rem;
  width: 120px;
}

.logs-container {
  max-height: 300px;
  overflow-y: auto;
  background-color: var(--bg-primary);
  border-radius: 0.375rem;
  padding: 1rem;
}

.log-item {
  display: flex;
  gap: 1rem;
  padding: 0.25rem 0;
  font-family: monospace;
  font-size: 0.875rem;
}

.log-time {
  color: var(--text-secondary);
  min-width: 80px;
}

.log-item.error {
  color: var(--error);
}

.log-item.warn {
  color: var(--warning);
}

.log-item.info {
  color: var(--text-primary);
}

/* StreamDeck Grid Styles */
.deck-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.deck-controls {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.profile-select {
  background-color: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  color: var(--text-primary);
  padding: 0.5rem;
  min-width: 200px;
}

.grid-settings {
  background-color: var(--bg-primary);
  border: 1px solid var(--border);
  border-radius: 0.375rem;
  padding: 1rem;
  margin-bottom: 1rem;
  display: flex;
  gap: 2rem;
}

.setting-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.input.small {
  width: 60px;
}

.streamdeck-grid {
  display: grid;
  gap: 8px;
  padding: 1rem;
  background-color: var(--bg-primary);
  border-radius: 0.5rem;
  border: 2px solid var(--border);
  margin: 1rem 0;
}

.streamdeck-button {
  aspect-ratio: 1;
  background-color: var(--bg-tertiary);
  border: 2px solid var(--border);
  border-radius: 8px;
  cursor: pointer;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px;
  transition: all 0.2s ease;
  position: relative;
  min-height: 80px;
  background-size: cover;
  background-position: center;
  overflow: hidden;
}

.streamdeck-button:hover {
  border-color: var(--primary);
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(99, 102, 241, 0.3);
}

.streamdeck-button.has-action {
  border-color: var(--success);
  background-color: rgba(16, 185, 129, 0.1);
}

.streamdeck-button.executing {
  border-color: var(--warning);
  background-color: rgba(245, 158, 11, 0.2);
  animation: pulse 0.3s ease-in-out;
}

.button-icon {
  width: 40px;
  height: 40px;
  margin-bottom: 4px;
}

.button-icon img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.button-emoji {
  font-size: 2rem;
  margin-bottom: 4px;
}

.button-placeholder {
  font-size: 0.875rem;
  color: var(--text-secondary);
  opacity: 0.5;
}

.button-label {
  font-size: 0.75rem;
  text-align: center;
  line-height: 1.2;
  font-weight: 500;
  color: inherit;
  text-shadow: 1px 1px 2px rgba(0, 0, 0, 0.8);
  z-index: 1;
}

.action-count {
  position: absolute;
  top: 4px;
  right: 4px;
  background-color: var(--primary);
  color: white;
  border-radius: 50%;
  width: 18px;
  height: 18px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  font-weight: bold;
}

.quick-actions {
  display: flex;
  gap: 1rem;
  justify-content: center;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--border);
}

@keyframes pulse {
  0% { transform: scale(1); }
  50% { transform: scale(1.05); }
  100% { transform: scale(1); }
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(10px); }
  to { opacity: 1; transform: translateY(0); }
}

@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 1rem;
  }
  
  .nav-list {
    flex-wrap: wrap;
  }
  
  .tab-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .deck-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 1rem;
  }
  
  .deck-controls {
    flex-direction: column;
    align-items: flex-start;
  }
  
  .streamdeck-grid {
    grid-template-columns: repeat(3, 1fr) !important;
  }
  
  .quick-actions {
    flex-direction: column;
    align-items: center;
  }
}
</style>