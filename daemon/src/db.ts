import { Database } from 'bun:sqlite';

let db: Database;

export interface Profile {
  id: string;
  name: string;
  created_at: number;
  updated_at: number;
  data: any; // JSON metadata, layout info
}

export interface Page {
  id: string;
  profile_id: string;
  name: string;
  order_idx: number;
  data: any; // JSON layout, grid config
}

export interface Button {
  id: string;
  page_id: string;
  position: number;
  data: any; // JSON: actions, icon, label, state
}

export interface Plugin {
  id: string;
  name: string;
  version: string;
  manifest: any; // JSON manifest
  enabled: number; // 1 = enabled, 0 = disabled
  installed_at: number;
}

export interface Asset {
  id: string;
  path: string;
  hash: string;
  size: number;
  created_at: number;
}

export interface LogEntry {
  id?: number;
  level: string;
  message: string;
  meta: any; // JSON additional data
  ts: number;
}

export interface Setting {
  key: string;
  value: string;
}

const SQL_SCHEMA = `
  CREATE TABLE IF NOT EXISTS settings (
    key TEXT PRIMARY KEY,
    value TEXT
  );

  CREATE TABLE IF NOT EXISTS profiles (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL,
    data TEXT -- JSON
  );

  CREATE TABLE IF NOT EXISTS pages (
    id TEXT PRIMARY KEY,
    profile_id TEXT NOT NULL,
    name TEXT NOT NULL,
    order_idx INTEGER DEFAULT 0,
    data TEXT, -- JSON
    FOREIGN KEY(profile_id) REFERENCES profiles(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS buttons (
    id TEXT PRIMARY KEY,
    page_id TEXT NOT NULL,
    position INTEGER NOT NULL,
    data TEXT, -- JSON
    FOREIGN KEY(page_id) REFERENCES pages(id) ON DELETE CASCADE
  );

  CREATE TABLE IF NOT EXISTS plugins (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    version TEXT NOT NULL,
    manifest TEXT, -- JSON
    enabled INTEGER DEFAULT 1,
    installed_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS assets (
    id TEXT PRIMARY KEY,
    path TEXT NOT NULL,
    hash TEXT,
    size INTEGER,
    created_at INTEGER NOT NULL
  );

  CREATE TABLE IF NOT EXISTS logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    level TEXT NOT NULL,
    message TEXT NOT NULL,
    meta TEXT, -- JSON
    ts INTEGER NOT NULL
  );

  -- Índices para mejor performance
  CREATE INDEX IF NOT EXISTS idx_pages_profile_id ON pages(profile_id);
  CREATE INDEX IF NOT EXISTS idx_buttons_page_id ON buttons(page_id);
  CREATE INDEX IF NOT EXISTS idx_logs_level ON logs(level);
  CREATE INDEX IF NOT EXISTS idx_logs_ts ON logs(ts);
`;

export async function initDatabase() {
  const dataDir = '../data';
  const dbPath = `${dataDir}/db.sqlite`;

  // Crear directorio data si no existe
  await Bun.write(`${dataDir}/.gitkeep`, '');

  db = new Database(dbPath);

  // Ejecutar schema
  db.exec(SQL_SCHEMA);

  // Insertar configuración por defecto
  const defaultSettings = [
    { key: 'app.version', value: '0.1.0' },
    { key: 'api.port', value: '3001' },
    { key: 'ws.port', value: '3002' },
    { key: 'security.cors_origins', value: 'http://localhost:4321,http://127.0.0.1:4321' }
  ];

  const insertSetting = db.prepare('INSERT OR IGNORE INTO settings (key, value) VALUES (?, ?)');
  for (const setting of defaultSettings) {
    insertSetting.run(setting.key, setting.value);
  }

  console.log('Database initialized at:', dbPath);
}

export function getDatabase(): Database {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return db;
}

// Funciones de utilidad para acceso a datos
export class DatabaseService {
  private db: Database;

  constructor() {
    this.db = getDatabase();
  }

  // Settings
  getSetting(key: string): string | null {
    const stmt = this.db.prepare('SELECT value FROM settings WHERE key = ?');
    const result = stmt.get(key) as { value: string } | undefined;
    return result?.value || null;
  }

  setSetting(key: string, value: string): void {
    const stmt = this.db.prepare('INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)');
    stmt.run(key, value);
  }

  // Profiles
  getProfiles(): Profile[] {
    const stmt = this.db.prepare('SELECT * FROM profiles ORDER BY updated_at DESC');
    return stmt.all() as Profile[];
  }

  getProfile(id: string): Profile | null {
    const stmt = this.db.prepare('SELECT * FROM profiles WHERE id = ?');
    return stmt.get(id) as Profile || null;
  }

  createProfile(profile: Omit<Profile, 'created_at' | 'updated_at'>): Profile {
    const now = Date.now();
    const stmt = this.db.prepare(`
      INSERT INTO profiles (id, name, created_at, updated_at, data) 
      VALUES (?, ?, ?, ?, ?)
    `);

    const fullProfile: Profile = {
      ...profile,
      created_at: now,
      updated_at: now
    };

    stmt.run(profile.id, profile.name, now, now, JSON.stringify(profile.data));
    return fullProfile;
  }

  updateProfile(id: string, updates: Partial<Profile>): void {
    const now = Date.now();
    const stmt = this.db.prepare(`
      UPDATE profiles 
      SET name = COALESCE(?, name), 
          data = COALESCE(?, data), 
          updated_at = ?
      WHERE id = ?
    `);

    stmt.run(
      updates.name || null,
      updates.data ? JSON.stringify(updates.data) : null,
      now,
      id
    );
  }

  deleteProfile(id: string): void {
    const stmt = this.db.prepare('DELETE FROM profiles WHERE id = ?');
    stmt.run(id);
  }

  // Pages
  getPagesByProfile(profileId: string): Page[] {
    const stmt = this.db.prepare('SELECT * FROM pages WHERE profile_id = ? ORDER BY order_idx');
    return stmt.all(profileId) as Page[];
  }

  getPage(id: string): Page | null {
    const stmt = this.db.prepare('SELECT * FROM pages WHERE id = ?');
    return stmt.get(id) as Page || null;
  }

  createPage(page: Page): void {
    const stmt = this.db.prepare(`
      INSERT INTO pages (id, profile_id, name, order_idx, data) 
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(page.id, page.profile_id, page.name, page.order_idx, JSON.stringify(page.data));
  }

  // Buttons
  getButtonsByPage(pageId: string): Button[] {
    const stmt = this.db.prepare('SELECT * FROM buttons WHERE page_id = ? ORDER BY position');
    const buttons = stmt.all(pageId) as Button[];
    // Parse JSON data field
    return buttons.map(button => ({
      ...button,
      data: typeof button.data === 'string' ? JSON.parse(button.data) : button.data
    }));
  }

  getButton(id: string): Button | null {
    const stmt = this.db.prepare('SELECT * FROM buttons WHERE id = ?');
    const button = stmt.get(id) as Button;
    if (!button) return null;
    // Parse JSON data field
    return {
      ...button,
      data: typeof button.data === 'string' ? JSON.parse(button.data) : button.data
    };
  }

  createButton(button: Button): void {
    const stmt = this.db.prepare(`
      INSERT INTO buttons (id, page_id, position, data) 
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(button.id, button.page_id, button.position, JSON.stringify(button.data));
  }

  updateButton(id: string, data: any): void {
    const stmt = this.db.prepare('UPDATE buttons SET data = ? WHERE id = ?');
    stmt.run(JSON.stringify(data), id);
  }

  updateButtonComplete(id: string, updates: { data?: any, position?: number }): void {
    const setParts = [];
    const values = [];

    if (updates.data !== undefined) {
      setParts.push('data = ?');
      values.push(JSON.stringify(updates.data));
    }

    if (updates.position !== undefined) {
      setParts.push('position = ?');
      values.push(updates.position);
    }

    if (setParts.length === 0) return;

    const sql = `UPDATE buttons SET ${setParts.join(', ')} WHERE id = ?`;
    values.push(id);

    const stmt = this.db.prepare(sql);
    stmt.run(...values);
  }

  deleteButton(id: string): void {
    const stmt = this.db.prepare('DELETE FROM buttons WHERE id = ?');
    stmt.run(id);
  }

  // Plugins
  getPlugins(): Plugin[] {
    const stmt = this.db.prepare('SELECT * FROM plugins ORDER BY installed_at DESC');
    return stmt.all() as Plugin[];
  }

  getEnabledPlugins(): Plugin[] {
    const stmt = this.db.prepare('SELECT * FROM plugins WHERE enabled = 1');
    return stmt.all() as Plugin[];
  }

  installPlugin(plugin: Plugin): void {
    const stmt = this.db.prepare(`
      INSERT OR REPLACE INTO plugins (id, name, version, manifest, enabled, installed_at) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    stmt.run(
      plugin.id,
      plugin.name,
      plugin.version,
      JSON.stringify(plugin.manifest),
      plugin.enabled,
      plugin.installed_at
    );
  }

  // Logs
  addLog(entry: Omit<LogEntry, 'id'>): void {
    const stmt = this.db.prepare(`
      INSERT INTO logs (level, message, meta, ts) 
      VALUES (?, ?, ?, ?)
    `);
    stmt.run(entry.level, entry.message, JSON.stringify(entry.meta), entry.ts);
  }

  getLogs(limit: number = 100, level?: string): LogEntry[] {
    let query = 'SELECT * FROM logs';
    const params: any[] = [];

    if (level) {
      query += ' WHERE level = ?';
      params.push(level);
    }

    query += ' ORDER BY ts DESC LIMIT ?';
    params.push(limit);

    const stmt = this.db.prepare(query);
    return stmt.all(...params) as LogEntry[];
  }

  // Assets
  createAsset(asset: Asset): void {
    const stmt = this.db.prepare(`
      INSERT INTO assets (id, path, hash, size, created_at) 
      VALUES (?, ?, ?, ?, ?)
    `);
    stmt.run(asset.id, asset.path, asset.hash, asset.size, asset.created_at);
  }

  getAsset(id: string): Asset | null {
    const stmt = this.db.prepare('SELECT * FROM assets WHERE id = ?');
    return stmt.get(id) as Asset || null;
  }
}