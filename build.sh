#!/bin/bash

# LibreDeck Build Script
# Builds all components for production

set -e

echo "🚀 Building LibreDeck for production..."

# Create dist directory
mkdir -p dist

# Build Web first
echo "📦 Building Web..."
cd web
bun run build
cd ..

# Copy web dist to daemon
echo "📦 Copying Web dist to Daemon..."
mkdir -p daemon/web-dist
cp -r web/dist/* daemon/web-dist/

# Copy web dist to dist (for executable)
echo "📦 Copying Web dist to Dist..."
mkdir -p dist/web-dist
cp -r web/dist/* dist/web-dist/

# Build Unified Executable (includes daemon + web server)
echo "📦 Building Unified Executable..."
cd daemon
bun run build
mv libredeck-daemon ../dist/
cd ..

# CLI as compiled executable
echo "📦 Building CLI..."
cd cli
bun run build
mv sdctl ../dist/
cd ..

echo "✅ Build complete! Executables in ./dist/"
echo "  - Main App: ./dist/libredeck-daemon.exe (includes daemon + web server)"
echo "  - CLI: ./dist/sdctl.exe"
echo ""
echo "To run in production:"
echo "  ./dist/libredeck-daemon.exe"
echo ""
echo "To update:"
echo "  ./dist/sdctl.exe update"