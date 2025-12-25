#!/bin/bash
#
# cleanup_restart.sh - Clean up and restart P2P network for testing
#
# This script:
#   1. Stops all running mycelial-node processes
#   2. Cleans up database files (*.db)
#   3. Rebuilds the project
#   4. Starts a fresh network with 5 nodes (1 bootstrap + 4 peers)
#
# Usage:
#   ./scripts/cleanup_restart.sh          # Full cleanup and restart
#   ./scripts/cleanup_restart.sh --no-build  # Skip rebuild step
#   ./scripts/cleanup_restart.sh --kill-only # Only kill nodes, no restart
#

set -e

# =============================================================================
# Configuration
# =============================================================================

PROJECT_ROOT="$(cd "$(dirname "$0")/.." && pwd)"
BOOTSTRAP_PORT=9000
HTTP_PORT=8080
BOOTSTRAP_ADDR="/ip4/127.0.0.1/tcp/${BOOTSTRAP_PORT}"

# Node names for the network
PEER_NAMES=("Alice" "Bob" "Carol" "Dave")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# =============================================================================
# Helper Functions
# =============================================================================

log_info() {
    echo -e "${CYAN}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[OK]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# =============================================================================
# Step 1: Kill all running nodes
# =============================================================================

kill_nodes() {
    log_info "Stopping all mycelial-node processes..."

    # Find and kill all mycelial-node processes
    local pids=$(pgrep -f "mycelial-node" 2>/dev/null || true)

    if [ -n "$pids" ]; then
        echo "$pids" | while read pid; do
            if [ -n "$pid" ]; then
                kill "$pid" 2>/dev/null && log_info "  Killed process $pid"
            fi
        done
        sleep 2  # Wait for processes to terminate

        # Force kill any remaining
        pids=$(pgrep -f "mycelial-node" 2>/dev/null || true)
        if [ -n "$pids" ]; then
            echo "$pids" | xargs kill -9 2>/dev/null || true
            log_warn "  Force killed remaining processes"
        fi
    else
        log_info "  No running nodes found"
    fi

    log_success "All nodes stopped"
}

# =============================================================================
# Step 2: Clean up database files
# =============================================================================

cleanup_databases() {
    log_info "Cleaning up database files..."

    cd "$PROJECT_ROOT"

    # Find and remove all .db files
    local db_files=$(find . -name "*.db" -type f 2>/dev/null)

    if [ -n "$db_files" ]; then
        echo "$db_files" | while read db_file; do
            rm -f "$db_file" && log_info "  Removed: $db_file"
        done
    else
        log_info "  No database files found"
    fi

    # Also clean up any WAL and SHM files (SQLite journal files)
    find . -name "*.db-wal" -delete 2>/dev/null || true
    find . -name "*.db-shm" -delete 2>/dev/null || true

    log_success "Database cleanup complete"
}

# =============================================================================
# Step 3: Rebuild the project
# =============================================================================

rebuild_project() {
    log_info "Rebuilding project (release mode)..."

    cd "$PROJECT_ROOT"

    if cargo build --release --bin mycelial-node 2>&1; then
        log_success "Build complete"
    else
        log_error "Build failed!"
        exit 1
    fi
}

# =============================================================================
# Step 4: Start bootstrap node
# =============================================================================

start_bootstrap() {
    log_info "Starting bootstrap node..."
    log_info "  Name: Bootstrap"
    log_info "  P2P Port: $BOOTSTRAP_PORT"
    log_info "  HTTP Port: $HTTP_PORT"

    cd "$PROJECT_ROOT"

    # Start bootstrap node in background
    cargo run --release --bin mycelial-node -- \
        --bootstrap \
        --name "Bootstrap" \
        --port "$BOOTSTRAP_PORT" \
        --http-port "$HTTP_PORT" \
        > /tmp/mycelial-bootstrap.log 2>&1 &

    local bootstrap_pid=$!
    echo "$bootstrap_pid" > /tmp/mycelial-bootstrap.pid

    # Wait for bootstrap to start
    sleep 3

    if kill -0 "$bootstrap_pid" 2>/dev/null; then
        log_success "Bootstrap node started (PID: $bootstrap_pid)"
    else
        log_error "Bootstrap node failed to start!"
        cat /tmp/mycelial-bootstrap.log
        exit 1
    fi
}

# =============================================================================
# Step 5: Start peer nodes
# =============================================================================

start_peers() {
    log_info "Starting ${#PEER_NAMES[@]} peer nodes..."

    cd "$PROJECT_ROOT"

    for name in "${PEER_NAMES[@]}"; do
        log_info "  Starting peer: $name"

        # Start peer node in background (auto port selection)
        cargo run --release --bin mycelial-node -- \
            --name "$name" \
            --connect "$BOOTSTRAP_ADDR" \
            > "/tmp/mycelial-${name,,}.log" 2>&1 &

        local peer_pid=$!
        echo "$peer_pid" > "/tmp/mycelial-${name,,}.pid"

        # Brief pause between starts to avoid port conflicts
        sleep 1
    done

    # Wait for peers to connect
    sleep 3

    log_success "All peer nodes started"
}

# =============================================================================
# Step 6: Display status
# =============================================================================

show_status() {
    echo ""
    echo "=============================================="
    echo "  Mycelial P2P Network Status"
    echo "=============================================="
    echo ""

    log_info "Running nodes:"
    pgrep -af "mycelial-node" 2>/dev/null || echo "  (none)"

    echo ""
    log_info "Dashboard connection:"
    echo "  WebSocket: ws://localhost:${HTTP_PORT}/ws"
    echo "  API: http://localhost:${HTTP_PORT}/api"

    echo ""
    log_info "Log files:"
    echo "  Bootstrap: /tmp/mycelial-bootstrap.log"
    for name in "${PEER_NAMES[@]}"; do
        echo "  ${name}: /tmp/mycelial-${name,,}.log"
    done

    echo ""
    log_info "To start dashboard:"
    echo "  cd dashboard && npm run dev"

    echo ""
    log_info "To stop all nodes:"
    echo "  ./scripts/cleanup_restart.sh --kill-only"

    echo ""
}

# =============================================================================
# Main
# =============================================================================

main() {
    echo ""
    echo "=============================================="
    echo "  Mycelial P2P Network - Cleanup & Restart"
    echo "=============================================="
    echo ""

    local skip_build=false
    local kill_only=false

    # Parse arguments
    for arg in "$@"; do
        case $arg in
            --no-build)
                skip_build=true
                ;;
            --kill-only)
                kill_only=true
                ;;
            --help|-h)
                echo "Usage: $0 [options]"
                echo ""
                echo "Options:"
                echo "  --no-build    Skip the rebuild step"
                echo "  --kill-only   Only kill nodes, don't restart"
                echo "  --help, -h    Show this help message"
                exit 0
                ;;
        esac
    done

    # Always kill existing nodes first
    kill_nodes

    if [ "$kill_only" = true ]; then
        log_success "Nodes stopped. Exiting."
        exit 0
    fi

    # Clean up databases
    cleanup_databases

    # Rebuild if not skipped
    if [ "$skip_build" = false ]; then
        rebuild_project
    else
        log_warn "Skipping rebuild (--no-build)"
    fi

    # Start the network
    start_bootstrap
    start_peers

    # Show status
    show_status

    log_success "Network is ready for testing!"
}

main "$@"
