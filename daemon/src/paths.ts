/**
 * Centralized path management for LibreDeck
 * Handles development vs production environment paths
 */

import { join } from 'path';

// Detect if running from installed location (Program Files)
const isInstalled = process.execPath.includes('Program Files') || 
                    process.execPath.includes('Program Files (x86)');

/**
 * Get the data directory path
 * In development: ../data (relative to daemon)
 * In production: %APPDATA%/LibreDeck/data
 */
export function getDataDir(): string {
  if (process.env.LIBREDECK_DATA_DIR) {
    return process.env.LIBREDECK_DATA_DIR;
  }

  if (isInstalled) {
    const appDataDir = process.env.APPDATA || process.env.LOCALAPPDATA || process.cwd();
    return join(appDataDir, 'LibreDeck', 'data');
  }

  // Development mode
  return '../data';
}

/**
 * Get the plugins directory path
 */
export function getPluginsDir(): string {
  return join(getDataDir(), 'plugins');
}

/**
 * Get the assets directory path
 */
export function getAssetsDir(): string {
  return join(getDataDir(), 'assets');
}

/**
 * Get the logs directory path
 */
export function getLogsDir(): string {
  return join(getDataDir(), 'logs');
}

/**
 * Get the database path
 */
export function getDbPath(): string {
  return join(getDataDir(), 'db.sqlite');
}

/**
 * Ensure all data directories exist
 */
export async function ensureDataDirectories(): Promise<void> {
  const fs = await import('fs');
  const dirs = [
    getDataDir(),
    getPluginsDir(),
    getAssetsDir(),
    getLogsDir()
  ];

  for (const dir of dirs) {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }
}
