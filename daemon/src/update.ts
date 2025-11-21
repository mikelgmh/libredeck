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
    const cliPath = join(daemonDir, 'sdctl.exe');

    console.log(`📍 Daemon directory: ${daemonDir}`);
    console.log(`📍 CLI path: ${cliPath}`);

    // Check if CLI exists
    const fs = await import('fs');
    if (!fs.existsSync(cliPath)) {
      throw new Error(`CLI not found at ${cliPath}`);
    }

    // Run the update command
    console.log('🚀 Executing update command...');
    const proc = spawn({
      cmd: [cliPath, 'update'],
      cwd: daemonDir,
      stdio: ['inherit', 'pipe', 'pipe']
    });

    // Capture output
    let stdout = '';
    let stderr = '';

    const stdoutReader = new Response(proc.stdout).text();
    const stderrReader = new Response(proc.stderr).text();

    const [stdoutText, stderrText] = await Promise.all([stdoutReader, stderrReader]);

    stdout = stdoutText;
    stderr = stderrText;

    const exitCode = await proc.exited;

    console.log(`📄 CLI stdout: ${stdout}`);
    if (stderr) {
      console.log(`⚠️ CLI stderr: ${stderr}`);
    }
    console.log(`📊 CLI exit code: ${exitCode}`);

    if (exitCode === 0) {
      return {
        success: true,
        message: 'Daemon updated successfully.',
        restartRequired: false // CLI handles restart
      };
    } else {
      return {
        success: false,
        message: `Update command failed with exit code ${exitCode}: ${stderr}`
      };
    }

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