# Mycelial P2P Bootstrap System

> **See [ROADMAP.md](./ROADMAP.md) for implementation progress tracking**

## Project Overview

A **production-ready Peer-to-Peer agent network** implementing Mycelial Economics principles for Univrs.io. This system enables autonomous agents to discover, connect, and coordinate resources using biological network patterns.

**Current Status**: Phase 6 UI Complete (~85% overall)
- 3+ nodes can discover each other and exchange messages
- Web dashboard with full economics UI (onboarding, reputation, credit, governance, resources)
- 40 passing tests across workspace
- Univrs.io design system with dark/light theme

## Architecture

```
┌─────────────────────────────────────────────────────────────────────┐
│                    MYCELIAL P2P BOOTSTRAP                           │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 5: Economics UI (React Components)               [COMPLETE]  │
│    • OnboardingPanel - Peer creation wizard                         │
│    • ReputationCard - Vouching & contribution stats                 │
│    • CreditPanel - Mutual credit management                         │
│    • GovernancePanel - Proposals & voting                           │
│    • ResourcePanel - Network resource metrics                       │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 4: Web Dashboard (React + WebSocket)              [WORKING]  │
│    • Real-time peer visualization (D3 force graph)                  │
│    • P2P Chat with local echo                                       │
│    • Theme toggle (dark/light mode)                                 │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 3: HTTP/WebSocket Server (Axum)                   [WORKING]  │
│    • WebSocket at /ws for real-time events                          │
│    • REST: /api/peers, /api/info, /api/stats, /health               │
│    • Bridge P2P events to browser clients                           │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 2: P2P Network (libp2p)                           [WORKING]  │
│    • gossipsub for pub/sub messaging                                │
│    • Kademlia DHT for peer discovery                                │
│    • mDNS for local network discovery                               │
│    • TCP + Noise + Yamux transport                                  │
├─────────────────────────────────────────────────────────────────────┤
│  Layer 1: Core Types & State (Rust)                      [WORKING]  │
│    • Identity (Ed25519, DID, Signed<T>)                             │
│    • Content addressing (Blake3, Merkle trees)                      │
│    • SQLite persistence with LRU cache                              │
│    • CRDT conflict resolution                                       │
└─────────────────────────────────────────────────────────────────────┘
```

## Technology Stack

| Component | Technology | Status |
|-----------|------------|--------|
| Core Types | Rust, serde, thiserror | Complete |
| P2P Network | libp2p 0.54 (gossipsub, kademlia, mdns) | Complete |
| State Store | SQLite + sqlx + LRU cache | Complete |
| HTTP Server | Axum + tokio | Complete |
| Dashboard | React 18 + Vite + TailwindCSS | 90% |
| Economics UI | React Components (Phase 6) | Complete |
| WASM Bridge | wasm-bindgen | Deferred |

## Project Structure

```
mycelial-dashboard/
├── CLAUDE.md                  # AI context (this file)
├── ROADMAP.md                 # Implementation progress
├── .claude/
│   └── commands/              # Claude-flow custom commands
│       ├── sprint-backend.md  # Backend integration sprint
│       ├── sprint-test.md     # Testing sprint
│       └── sprint-deploy.md   # Deployment sprint
│
├── dashboard/                  # React frontend
│   ├── package.json
│   ├── vite.config.ts
│   ├── tailwind.config.js     # Univrs.io design tokens
│   └── src/
│       ├── App.tsx            # Main app with all panels
│       ├── main.tsx           # Entry point
│       ├── index.css          # Global styles + CSS variables
│       ├── types.ts           # TypeScript types (Phase 6 complete)
│       ├── components/
│       │   ├── PeerGraph.tsx      # D3 force-directed graph
│       │   ├── ChatPanel.tsx      # Message list + send input
│       │   ├── ReputationCard.tsx # Peer details + vouching
│       │   ├── ThemeToggle.tsx    # Dark/light mode switch
│       │   ├── OnboardingPanel.tsx # Peer creation wizard
│       │   ├── QRCode.tsx         # SVG QR code generator
│       │   ├── CreditPanel.tsx    # Mutual credit management
│       │   ├── GovernancePanel.tsx # Proposals & voting
│       │   └── ResourcePanel.tsx  # Network resource metrics
│       └── hooks/
│           ├── useP2P.ts      # WebSocket + REST hook
│           └── useTheme.ts    # Theme management hook
│
└── crates/                    # Rust backend (separate repo)
    ├── mycelial-core/         # Core types (23 tests)
    ├── mycelial-network/      # libp2p networking (4 tests)
    ├── mycelial-state/        # SQLite persistence (13 tests)
    ├── mycelial-protocol/     # Message protocols
    └── mycelial-node/         # Main binary
```

## Dashboard Components (Phase 6)

### OnboardingPanel
Multi-step wizard for new peer creation:
- Step 0: Welcome screen
- Step 1: Identity generation (Web Crypto API)
- Step 2: Peer ID display, QR code, invite links
- Step 3: Reputation building guide

### ReputationCard
Enhanced peer details with vouching:
- Reputation tier visualization (Excellent/Good/Neutral/Poor/Untrusted)
- Contribution stats (contributions, interactions, vouches)
- Vouch button with stake slider modal
- Direct message button

### CreditPanel
Mutual credit management:
- Credit Lines tab - view existing lines with utilization bars
- Transfer tab - send credits with amount and memo
- History tab - transaction log with timestamps
- Create credit line modal

### GovernancePanel
Proposal and voting system:
- Active/Passed/All proposal filtering
- Vote For/Against buttons with weight
- Quorum progress visualization
- Create proposal modal with duration and quorum settings

### ResourcePanel
Network resource metrics:
- Overview - pool stats and top contributors
- My Resources - bandwidth/storage/compute metrics
- Network - per-peer contributions

## Build & Run Commands

```bash
# Dashboard development
cd dashboard && pnpm install && pnpm dev

# Build dashboard for production
cd dashboard && pnpm build

# Type check
cd dashboard && npx tsc --noEmit

# Run linting
cd dashboard && pnpm lint
```

## Gossipsub Topics

| Topic | Purpose | Status |
|-------|---------|--------|
| `/mycelial/1.0.0/chat` | Broadcast chat messages | Working |
| `/mycelial/1.0.0/direct` | Direct messages | Working |
| `/mycelial/1.0.0/reputation` | Reputation updates | UI Ready |
| `/mycelial/1.0.0/credit` | Credit transactions | UI Ready |
| `/mycelial/1.0.0/vouch` | Vouch propagation | UI Ready |
| `/mycelial/1.0.0/governance` | Proposals & votes | UI Ready |
| `/mycelial/1.0.0/resources` | Resource metrics | UI Ready |

## WebSocket Protocol

### Server -> Client Messages
```typescript
type WsMessage =
  | { type: "peers_list", peers: PeerListEntry[] }
  | { type: "peer_joined", peer_id: string, peer_info: object }
  | { type: "peer_left", peer_id: string }
  | { type: "chat_message", id: string, from: string, from_name: string, content: string, timestamp: number }
  | { type: "stats", peer_count: number, message_count: number, uptime_seconds: number }
  // Phase 7: New message types for economics
  | { type: "vouch_received", request: VouchRequest }
  | { type: "credit_update", line: CreditLine }
  | { type: "proposal_update", proposal: Proposal }
  | { type: "resource_update", metrics: ResourceMetrics }
```

### Client -> Server Messages
```typescript
type ClientMessage =
  | { type: "send_chat", content: string, to?: string }
  | { type: "get_peers" }
  | { type: "get_stats" }
  | { type: "subscribe", topic: string }
  // Phase 7: New message types for economics
  | { type: "send_vouch", request: VouchRequest }
  | { type: "create_credit_line", peerId: string, limit: number }
  | { type: "transfer_credit", transfer: CreditTransfer }
  | { type: "create_proposal", proposal: Proposal }
  | { type: "cast_vote", vote: Vote }
```

## Claude Flow Integration

This project uses claude-flow for AI-assisted development with multi-agent coordination.

### Quick Start Commands
```bash
# Initialize a development swarm
npx claude-flow@alpha swarm init --topology mesh

# Run a backend integration sprint
npx claude-flow@alpha task orchestrate "Implement vouch protocol" --strategy adaptive

# Run tests with swarm coordination
npx claude-flow@alpha task orchestrate "Run all tests and fix failures" --priority high
```

### Development Sprints

#### Sprint 1: Backend Protocol Integration
```bash
npx claude-flow@alpha swarm init --topology hierarchical --maxAgents 5

# Spawn specialized agents
npx claude-flow@alpha agent spawn --type coder --name "protocol-dev"
npx claude-flow@alpha agent spawn --type tester --name "protocol-test"
npx claude-flow@alpha agent spawn --type reviewer --name "code-review"

# Orchestrate tasks
npx claude-flow@alpha task orchestrate "Implement vouch gossipsub protocol" --strategy sequential
npx claude-flow@alpha task orchestrate "Implement credit gossipsub protocol" --strategy sequential
npx claude-flow@alpha task orchestrate "Implement governance gossipsub protocol" --strategy sequential
```

#### Sprint 2: WebSocket Bridge
```bash
npx claude-flow@alpha task orchestrate "Add vouch message handlers to WebSocket" --priority high
npx claude-flow@alpha task orchestrate "Add credit message handlers to WebSocket" --priority high
npx claude-flow@alpha task orchestrate "Add governance message handlers to WebSocket" --priority high
npx claude-flow@alpha task orchestrate "Connect dashboard callbacks to real WebSocket" --priority high
```

#### Sprint 3: Integration Testing
```bash
npx claude-flow@alpha swarm init --topology mesh --maxAgents 8

npx claude-flow@alpha agent spawn --type tester --name "integration-test"
npx claude-flow@alpha agent spawn --type analyst --name "test-analyzer"

npx claude-flow@alpha task orchestrate "Write integration tests for vouch flow" --strategy parallel
npx claude-flow@alpha task orchestrate "Write integration tests for credit flow" --strategy parallel
npx claude-flow@alpha task orchestrate "Write integration tests for governance flow" --strategy parallel
npx claude-flow@alpha task orchestrate "Write E2E tests for dashboard" --strategy parallel
```

### Agent Types for This Project

| Agent | Use Case |
|-------|----------|
| `coder` | Implement Rust/TypeScript features |
| `tester` | Write and run tests |
| `reviewer` | Code review and quality checks |
| `architect` | Design decisions, ADRs |
| `researcher` | Explore libp2p docs, patterns |
| `analyst` | Performance analysis, bottlenecks |

### Memory Namespaces
```
mycelial-p2p/architecture    # Design decisions
mycelial-p2p/bugs            # Known issues
mycelial-p2p/progress        # Implementation status
mycelial-p2p/sprint-1        # Backend protocol sprint
mycelial-p2p/sprint-2        # WebSocket bridge sprint
mycelial-p2p/sprint-3        # Integration testing sprint
```

## Next Phase: Backend Integration (Phase 7)

The UI layer for all economics features is complete. The next phase focuses on backend integration:

### 7.1 Gossipsub Protocols
- [ ] Vouch protocol (propagate vouches through network)
- [ ] Credit protocol (credit line creation, transfers)
- [ ] Governance protocol (proposals, votes, results)
- [ ] Resource protocol (metrics aggregation)

### 7.2 WebSocket Bridge Extensions
- [ ] Handle vouch messages (send/receive)
- [ ] Handle credit messages (lines, transfers)
- [ ] Handle governance messages (proposals, votes)
- [ ] Handle resource updates (metrics)

### 7.3 State Persistence
- [ ] Vouch storage in SQLite
- [ ] Credit line storage with balances
- [ ] Proposal storage with vote counts
- [ ] Resource metrics aggregation

### 7.4 Integration Testing
- [ ] Multi-node vouch propagation tests
- [ ] Credit transfer flow tests
- [ ] Governance quorum tests
- [ ] E2E dashboard tests (Playwright)

## Testing

```bash
# Run dashboard tests
cd dashboard && pnpm test

# Type check
cd dashboard && npx tsc --noEmit

# Build verification
cd dashboard && pnpm build

# Run Rust tests (if backend is present)
cargo test --workspace

# Run with logging
RUST_LOG=debug cargo test --workspace -- --nocapture
```

**Dashboard Build**: 1071 modules, 1.90s build time

## Design System

The dashboard uses the Univrs.io "Organic Bioluminescence" design system:

### Color Palette (CSS Variables)
```css
--void: #0a0a0f           /* Deep space background */
--deep-earth: #12121a     /* Card backgrounds */
--forest-floor: #1a1a24   /* Elevated surfaces */
--moss: #252532           /* Interactive elements */
--bark: #3a3a4a           /* Borders, dividers */
--soft-gray: #8b8b9b      /* Secondary text */
--mycelium-white: #e8e8ec /* Primary text */
--glow-cyan: #00d4aa      /* Primary accent */
--glow-gold: #ffd700      /* Secondary accent */
--spore-purple: #9b59b6   /* Tertiary accent */
```

### Typography
- Display: Space Grotesk (headings, stats)
- Body: Inter (paragraphs, UI text)
- Mono: JetBrains Mono (code, peer IDs)

## Troubleshooting

### Dashboard not connecting
1. Check WebSocket URL in `dashboard/src/hooks/useP2P.ts`
2. Ensure node is running with `--http-port 8080`
3. Check browser console for CORS errors

### Build failures
1. Run `npx tsc --noEmit` to check for type errors
2. Check for unused imports/variables
3. Verify all component props match their interfaces

### Theme not switching
1. Check CSS variables are defined in `index.css`
2. Verify `data-theme` attribute on document root
3. Check localStorage for saved theme preference

---

*Last Updated: 2025-12-16 - Phase 6 UI complete, Phase 7 backend integration next*
