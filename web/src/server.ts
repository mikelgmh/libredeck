// LibreDeck Web Server
import { serve } from 'bun';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const distDir = join(__dirname, '..', 'dist');

const port = process.env.PORT ? parseInt(process.env.PORT) : 4321;

serve({
  port,
  fetch(req) {
    const url = new URL(req.url);
    let filePath = join(distDir, url.pathname);

    // Default to index.html for SPA
    if (url.pathname === '/' || !existsSync(filePath)) {
      filePath = join(distDir, 'index.html');
    }

    try {
      const file = readFileSync(filePath);
      const ext = filePath.split('.').pop();
      const mimeTypes: Record<string, string> = {
        'html': 'text/html',
        'css': 'text/css',
        'js': 'application/javascript',
        'json': 'application/json',
        'png': 'image/png',
        'jpg': 'image/jpeg',
        'svg': 'image/svg+xml',
      };

      return new Response(file, {
        headers: { 'Content-Type': mimeTypes[ext] || 'text/plain' },
      });
    } catch {
      return new Response('Not Found', { status: 404 });
    }
  },
});

console.log(`🚀 LibreDeck Web Server running on http://localhost:${port}`);