#!/bin/bash
set -e

cd ~/Sites/fasterchat-app

echo "Pulling latest..."
git pull origin main

echo "Installing deps..."
bun install

echo "Building..."
bun run build

echo "Restarting service..."
doas rc-service fasterchat restart

echo "Deployed $(git rev-parse --short HEAD)"
