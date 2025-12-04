#!/bin/bash
# Size Report - Track bundle and image sizes over time
# Run periodically or before/after adding dependencies

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
HISTORY_FILE="$PROJECT_ROOT/.size-history.log"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Size Report $(date '+%Y-%m-%d %H:%M') ===${NC}"
echo ""

# Docker image size
if command -v docker &> /dev/null; then
    IMAGE_SIZE=$(docker images faster-chat --format "{{.Size}}" 2>/dev/null | head -1)
    if [ -n "$IMAGE_SIZE" ]; then
        echo -e "${GREEN}Docker image:${NC} $IMAGE_SIZE"
    else
        echo -e "${YELLOW}Docker image:${NC} not built (run: docker build -t faster-chat .)"
    fi
else
    echo -e "${YELLOW}Docker:${NC} not installed"
fi

echo ""

# Frontend
if [ -d "$PROJECT_ROOT/frontend" ]; then
    echo -e "${GREEN}Frontend:${NC}"

    # Built bundle
    if [ -d "$PROJECT_ROOT/frontend/dist" ]; then
        DIST_SIZE=$(du -sh "$PROJECT_ROOT/frontend/dist" | awk '{print $1}')
        echo "  dist/         $DIST_SIZE"

        # JS bundle breakdown
        if [ -d "$PROJECT_ROOT/frontend/dist/assets" ]; then
            JS_SIZE=$(find "$PROJECT_ROOT/frontend/dist/assets" -name "*.js" -exec du -ch {} + 2>/dev/null | tail -1 | awk '{print $1}')
            CSS_SIZE=$(find "$PROJECT_ROOT/frontend/dist/assets" -name "*.css" -exec du -ch {} + 2>/dev/null | tail -1 | awk '{print $1}')
            echo "  ├─ JS:        $JS_SIZE"
            echo "  └─ CSS:       $CSS_SIZE"
        fi
    else
        echo "  dist/         (not built)"
    fi

    # node_modules
    if [ -d "$PROJECT_ROOT/frontend/node_modules" ]; then
        NM_SIZE=$(du -sh "$PROJECT_ROOT/frontend/node_modules" | awk '{print $1}')
        echo "  node_modules/ $NM_SIZE"
    fi

    # Dependency count
    if [ -f "$PROJECT_ROOT/frontend/package.json" ]; then
        DEP_COUNT=$(jq '.dependencies | length' "$PROJECT_ROOT/frontend/package.json" 2>/dev/null || echo "?")
        DEV_COUNT=$(jq '.devDependencies | length' "$PROJECT_ROOT/frontend/package.json" 2>/dev/null || echo "?")
        echo "  deps:         $DEP_COUNT prod, $DEV_COUNT dev"
    fi
fi

echo ""

# Server
if [ -d "$PROJECT_ROOT/server" ]; then
    echo -e "${GREEN}Server:${NC}"

    # Source size
    if [ -d "$PROJECT_ROOT/server/src" ]; then
        SRC_SIZE=$(du -sh "$PROJECT_ROOT/server/src" | awk '{print $1}')
        echo "  src/          $SRC_SIZE"
    fi

    # node_modules
    if [ -d "$PROJECT_ROOT/server/node_modules" ]; then
        NM_SIZE=$(du -sh "$PROJECT_ROOT/server/node_modules" | awk '{print $1}')
        echo "  node_modules/ $NM_SIZE"
    fi

    # Dependency count
    if [ -f "$PROJECT_ROOT/server/package.json" ]; then
        DEP_COUNT=$(jq '.dependencies | length' "$PROJECT_ROOT/server/package.json" 2>/dev/null || echo "?")
        DEV_COUNT=$(jq '.devDependencies | length' "$PROJECT_ROOT/server/package.json" 2>/dev/null || echo "?")
        echo "  deps:         $DEP_COUNT prod, $DEV_COUNT dev"
    fi
fi

echo ""

# Total project size (excluding node_modules and git)
TOTAL_SIZE=$(du -sh --exclude='node_modules' --exclude='.git' --exclude='dist' "$PROJECT_ROOT" 2>/dev/null | awk '{print $1}')
echo -e "${GREEN}Source code:${NC}    $TOTAL_SIZE (excluding node_modules, dist, .git)"

echo ""

# Log to history if --log flag
if [[ "$1" == "--log" ]]; then
    echo "$(date '+%Y-%m-%d %H:%M') | Docker: ${IMAGE_SIZE:-N/A} | Frontend dist: ${DIST_SIZE:-N/A} | Frontend deps: $DEP_COUNT" >> "$HISTORY_FILE"
    echo -e "${BLUE}Logged to .size-history.log${NC}"
fi

# Show history if exists
if [ -f "$HISTORY_FILE" ] && [ -s "$HISTORY_FILE" ]; then
    echo -e "${BLUE}Recent history:${NC}"
    tail -5 "$HISTORY_FILE" | sed 's/^/  /'
fi

echo ""
echo -e "${YELLOW}Tips:${NC}"
echo "  - Run 'bunx vite-bundle-visualizer' in frontend/ for bundle breakdown"
echo "  - Run 'docker run --rm -it wagoodman/dive faster-chat' to inspect image layers"
echo "  - Run '$0 --log' to append to history"
