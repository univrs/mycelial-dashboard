# MyceliaNetwork Repository Analysis & Consolidation

## Current State

### ~/repos/MyceliaNetwork (Older)

```
MyceliaNetwork/
├── CLAUDE.md                    # AI instructions
├── README.md                    # Project overview
├── Skills/                      # ✅ VALUABLE - Skills framework
│   ├── CLAUDE.md
│   ├── CrossPlatformBridge/
│   ├── MathEngineIntegration/
│   └── MyceliaNetworkNodeDeployer/
├── docs/                        # ✅ VALUABLE - Documentation
│   ├── MetaSkills/
│   ├── MetaSkills.md
│   ├── QuickStart.md
│   ├── milestones/
│   └── planetserve-integration.md
├── demo.sh
└── mycelia/                     # ⚠️ SUPERSEDED by mycelial-dashboard
    ├── Cargo.toml
    ├── mycelia-simple/
    └── src/
```

### ~/repos/mycelial-dashboard (Newer, Active)

```
mycelial-dashboard/
├── crates/                      # ✅ ACTIVE - Modern P2P implementation
│   ├── mycelial-core/           # PeerId, PeerInfo, Reputation
│   ├── mycelial-network/        # libp2p integration
│   ├── mycelial-node/           # P2P binary + HTTP server
│   ├── mycelial-protocol/       # Wire protocol
│   ├── mycelial-state/          # SQLite persistence
│   └── mycelial-wasm/           # Browser P2P nodes
├── dashboard/                   # ✅ ACTIVE - React UI
│   └── src/
├── coordination/                # AI agent coordination
└── memory/                      # Agent state
```

---

## Analysis

### What's Valuable in MyceliaNetwork

| Component | Value | Recommendation |
|-----------|-------|----------------|
| `Skills/` | HIGH | Move to dedicated skills repo or keep for MetaLearn |
| `docs/` | MEDIUM | Archive or migrate relevant docs |
| `mycelia/` | LOW | Superseded - delete or archive |

### What's Active in mycelial-dashboard

| Component | Status | Notes |
|-----------|--------|-------|
| `crates/` | ACTIVE | Modern 6-crate workspace, libp2p |
| `dashboard/` | ACTIVE | React + d3 force-graph |
| Root | ACTIVE | Workspace Cargo.toml |

### Conflicts / Overlaps

1. **P2P Code**: `MyceliaNetwork/mycelia/` vs `mycelial-dashboard/crates/`
   - mycelial-dashboard is more complete and modern
   - Uses libp2p properly
   - Has WASM support

2. **Naming**: Both use "mycelial" but different structures
   - Could cause confusion

3. **Skills**: Only exists in MyceliaNetwork
   - Should be preserved and potentially elevated

---

## Proposed Consolidation

### Option A: Archive MyceliaNetwork, Enhance mycelial-dashboard

```
ARCHIVE:
  MyceliaNetwork/mycelia/ → Delete (superseded)
  
MIGRATE:
  MyceliaNetwork/Skills/  → mycelial-dashboard/skills/ OR separate repo
  MyceliaNetwork/docs/    → mycelial-dashboard/docs/legacy/
  
ENHANCE:
  mycelial-dashboard/ontology/  → New P2P ontology specs
```

### Option B: Rename and Consolidate into Single Repo

```
RENAME:
  mycelial-dashboard → univrs-network (or mycelial-network)

STRUCTURE:
  univrs-network/
  ├── crates/              # Rust P2P implementation
  ├── dashboard/           # React UI
  ├── skills/              # Migrated from MyceliaNetwork
  ├── ontology/            # New DOL specs
  └── docs/                # Consolidated docs

ARCHIVE:
  MyceliaNetwork → Archive or delete entirely
```

### Option C: Three-Repo Structure (MetaLearn Focus)

```
univrs-skills/             # Elevated from MyceliaNetwork/Skills
├── CrossPlatformBridge/
├── MathEngineIntegration/
├── MyceliaNetworkNodeDeployer/
└── SKILL-SPEC.md

mycelial-network/          # Renamed from mycelial-dashboard
├── crates/
├── dashboard/
├── ontology/
└── docs/

MyceliaNetwork/            # Archive or delete
```

---

## Recommended: Option A (Minimal Disruption)

### Step 1: Clean up MyceliaNetwork

```bash
# Archive old code
cd ~/repos/MyceliaNetwork
mkdir -p archive
mv mycelia/ archive/mycelia-legacy/

# Keep Skills and docs at root
# Skills/ stays
# docs/ stays
```

### Step 2: Add ontology to mycelial-dashboard

```bash
cd ~/repos/mycelial-dashboard
mkdir -p ontology/{domains,prospective}
```

### Step 3: Create P2P Ontology Structure

```
mycelial-dashboard/ontology/
├── README.md                    # How ontology relates to code
│
├── domains/                     # Domain-specific ontologies
│   ├── messaging/               # Chat, channels, presence
│   ├── sharing/                 # Collaboration, permissions
│   ├── media/                   # Streaming, encoding
│   ├── content/                 # Assets, versioning
│   └── economics/               # Credits, reputation
│
└── prospective/                 # Future features
    └── ...
```

### Step 4: Decide on Skills location

**Option 4a**: Keep in MyceliaNetwork (as skills reference)
```
MyceliaNetwork/
├── Skills/           # skills.metalearn.org source
└── docs/             # Historical docs
```

**Option 4b**: Move to mycelial-dashboard
```
mycelial-dashboard/
└── skills/           # Integrated with P2P platform
```

**Option 4c**: Create dedicated repo
```
~/repos/univrs-skills/  # For MetaLearn ecosystem
```

---

## P2P Ontology Domains (To Create)

### 1. messaging/ - Real-time Communication

```
messaging/
├── channel.dol           # Channels, threads, DMs
├── message.dol           # Message types, formatting
├── presence.dol          # Online status, typing
├── encryption.dol        # E2E encryption
└── history.dol           # Message persistence
```

### 2. sharing/ - Collaboration

```
sharing/
├── permission.dol        # Access control lists
├── invitation.dol        # Sharing invitations
├── collaboration.dol     # Real-time editing
└── sync.dol              # Conflict resolution (CRDTs)
```

### 3. media/ - Streaming & Content

```
media/
├── streaming.dol         # Live video/audio
├── encoding.dol          # Codec negotiation
├── quality.dol           # Adaptive bitrate
└── relay.dol             # P2P relay/TURN
```

### 4. content/ - Asset Management

```
content/
├── asset.dol             # Files, documents
├── metadata.dol          # Tags, descriptions
├── versioning.dol        # Content history
└── distribution.dol      # P2P content delivery
```

### 5. economics/ - Mycelial Credits

```
economics/
├── credit.dol            # Credit units
├── transfer.dol          # Credit transfers
├── reputation.dol        # Trust scores
└── commitment.dol        # Resource pledges
```

### 6. network/ - P2P Infrastructure

```
network/
├── peer.dol              # Peer identity
├── discovery.dol         # Peer discovery
├── gossip.dol            # Message propagation
├── routing.dol           # DHT, Kademlia
└── transport.dol         # QUIC, WebRTC
```

---

## Immediate Actions

### For You (Architect)

1. **Decide on repo structure** (Option A, B, or C)
2. **Decide on Skills location**
3. **Prioritize which ontology domains first**

### For Claude-Flow (Agent)

Once you decide, I'll create commands for:
1. Repo cleanup/migration
2. Ontology folder structure
3. Initial DOL specs for priority domains

### For Me (Analyst)

Ready to draft DOL specs for any domain you prioritize:
- `messaging/` for chat features?
- `network/` for P2P infrastructure?
- `economics/` for Mycelial Credits?

---

## Questions for You

1. **Which consolidation option?** (A, B, or C)
2. **Where should Skills live?** (MyceliaNetwork, mycelial-dashboard, or new repo)
3. **Which P2P domain to spec first?** (messaging, sharing, media, content, economics, network)
4. **Should MyceliaNetwork/mycelia/ be archived or deleted?**
