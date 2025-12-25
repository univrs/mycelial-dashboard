#!/bin/bash
# check_phealth.sh - Check P2P network and dashboard health

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if a port is listening
check_port() {
    local port=$1
    ss -tlnp 2>/dev/null | grep -q ":${port} " && echo "up" || echo "down"
}

# Get peer count from API
get_peer_count() {
    local count=$(curl -s http://localhost:8080/api/peers 2>/dev/null | jq '. | length' 2>/dev/null)
    echo "${count:-0}"
}

# Check service status
dashboard_status=$(check_port 3000)
p2p_api_status=$(check_port 8080)
p2p_network_status=$(check_port 9000)
orchestrator_status=$(check_port 9090)

# Get peer count if P2P API is up
if [ "$p2p_api_status" = "up" ]; then
    peer_count=$(get_peer_count)
else
    peer_count="N/A"
fi

# Status indicator
status_icon() {
    if [ "$1" = "up" ]; then
        echo -e "${GREEN}✅ Running${NC}"
    else
        echo -e "${RED}❌ Down${NC}"
    fi
}

# Print header
echo ""
echo "┌─────────────────────────────────────────────────────────────┐"
echo "│  Dashboard: http://localhost:3000                           │"
printf "│  Status: %-50s │\n" "$(status_icon $dashboard_status)"
echo "├─────────────────────────────────────────────────────────────┤"
echo "│  P2P API:   http://localhost:8080                           │"
echo "│  WebSocket: ws://localhost:8080/ws                          │"
printf "│  Status: %-50s │\n" "$(status_icon $p2p_api_status)"
printf "│  Peers:     %-47s │\n" "${peer_count} connected"
echo "├─────────────────────────────────────────────────────────────┤"
echo "│  P2P Network (libp2p): localhost:9000                       │"
printf "│  Status: %-50s │\n" "$(status_icon $p2p_network_status)"
echo "├─────────────────────────────────────────────────────────────┤"
echo "│  Orchestrator API: http://localhost:9090                    │"
printf "│  Status: %-50s │\n" "$(status_icon $orchestrator_status)"
echo "└─────────────────────────────────────────────────────────────┘"
echo ""

# Exit with error if any service is down
if [ "$dashboard_status" = "down" ] || [ "$p2p_api_status" = "down" ] || [ "$p2p_network_status" = "down" ]; then
    exit 1
fi

exit 0
