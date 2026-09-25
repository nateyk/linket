#!/usr/bin/env bash
# Wrapper script to run Laravel Boost MCP server via Docker with proper stdin handling

set -e

# Find the DDEV web container for this project
CONTAINER_NAME="ddev-${DDEV_PROJECT:-linket}-web"

# Execute the MCP server with stdin passed through
exec docker exec -i "$CONTAINER_NAME" php artisan mcp:start laravel-boost