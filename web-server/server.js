import { createServer } from 'http';
import { readFile } from 'fs/promises';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Parse command line arguments
const args = process.argv.slice(2);
let port = 4321; // default
let daemonPort = 3001; // default

for (const arg of args) {
    if (arg.startsWith('--port=')) {
        port = parseInt(arg.split('=')[1]);
    } else if (arg.startsWith('--daemon-port=')) {
        daemonPort = parseInt(arg.split('=')[1]);
    }
}

const server = createServer(async (req, res) => {
    const url = new URL(req.url, `http://localhost:${port}`);

    // Handle API proxy to daemon
    if (url.pathname.startsWith('/api/')) {
        // Proxy API requests to daemon
        const daemonUrl = `http://localhost:${daemonPort}${url.pathname}${url.search}`;

        try {
            const response = await fetch(daemonUrl, {
                method: req.method,
                headers: {
                    ...req.headers,
                    host: `localhost:${daemonPort}`
                },
                body: req.method !== 'GET' && req.method !== 'HEAD' ? req : undefined
            });

            // Copy response headers
            for (const [key, value] of response.headers) {
                res.setHeader(key, value);
            }

            res.statusCode = response.status;
            const body = await response.arrayBuffer();
            res.end(Buffer.from(body));

        } catch (error) {
            console.error('API proxy error:', error);
            res.statusCode = 502;
            res.end('Bad Gateway');
        }
        return;
    }

    // Handle WebSocket proxy
    if (url.pathname.startsWith('/ws')) {
        // For WebSocket, we need to establish a tunnel
        // This is a simplified version - in production you'd want proper WS proxy
        res.statusCode = 200;
        res.end('WebSocket proxy not implemented');
        return;
    }

    // Serve static files
    let filePath = url.pathname;
    if (filePath === '/' || filePath === '') {
        filePath = '/index.html';
    }

    // Security: prevent directory traversal
    if (filePath.includes('..') || filePath.includes('\\')) {
        res.statusCode = 403;
        res.end('Forbidden');
        return;
    }

    const fullPath = join(__dirname, 'dist', filePath);

    try {
        const content = await readFile(fullPath);
        const ext = filePath.split('.').pop();

        // Set content type based on extension
        const contentTypes = {
            'html': 'text/html',
            'css': 'text/css',
            'js': 'application/javascript',
            'json': 'application/json',
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'svg': 'image/svg+xml',
            'ico': 'image/x-icon'
        };

        res.setHeader('Content-Type', contentTypes[ext] || 'text/plain');
        res.end(content);

    } catch (error) {
        if (error.code === 'ENOENT') {
            res.statusCode = 404;
            res.end('Not Found');
        } else {
            console.error('File read error:', error);
            res.statusCode = 500;
            res.end('Internal Server Error');
        }
    }
});

server.listen(port, () => {
    console.log(`🌐 LibreDeck Web Server running on port ${port}`);
    console.log(`🔗 Connected to daemon on port ${daemonPort}`);
});

process.on('SIGINT', () => {
    console.log('🛑 Web server shutting down...');
    server.close();
    process.exit(0);
});

process.on('SIGTERM', () => {
    console.log('🛑 Web server shutting down...');
    server.close();
    process.exit(0);
});