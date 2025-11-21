#!/usr/bin/env node

import { spawn } from 'child_process';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createServer } from 'http';
import { networkInterfaces } from 'os';

const __dirname = dirname(fileURLToPath(import.meta.url));

// Find available port
function findAvailablePort(startPort = 3001) {
    return new Promise((resolve, reject) => {
        const server = createServer();
        server.listen(startPort, () => {
            const port = server.address().port;
            server.close(() => resolve(port));
        });
        server.on('error', () => {
            // Port busy, try next
            resolve(findAvailablePort(startPort + 1));
        });
    });
}

// Get local IP addresses
function getLocalIPs() {
    const nets = networkInterfaces();
    const results = [];

    for (const name of Object.keys(nets)) {
        for (const net of nets[name]) {
            // Skip over non-IPv4 and internal (i.e. 127.0.0.1) addresses
            if (net.family === 'IPv4' && !net.internal) {
                results.push(net.address);
            }
        }
    }
    return results;
}

async function main() {
    console.log('🚀 Starting LibreDeck...');

    try {
        // Find available ports
        const daemonPort = await findAvailablePort(3001);
        const webPort = await findAvailablePort(daemonPort + 1);

        console.log(`📡 Daemon will run on port ${daemonPort}`);
        console.log(`🌐 Web server will run on port ${webPort}`);

        // Start daemon
        const daemonPath = join(__dirname, 'libredeck-daemon.exe');
        const daemonProcess = spawn(daemonPath, [`--port=${daemonPort}`], {
            stdio: ['inherit', 'inherit', 'inherit'],
            detached: false
        });

        // Wait a bit for daemon to start
        await new Promise(resolve => setTimeout(resolve, 2000));

        // Start web server
        const webPath = join(__dirname, 'libredeck-web.exe');
        const webProcess = spawn(webPath, [`--port=${webPort}`, `--daemon-port=${daemonPort}`], {
            stdio: ['inherit', 'inherit', 'inherit'],
            detached: false
        });

        console.log('✅ LibreDeck started successfully!');
        console.log(`🌐 Open http://localhost:${webPort} in your browser`);
        console.log(`📡 Daemon API available at http://localhost:${daemonPort}`);

        // Handle process termination
        process.on('SIGINT', () => {
            console.log('\n🛑 Shutting down LibreDeck...');
            daemonProcess.kill();
            webProcess.kill();
            process.exit(0);
        });

        process.on('SIGTERM', () => {
            console.log('\n🛑 Shutting down LibreDeck...');
            daemonProcess.kill();
            webProcess.kill();
            process.exit(0);
        });

        // Monitor child processes
        daemonProcess.on('exit', (code) => {
            console.log(`❌ Daemon exited with code ${code}`);
            webProcess.kill();
            process.exit(1);
        });

        webProcess.on('exit', (code) => {
            console.log(`❌ Web server exited with code ${code}`);
            daemonProcess.kill();
            process.exit(1);
        });

    } catch (error) {
        console.error('❌ Failed to start LibreDeck:', error);
        process.exit(1);
    }
}

main();