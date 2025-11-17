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
