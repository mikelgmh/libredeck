#!/usr/bin/env bun

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { spawn, SpawnOptions } from 'bun';

const program = new Command();

// Configuración
const API_BASE = 'http://localhost:3001/api/v1';
const DAEMON_PATH = '../daemon';
const DATA_PATH = '../data';

// Utilidades
const apiRequest = async (endpoint: string, options: RequestInit = {}) => {
  try {
    const response = await fetch(`${API_BASE}${endpoint}`, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers
      },
      ...options
    });
    
    if (!response.ok) {
      throw new Error(`API Error: ${response.status} ${response.statusText}`);
    }
    
    return await response.json();
  } catch (error) {
    throw new Error(`Failed to connect to LibreDeck daemon. Is it running?`);
  }
};

const runCommand = async (command: string, args: string[] = [], options: SpawnOptions = {}): Promise<number> => {
  const proc = spawn({
    cmd: [command, ...args],
    stdio: ['inherit', 'inherit', 'inherit'],
    ...options
  });
  
  await proc.exited;
  return proc.exitCode || 0;
};

const isProcessRunning = async (port: number): Promise<boolean> => {
  try {
    const response = await fetch(`http://localhost:${port}/health`);
    return response.ok;
  } catch {
    return false;
  }
};

// Comandos principales

// Start daemon
program
  .command('start')
  .description('Iniciar el daemon de LibreDeck')
  .option('-p, --port <port>', 'Puerto para la API HTTP', '3001')
  .option('-w, --ws-port <port>', 'Puerto para WebSocket', '3003')
  .option('-d, --detach', 'Ejecutar en segundo plano')
  .action(async (options) => {
    const spinner = ora('Iniciando LibreDeck daemon...').start();
    
    try {
      // Verificar si ya está ejecutándose
      const isRunning = await isProcessRunning(parseInt(options.port));
      if (isRunning) {
        spinner.fail('El daemon ya está ejecutándose');
        return;
      }
      
      // Configurar variables de entorno
      const env = {
        ...process.env,
        PORT: options.port,
        WS_PORT: options.wsPort
      };
      
      if (options.detach) {
        // Ejecutar en segundo plano
        const proc = spawn({
          cmd: ['bun', 'run', 'src/server.ts'],
          cwd: DAEMON_PATH,
          env,
          stdio: ['ignore', 'ignore', 'ignore'],
          detached: true
        });
        
        // Esperar un poco para verificar que inició correctamente
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        const isNowRunning = await isProcessRunning(parseInt(options.port));
        if (isNowRunning) {
          spinner.succeed(`LibreDeck daemon iniciado en http://localhost:${options.port}`);
        } else {
          spinner.fail('Error al iniciar el daemon');
        }
      } else {
        // Ejecutar en primer plano
        spinner.succeed('Daemon iniciado');
        console.log(chalk.blue(`🚀 Iniciando LibreDeck en http://localhost:${options.port}`));
        
        await runCommand('bun', ['run', 'src/server.ts'], {
          cwd: DAEMON_PATH,
          env
        });
      }
    } catch (error) {
      spinner.fail(`Error al iniciar daemon: ${error}`);
      process.exit(1);
    }
  });

// Stop daemon
program
  .command('stop')
  .description('Detener el daemon de LibreDeck')
  .action(async () => {
    const spinner = ora('Deteniendo daemon...').start();
    
    try {
      // Intentar detener vía API
      await apiRequest('/admin/shutdown', { method: 'POST' });
      spinner.succeed('Daemon detenido correctamente');
    } catch (error) {
      // Si no funciona la API, buscar y matar el proceso
      try {
        if (process.platform === 'win32') {
          await runCommand('taskkill', ['/F', '/IM', 'bun.exe']);
        } else {
          await runCommand('pkill', ['-f', 'libredeck']);
        }
        spinner.succeed('Daemon detenido');
      } catch {
        spinner.fail('No se pudo detener el daemon');
      }
    }
  });

// Status
program
  .command('status')
  .description('Mostrar el estado del daemon')
  .action(async () => {
    const spinner = ora('Verificando estado...').start();
    
    try {
      const health = await apiRequest('/health');
      spinner.succeed('Daemon ejecutándose correctamente');
      
      console.log(chalk.green('✓ Estado: Online'));
      console.log(chalk.blue(`📡 API: http://localhost:3001`));
      console.log(chalk.blue(`🔌 WebSocket: ws://localhost:3003`));
      console.log(chalk.gray(`🕒 Uptime: ${new Date(health.timestamp).toLocaleString()}`));
      
      if (health.websocket) {
        console.log(chalk.blue(`👥 Clientes conectados: ${health.websocket.clients}`));
      }
    } catch (error) {
      spinner.fail('Daemon no disponible');
      console.log(chalk.red('✗ Estado: Offline'));
    }
  });

// Plugin management
const pluginCommand = program.command('plugin');

pluginCommand
  .command('list')
  .description('Listar plugins instalados')
  .action(async () => {
    try {
      const data = await apiRequest('/plugins');
      
      console.log(chalk.bold('\n📦 Plugins Instalados:'));
      
      if (data.installed && data.installed.length > 0) {
        data.installed.forEach((plugin: any) => {
          const status = plugin.enabled ? chalk.green('●') : chalk.red('○');
          console.log(`${status} ${plugin.name} v${plugin.version}`);
        });
      } else {
        console.log(chalk.gray('No hay plugins instalados'));
      }
      
      console.log(chalk.bold('\n🔧 Plugins Cargados:'));
      
      if (data.loaded && data.loaded.length > 0) {
        data.loaded.forEach((plugin: any) => {
          console.log(`${chalk.green('●')} ${plugin.manifest.name}`);
        });
      } else {
        console.log(chalk.gray('No hay plugins cargados'));
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
    }
  });

pluginCommand
  .command('install <path>')
  .description('Instalar un plugin desde archivo ZIP o carpeta')
  .action(async (pluginPath: string) => {
    const spinner = ora(`Instalando plugin desde ${pluginPath}...`).start();
    
    try {
      // TODO: Implementar instalación de plugins
      spinner.fail('Instalación de plugins no implementada aún');
    } catch (error) {
      spinner.fail(`Error instalando plugin: ${error}`);
    }
  });

// Profile management
const profileCommand = program.command('profile');

profileCommand
  .command('list')
  .description('Listar perfiles')
  .action(async () => {
    try {
      const profiles = await apiRequest('/profiles');
      
      console.log(chalk.bold('\n👤 Perfiles:'));
      
      if (profiles.length > 0) {
        profiles.forEach((profile: any) => {
          console.log(`• ${profile.name} (${profile.id})`);
          console.log(`  Creado: ${new Date(profile.created_at).toLocaleString()}`);
        });
      } else {
        console.log(chalk.gray('No hay perfiles creados'));
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
    }
  });

profileCommand
  .command('create <name>')
  .description('Crear un nuevo perfil')
  .action(async (name: string) => {
    const spinner = ora(`Creando perfil "${name}"...`).start();
    
    try {
      const profile = await apiRequest('/profiles', {
        method: 'POST',
        body: JSON.stringify({ name })
      });
      
      spinner.succeed(`Perfil "${name}" creado con ID: ${profile.id}`);
    } catch (error) {
      spinner.fail(`Error creando perfil: ${error}`);
    }
  });

profileCommand
  .command('export <profileId>')
  .description('Exportar perfil a JSON')
  .option('-o, --output <file>', 'Archivo de salida', `profile-${Date.now()}.json`)
  .action(async (profileId: string, options) => {
    const spinner = ora('Exportando perfil...').start();
    
    try {
      const profile = await apiRequest(`/profiles/${profileId}`);
      
      // También obtener páginas y botones
      const pages = await apiRequest(`/pages?profileId=${profileId}`);
      const exportData = { profile, pages };
      
      for (const page of pages) {
        const buttons = await apiRequest(`/buttons?pageId=${page.id}`);
        page.buttons = buttons;
      }
      
      await Bun.write(options.output, JSON.stringify(exportData, null, 2));
      spinner.succeed(`Perfil exportado a ${options.output}`);
    } catch (error) {
      spinner.fail(`Error exportando perfil: ${error}`);
    }
  });

// Logs
program
  .command('logs')
  .description('Mostrar logs del daemon')
  .option('-f, --follow', 'Seguir logs en tiempo real')
  .option('-l, --level <level>', 'Filtrar por nivel (info, warn, error)')
  .option('-n, --lines <number>', 'Número de líneas', '50')
  .action(async (options) => {
    try {
      const params = new URLSearchParams();
      if (options.level) params.set('level', options.level);
      if (options.lines) params.set('limit', options.lines);
      
      const logs = await apiRequest(`/logs?${params.toString()}`);
      
      console.log(chalk.bold('📋 Logs de LibreDeck:\n'));
      
      logs.forEach((log: any) => {
        const time = new Date(log.ts).toLocaleTimeString();
        let levelColor = chalk.white;
        
        switch (log.level) {
          case 'error': levelColor = chalk.red; break;
          case 'warn': levelColor = chalk.yellow; break;
          case 'info': levelColor = chalk.blue; break;
        }
        
        console.log(`${chalk.gray(time)} ${levelColor(log.level.toUpperCase())} ${log.message}`);
      });
      
      if (options.follow) {
        console.log(chalk.gray('\nSiguiendo logs... (Ctrl+C para salir)'));
        // TODO: Implementar seguimiento en tiempo real vía WebSocket
      }
    } catch (error) {
      console.error(chalk.red(`Error: ${error}`));
    }
  });

// Development tools
const devCommand = program.command('dev');

devCommand
  .command('create-plugin <pluginId>')
  .description('Crear scaffold de plugin')
  .action(async (pluginId: string) => {
    const spinner = ora(`Creando plugin ${pluginId}...`).start();
    
    try {
      const pluginDir = `${DATA_PATH}/plugins/${pluginId}`;
      
      // Crear directorio
      await runCommand('mkdir', ['-p', pluginDir]);
      
      // Crear manifest.json
      const manifest = {
        id: pluginId,
        name: pluginId,
        version: '0.1.0',
        permissions: ['emitEvent'],
        actions: [
          {
            id: 'hello',
            name: 'Saludar',
            schema: {
              type: 'object',
              properties: {
                message: { type: 'string', default: 'Hola!' }
              }
            }
          }
        ]
      };
      
      await Bun.write(`${pluginDir}/manifest.json`, JSON.stringify(manifest, null, 2));
      
      // Crear main.js
      const mainJs = `// ${pluginId} Plugin
export function register(api) {
  console.log('Plugin ${pluginId} loaded');
  
  api.onAction('hello', async ({ args }) => {
    const message = args.message || 'Hola desde ${pluginId}!';
    api.emitEvent('log', { message });
    return { success: true, message };
  });
}

export function unload() {
  console.log('Plugin ${pluginId} unloaded');
}
`;
      
      await Bun.write(`${pluginDir}/main.js`, mainJs);
      
      // Crear README
      const readme = `# ${pluginId} Plugin

Descripción del plugin.

## Instalación

\`\`\`bash
sdctl plugin install ${pluginDir}
\`\`\`

## Uso

Este plugin añade las siguientes acciones:

- **hello**: Muestra un saludo
`;
      
      await Bun.write(`${pluginDir}/README.md`, readme);
      
      spinner.succeed(`Plugin ${pluginId} creado en ${pluginDir}`);
    } catch (error) {
      spinner.fail(`Error creando plugin: ${error}`);
    }
  });

// Main CLI setup
program
  .name('sdctl')
  .description('LibreDeck CLI - Herramientas de línea de comandos para LibreDeck')
  .version('0.1.0');

// Parse command line arguments
program.parse(process.argv);

// Si no se proporciona comando, mostrar ayuda
if (!process.argv.slice(2).length) {
  program.outputHelp();
}