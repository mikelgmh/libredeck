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

# Build Daemon
echo "📦 Building Daemon..."
cd daemon
bun run build
mv libredeck-daemon ../dist/
cd ..

# Build Web
echo "📦 Building Web..."
cd web
bun run build
bun run bundle
mv libredeck-web ../dist/
cd ..

echo "✅ Build complete! Executables in ./dist/"
echo "  - CLI: ./dist/sdctl"
echo "  - Daemon: ./dist/libredeck-daemon"
echo "  - Web: ./dist/libredeck-web"
echo ""
echo "To run in production:"
echo "  ./dist/sdctl start"