#!/bin/bash

# Mycelial P2P - Sprint Runner
# Usage: ./scripts/run-sprint.sh <sprint-number>

set -e

SPRINT=${1:-1}

echo "==================================="
echo "  Mycelial P2P - Sprint $SPRINT"
echo "==================================="

case $SPRINT in
  1)
    echo "Starting Sprint 1: Backend Protocol Integration"
    echo ""

    # Initialize swarm
    npx claude-flow@alpha swarm init --topology hierarchical --maxAgents 5

    # Spawn agents
    npx claude-flow@alpha agent spawn --type coder --name "protocol-dev"
    npx claude-flow@alpha agent spawn --type tester --name "protocol-test"
    npx claude-flow@alpha agent spawn --type reviewer --name "code-review"

    # Execute tasks
    echo "Executing Sprint 1 tasks..."
    npx claude-flow@alpha task orchestrate "Implement vouch gossipsub protocol" --strategy sequential --priority high
    npx claude-flow@alpha task orchestrate "Implement credit gossipsub protocol" --strategy sequential --priority high
    npx claude-flow@alpha task orchestrate "Implement governance gossipsub protocol" --strategy sequential --priority high
    npx claude-flow@alpha task orchestrate "Implement resource gossipsub protocol" --strategy sequential --priority medium

    # Store progress
    npx claude-flow@alpha memory usage --action store --key "sprint-1/status" --value "complete" --namespace "mycelial-p2p"
    ;;

  2)
    echo "Starting Sprint 2: WebSocket Bridge"
    echo ""

    npx claude-flow@alpha swarm init --topology mesh --maxAgents 6

    npx claude-flow@alpha agent spawn --type coder --name "rust-ws"
    npx claude-flow@alpha agent spawn --type coder --name "ts-hooks"
    npx claude-flow@alpha agent spawn --type tester --name "ws-test"

    npx claude-flow@alpha task orchestrate "Add vouch message handlers to WebSocket" --priority high
    npx claude-flow@alpha task orchestrate "Add credit message handlers to WebSocket" --priority high
    npx claude-flow@alpha task orchestrate "Add governance message handlers to WebSocket" --priority high
    npx claude-flow@alpha task orchestrate "Update useP2P hook with economics handlers" --priority high

    npx claude-flow@alpha memory usage --action store --key "sprint-2/status" --value "complete" --namespace "mycelial-p2p"
    ;;

  3)
    echo "Starting Sprint 3: Integration Testing"
    echo ""

    npx claude-flow@alpha swarm init --topology mesh --maxAgents 8

    npx claude-flow@alpha agent spawn --type tester --name "integration-test"
    npx claude-flow@alpha agent spawn --type tester --name "e2e-test"
    npx claude-flow@alpha agent spawn --type analyst --name "coverage-analyzer"

    npx claude-flow@alpha task orchestrate "Write integration tests for vouch flow" --strategy parallel
    npx claude-flow@alpha task orchestrate "Write integration tests for credit flow" --strategy parallel
    npx claude-flow@alpha task orchestrate "Write integration tests for governance flow" --strategy parallel
    npx claude-flow@alpha task orchestrate "Setup Playwright and write E2E tests" --strategy sequential

    npx claude-flow@alpha memory usage --action store --key "sprint-3/status" --value "complete" --namespace "mycelial-p2p"
    ;;

  4)
    echo "Starting Sprint 4: Deployment"
    echo ""

    npx claude-flow@alpha swarm init --topology star --maxAgents 6

    npx claude-flow@alpha agent spawn --type architect --name "infra-architect"
    npx claude-flow@alpha agent spawn --type coder --name "devops-eng"
    npx claude-flow@alpha agent spawn --type documenter --name "tech-writer"

    npx claude-flow@alpha task orchestrate "Create Docker configuration" --priority high
    npx claude-flow@alpha task orchestrate "Add Prometheus metrics" --priority high
    npx claude-flow@alpha task orchestrate "Create Grafana dashboard" --priority medium
    npx claude-flow@alpha task orchestrate "Write deployment documentation" --priority high
    npx claude-flow@alpha task orchestrate "Setup GitHub Actions CI/CD" --priority high

    npx claude-flow@alpha memory usage --action store --key "sprint-4/status" --value "complete" --namespace "mycelial-p2p"
    ;;

  status)
    echo "Checking sprint status..."
    npx claude-flow@alpha memory search --pattern "sprint-*" --namespace "mycelial-p2p"
    ;;

  *)
    echo "Usage: $0 <sprint-number|status>"
    echo ""
    echo "Sprints:"
    echo "  1 - Backend Protocol Integration"
    echo "  2 - WebSocket Bridge"
    echo "  3 - Integration Testing"
    echo "  4 - Deployment"
    echo "  status - Check sprint progress"
    exit 1
    ;;
esac

echo ""
echo "Sprint $SPRINT complete!"
