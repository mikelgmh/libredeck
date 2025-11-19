#!/bin/bash

# LibreDeck Build Script
# Builds all components for production

set -e

echo "🚀 Building LibreDeck for production..."

# Create dist directory
mkdir -p dist

# Build CLI
echo "📦 Building CLI..."
cd cli
bun run build
mv sdctl ../dist/
cd ..

# Build Web first
echo "📦 Building Web..."
cd web
bun run build
cd ..

# Copy web dist to daemon
echo "📦 Copying Web dist to Daemon..."
mkdir -p daemon/web-dist
cp -r web/dist/* daemon/web-dist/

# Build Daemon (now unified with Web)
echo "📦 Building Unified Daemon..."
cd daemon
bun run build
mv libredeck-daemon ../dist/
cd ..

echo "✅ Build complete! Executables in ./dist/"
echo "  - CLI: ./dist/sdctl"
echo "  - Unified Daemon (with Web): ./dist/libredeck-daemon"
echo ""
echo "To run in production:"
echo "  ./dist/sdctl start"