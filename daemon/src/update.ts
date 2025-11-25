#!/usr/bin/env bun

import { spawn } from 'bun';
import { join, dirname } from 'path';

// Updated path logic

export async function updateDaemon(): Promise<{ success: boolean; message: string; restartRequired?: boolean }> {
  try {
    console.log('🔄 Starting daemon update process...');

    // Get the directory where the daemon executable is located
    const daemonDir = dirname(process.execPath);

    // Path to the CLI executable
    const cliPath = join(daemonDir, 'libredeck-cli.exe');

    console.log(`📍 Daemon directory: ${daemonDir}`);
    console.log(`📍 CLI path: ${cliPath}`);

    // Check if CLI exists
    const fs = await import('fs');
    if (!fs.existsSync(cliPath)) {
      throw new Error(`CLI not found at ${cliPath}`);
    }

    // Run the update command in background
    console.log('🚀 Starting update command in background...');
    let proc;
    if (process.platform === 'win32') {
      proc = spawn({
        cmd: ['cmd', '/c', 'start', '/B', cliPath, 'update'],
        cwd: daemonDir,
        stdio: ['inherit', 'inherit', 'inherit']
      });
    } else {
      proc = spawn({
        cmd: [cliPath, 'update'],
        cwd: daemonDir,
        stdio: ['inherit', 'inherit', 'inherit'],
        detached: true
      });
      proc.unref();
    }

    return {
      success: true,
      message: 'Update started in background. The daemon will restart automatically.',
      restartRequired: false
    };

  } catch (error) {
    console.error('❌ Update error:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown update error'
    };
  }
}

// If run directly
if (import.meta.main) {
  updateDaemon().then(result => {
    console.log('Update result:', result);
    process.exit(result.success ? 0 : 1);
  });
}