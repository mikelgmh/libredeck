#!/usr/bin/env bun

import { Command } from 'commander';
import chalk from 'chalk';
import ora from 'ora';
import inquirer from 'inquirer';
import { spawn, SpawnOptions } from 'bun';

const program = new Command();

// Configuración
const API_BASE = 'http://localhost:3001';
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
    console.log(`Checking if daemon is running on port ${port}...`);
    const response = await fetch(`http://localhost:${port}/health`);
    console.log(`Health check response status: ${response.status}`);
    return response.ok;
  } catch (error) {
    console.log(`Health check failed: ${(error as Error).message}`);
    return false;
  }
};

// Función para obtener el exe del daemon con la versión más alta
const getLatestDaemonExe = async (): Promise<string | null> => {
  const fs = await import('fs');
  const path = await import('path');
  const currentDir = path.dirname(process.execPath);

  console.log('Searching for daemon exe in dir:', currentDir);

  try {
    const files = fs.readdirSync(currentDir);
    console.log('All files in dir:', files);

    const daemonExes = files.filter(file =>
      file.startsWith('libredeck-daemon') &&
      (file.endsWith('.exe') || !file.includes('.')) &&
      !file.includes('-backup') // Excluir backup
    );

    console.log('Filtered daemon exes:', daemonExes);

    if (daemonExes.length === 0) return null;

    // Extraer versiones: preferir archivos con -vX.X.X-
    const versions = daemonExes.map(file => {
      const versionMatch = file.match(/libredeck-daemon-v([0-9]+\.[0-9]+\.[0-9]+)/);
      if (versionMatch) {
        return { file, version: versionMatch[1], hasVersion: true };
      }
      // Si no tiene versión, asignar versión baja
      return { file, version: '0.0.0', hasVersion: false };
    });

    console.log('Versions:', versions);

    // Ordenar: primero los con versión, luego por versión semver descendente
    versions.sort((a, b) => {
      if (a.hasVersion && !b.hasVersion) return -1;
      if (!a.hasVersion && b.hasVersion) return 1;

      const aParts = a.version.split('.').map(Number);
      const bParts = b.version.split('.').map(Number);
      for (let i = 0; i < 3; i++) {
        if (aParts[i] > bParts[i]) return -1;
        if (aParts[i] < bParts[i]) return 1;
      }
      return 0;
    });

    const selected = versions[0];
    console.log('Selected exe:', selected.file);

    return path.join(currentDir, selected.file);
  } catch (error) {
    console.error('Error finding latest daemon exe:', error);
    return null;
  }
};

// Comandos principales

// Start daemon
program
  .command('start')
  .description('Iniciar el daemon de LibreDeck')
  .option('-p, --port <port>', 'Puerto para la API HTTP', '3001')
  .option('-w, --ws-port <port>', 'Puerto para WebSocket', '3002')
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

      // Obtener el exe del daemon con la versión más alta
      const daemonExe = await getLatestDaemonExe();
      if (!daemonExe) {
        spinner.fail('No se encontró el ejecutable del daemon');
        return;
      }

      console.log(chalk.blue(`🚀 Ejecutando daemon: ${daemonExe}`));

      // Configurar variables de entorno
      const env = {
        ...process.env,
        PORT: options.port,
        WS_PORT: options.wsPort
      };

      if (options.detach) {
        // Ejecutar en segundo plano
        let proc;
        if (process.platform === 'win32') {
          proc = spawn({
            cmd: ['cmd', '/c', 'start', '/B', daemonExe],
            env,
            stdio: ['ignore', 'ignore', 'ignore'],
            cwd: process.cwd()
          });
        } else {
          proc = spawn({
            cmd: [daemonExe],
            env,
            stdio: ['ignore', 'ignore', 'ignore'],
            detached: true
          });
          proc.unref();
        }

        // Esperar un poco para verificar que inició correctamente
        console.log('Waiting for daemon to start...');
        await new Promise(resolve => setTimeout(resolve, 5000)); // Increased from 2000 to 5000ms

        console.log('Checking if daemon started successfully...');
        const isNowRunning = await isProcessRunning(parseInt(options.port));
        if (isNowRunning) {
          spinner.succeed(`LibreDeck daemon iniciado en http://localhost:${options.port}`);
        } else {
          spinner.fail('Error al iniciar el daemon - no responde al health check');
          console.log('El daemon puede estar ejecutándose pero no responde correctamente.');
          console.log('Intenta ejecutar: ./dist/libredeck-daemon.exe directamente para ver los logs.');
        }
      } else {
        // Ejecutar en "primer plano" (pero realmente detached para permitir updates)
        let proc;
        if (process.platform === 'win32') {
          proc = spawn({
            cmd: ['cmd', '/c', 'start', '/B', daemonExe],
            env,
            stdio: ['ignore', 'ignore', 'ignore'],
            cwd: process.cwd()
          });
        } else {
          proc = spawn({
            cmd: [daemonExe],
            env,
            stdio: ['ignore', 'ignore', 'ignore'],
            detached: true
          });
          proc.unref();
        }

        // Esperar un poco para verificar que inició correctamente
        await new Promise(resolve => setTimeout(resolve, 2000));

        const isNowRunning = await isProcessRunning(parseInt(options.port));
        if (isNowRunning) {
          spinner.succeed(`LibreDeck daemon iniciado en http://localhost:${options.port}`);
          console.log(chalk.gray('El daemon está ejecutándose en segundo plano.'));
        } else {
          spinner.fail('Error al iniciar el daemon');
          process.exit(1);
        }
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
      console.log('API shutdown failed, trying process kill...');
      // Si no funciona la API, buscar y matar el proceso
      try {
        if (process.platform === 'win32') {
          // Buscar procesos libredeck-daemon.exe
          await runCommand('taskkill', ['/F', '/IM', 'libredeck-daemon.exe']);
          await runCommand('taskkill', ['/F', '/IM', 'libredeck-daemon*.exe']); // También versiones con números
        } else {
          await runCommand('pkill', ['-f', 'libredeck-daemon']);
        }
        spinner.succeed('Daemon detenido por fuerza');
      } catch (killError) {
        console.log('Process kill failed:', killError);
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
      console.log(chalk.blue(`🔌 WebSocket: ws://localhost:3002`));
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

// Update
program
  .command('update')
  .description('Check for updates and update LibreDeck daemon')
  .action(async () => {
    const spinner = ora('Checking for updates...').start();

    try {
      const currentVersion = require('../../package.json').version;
      const response = await fetch('https://api.github.com/repos/mikelgmh/libredeck/releases/latest');

      if (!response.ok) {
        throw new Error('Failed to fetch latest release');
      }

      const release = await response.json();
      const latestVersion = release.tag_name.replace('v', '');

      if (latestVersion > currentVersion) {
        spinner.text = `Updating daemon to v${latestVersion}...`;

        // Find assets for daemon on current platform
        const platform = process.platform;
        const arch = process.arch;
        const platformName = platform === 'win32' ? 'windows' : platform === 'darwin' ? 'darwin' : 'linux';
        const assetExt = platform === 'win32' ? '.exe' : '';

        console.log(`Current version: ${currentVersion}, Latest version: ${latestVersion}`);
        console.log(`Platform: ${process.platform}, Arch: ${process.arch}`);
        console.log('Available assets:', release.assets.map((a: any) => a.name));

        const asset = release.assets.find((a: any) => {
          const isDaemon = a.name.includes('libredeck-daemon');
          const isX64 = a.name.includes('x64');
          const hasExe = a.name.endsWith('.exe');
          return isDaemon && isX64 && hasExe;
        });

        console.log('Found asset:', asset ? asset.name : 'NONE');

        if (!asset) {
          throw new Error(`No daemon asset found for ${platformName}-${arch}`);
        }

        // Download to a versioned file
        const downloadResponse = await fetch(asset.browser_download_url);
        const buffer = await downloadResponse.arrayBuffer();

        const fs = await import('fs');
        const path = await import('path');
        const currentDir = path.dirname(process.execPath);

        // Extract version from asset name (e.g., libredeck-daemon-v1.3.0-windows-x64.exe -> v1.3.0)
        const versionMatch = asset.name.match(/libredeck-daemon-v([0-9]+\.[0-9]+\.[0-9]+)/);
        const assetVersion = versionMatch ? versionMatch[1] : latestVersion;

        const newDaemonPath = path.join(currentDir, `libredeck-daemon-v${assetVersion}${assetExt}`);

        // Write new daemon executable
        fs.writeFileSync(newDaemonPath, Buffer.from(buffer));

        spinner.succeed(`Downloaded daemon v${latestVersion}!`);

        // The update will be applied on next restart
        spinner.succeed(`Daemon updated to v${latestVersion}! The update will be applied when you restart the application.`);
      } else {
        spinner.succeed('LibreDeck is up to date');
      }
    } catch (error) {
      spinner.fail(`Update failed: ${error}`);
      process.exit(1);
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
  .name('libredeck-cli')
  .description('LibreDeck CLI - Herramientas de línea de comandos para LibreDeck')
  .version('0.1.0');

// Parse command line arguments
program.parse(process.argv);

// Si no se proporciona comando, mostrar ayuda
if (!process.argv.slice(2).length) {
  program.outputHelp();
}