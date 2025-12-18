import { useState, useMemo } from 'react';
import type { NodeHealth, NodeHealthStatus } from '@/types';

interface NodeStatusProps {
  nodes: Map<string, NodeHealth>;
  onClose?: () => void;
}

const statusConfig: Record<NodeHealthStatus, { color: string; bgColor: string; label: string }> = {
  healthy: { color: 'text-green-400', bgColor: 'bg-green-400/20', label: 'Healthy' },
  degraded: { color: 'text-glow-gold', bgColor: 'bg-glow-gold/20', label: 'Degraded' },
  unhealthy: { color: 'text-red-400', bgColor: 'bg-red-400/20', label: 'Unhealthy' },
  offline: { color: 'text-soft-gray', bgColor: 'bg-soft-gray/20', label: 'Offline' },
  Ready: { color: 'text-green-400', bgColor: 'bg-green-400/20', label: 'Ready' },
  NotReady: { color: 'text-red-400', bgColor: 'bg-red-400/20', label: 'Not Ready' },
};

// Fallback for unknown statuses
const defaultStatusConfig = { color: 'text-soft-gray', bgColor: 'bg-soft-gray/20', label: 'Unknown' };
const getStatusConfig = (status: string) => statusConfig[status as NodeHealthStatus] ?? defaultStatusConfig;

// Helper to calculate usage percentage from capacity and allocatable
function calcUsage(capacity: number | undefined, allocatable: number | undefined): number {
  if (!capacity || capacity === 0) return 0;
  const used = capacity - (allocatable ?? 0);
  return Math.round((used / capacity) * 100);
}

// Helper to get CPU usage - supports both real API and mock formats
function getCpuUsage(node: NodeHealth): number {
  // Real API: calculate from capacity/allocatable
  if (node.resources_capacity?.cpu_cores) {
    return calcUsage(node.resources_capacity.cpu_cores, node.resources_allocatable?.cpu_cores);
  }
  // Mock format: direct usage
  return node.cpu?.usage ?? 0;
}

// Helper to get memory usage percentage
function getMemoryUsage(node: NodeHealth): number {
  // Real API: calculate from capacity/allocatable
  if (node.resources_capacity?.memory_mb) {
    return calcUsage(node.resources_capacity.memory_mb, node.resources_allocatable?.memory_mb);
  }
  // Mock format: calculate from used/total
  if (node.memory?.total && node.memory.total > 0) {
    return Math.round((node.memory.used / node.memory.total) * 100);
  }
  return 0;
}

// Helper to get disk usage percentage
function getDiskUsage(node: NodeHealth): number {
  // Real API: calculate from capacity/allocatable
  if (node.resources_capacity?.disk_mb) {
    return calcUsage(node.resources_capacity.disk_mb, node.resources_allocatable?.disk_mb);
  }
  // Mock format: calculate from used/total
  if (node.disk?.total && node.disk.total > 0) {
    return Math.round((node.disk.used / node.disk.total) * 100);
  }
  return 0;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
}

function formatMB(mb: number): string {
  if (mb < 1024) return `${mb} MB`;
  return `${(mb / 1024).toFixed(1)} GB`;
}

function formatDuration(seconds: number): string {
  const days = Math.floor(seconds / 86400);
  const hours = Math.floor((seconds % 86400) / 3600);
  const mins = Math.floor((seconds % 3600) / 60);

  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${mins}m`;
  return `${mins}m`;
}

function formatTimeAgo(timestamp: number | undefined): string {
  if (!timestamp) return 'Unknown';
  const diff = Date.now() - timestamp;
  const seconds = Math.floor(diff / 1000);

  if (seconds < 10) return 'Just now';
  if (seconds < 60) return `${seconds}s ago`;
  return `${Math.floor(seconds / 60)}m ago`;
}

export function NodeStatus({ nodes, onClose }: NodeStatusProps) {
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const [filterStatus, setFilterStatus] = useState<'all' | NodeHealthStatus>('all');

  const filteredNodes = useMemo(() => {
    let filtered = Array.from(nodes.values());

    if (filterStatus !== 'all') {
      // Handle status grouping (Ready=healthy, NotReady=unhealthy)
      if (filterStatus === 'healthy') {
        filtered = filtered.filter(n => n.status === 'healthy' || n.status === 'Ready');
      } else if (filterStatus === 'unhealthy') {
        filtered = filtered.filter(n => n.status === 'unhealthy' || n.status === 'NotReady');
      } else {
        filtered = filtered.filter(n => n.status === filterStatus);
      }
    }

    return filtered.sort((a, b) => {
      const statusOrder: Record<NodeHealthStatus, number> = {
        unhealthy: 0, NotReady: 1, degraded: 2, healthy: 3, Ready: 4, offline: 5
      };
      const orderA = statusOrder[a.status] ?? 99;
      const orderB = statusOrder[b.status] ?? 99;
      return orderA - orderB;
    });
  }, [nodes, filterStatus]);

  const selectedNode = selectedNodeId ? nodes.get(selectedNodeId) : null;

  const stats = useMemo(() => {
    const all = Array.from(nodes.values());
    return {
      total: all.length,
      healthy: all.filter(n => n.status === 'healthy' || n.status === 'Ready').length,
      degraded: all.filter(n => n.status === 'degraded').length,
      unhealthy: all.filter(n => n.status === 'unhealthy' || n.status === 'NotReady').length,
      offline: all.filter(n => n.status === 'offline').length,
    };
  }, [nodes]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm">
      <div className="w-full max-w-6xl max-h-[90vh] bg-forest-floor border border-border-subtle rounded-xl shadow-card overflow-hidden">
        {/* Header */}
        <div className="relative px-6 py-4 bg-deep-earth border-b border-border-subtle">
          <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-glow-cyan via-spore-purple to-glow-gold" />
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-display font-bold text-mycelium-white flex items-center gap-3">
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-spore-purple">
                  <rect x="2" y="2" width="20" height="8" rx="2" />
                  <rect x="2" y="14" width="20" height="8" rx="2" />
                  <circle cx="6" cy="6" r="1" fill="currentColor" />
                  <circle cx="6" cy="18" r="1" fill="currentColor" />
                </svg>
                Node Status
              </h2>
              <p className="text-sm text-soft-gray font-body">
                Real-time monitoring of cluster nodes
              </p>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-soft-gray hover:text-mycelium-white transition-colors"
              >
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Stats */}
          <div className="grid grid-cols-5 gap-2 mt-4">
            {[
              { label: 'Total', value: stats.total, color: 'text-mycelium-white', status: 'all' as const },
              { label: 'Healthy', value: stats.healthy, color: 'text-green-400', status: 'healthy' as const },
              { label: 'Degraded', value: stats.degraded, color: 'text-glow-gold', status: 'degraded' as const },
              { label: 'Unhealthy', value: stats.unhealthy, color: 'text-red-400', status: 'unhealthy' as const },
              { label: 'Offline', value: stats.offline, color: 'text-soft-gray', status: 'offline' as const },
            ].map(stat => (
              <button
                key={stat.label}
                onClick={() => setFilterStatus(stat.status)}
                className={`text-center p-2 rounded-lg transition-colors ${
                  filterStatus === stat.status
                    ? 'bg-glow-cyan/20 ring-1 ring-glow-cyan'
                    : 'bg-moss hover:bg-moss/80'
                }`}
              >
                <div className={`text-lg font-display font-bold ${stat.color}`}>{stat.value}</div>
                <div className="text-xs text-soft-gray uppercase tracking-wider">{stat.label}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex h-[calc(90vh-180px)]">
          {/* Node List */}
          <div className="w-1/2 border-r border-border-subtle overflow-y-auto p-4">
            <div className="space-y-2">
              {filteredNodes.map((node) => {
                const config = getStatusConfig(node.status);
                const cpuUsage = getCpuUsage(node);
                const memUsage = getMemoryUsage(node);

                return (
                  <button
                    key={node.nodeId}
                    onClick={() => setSelectedNodeId(node.nodeId)}
                    className={`w-full p-4 rounded-lg text-left transition-all ${
                      selectedNodeId === node.nodeId
                        ? 'bg-glow-cyan/10 border border-glow-cyan/50'
                        : 'bg-moss hover:bg-moss/80 border border-transparent'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <div className={`w-2 h-2 rounded-full ${config.bgColor.replace('/20', '')} animate-pulse`} />
                        <span className="font-display font-semibold text-mycelium-white">
                          {node.nodeName}
                        </span>
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-display uppercase ${config.color} ${config.bgColor}`}>
                        {config.label}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <div className="text-soft-gray/60">CPU</div>
                        <div className="text-glow-cyan font-display">{cpuUsage}%</div>
                      </div>
                      <div>
                        <div className="text-soft-gray/60">Memory</div>
                        <div className="text-spore-purple font-display">{memUsage}%</div>
                      </div>
                      <div>
                        <div className="text-soft-gray/60">Disk</div>
                        <div className="text-glow-gold font-display">{getDiskUsage(node)}%</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 mt-2 text-xs text-soft-gray">
                      {node.address && <span className="text-glow-cyan/70 font-mono">{node.address}</span>}
                      {node.lastHeartbeat && <span>Last heartbeat: {formatTimeAgo(node.lastHeartbeat)}</span>}
                      {node.region && <span className="text-glow-cyan/70">{node.region}</span>}
                    </div>
                  </button>
                );
              })}

              {filteredNodes.length === 0 && (
                <div className="text-center py-12">
                  <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-moss flex items-center justify-center">
                    <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-soft-gray">
                      <rect x="2" y="2" width="20" height="8" rx="2" />
                      <rect x="2" y="14" width="20" height="8" rx="2" />
                    </svg>
                  </div>
                  <p className="text-soft-gray">No nodes found</p>
                </div>
              )}
            </div>
          </div>

          {/* Node Details */}
          <div className="w-1/2 overflow-y-auto p-4">
            {selectedNode ? (
              <div className="space-y-4">
                {/* Node Header */}
                <div className="p-4 bg-moss rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <h3 className="text-lg font-display font-bold text-mycelium-white">
                      {selectedNode.nodeName}
                    </h3>
                    <span className={`px-3 py-1 rounded-full text-sm font-display ${getStatusConfig(selectedNode.status).color} ${getStatusConfig(selectedNode.status).bgColor}`}>
                      {getStatusConfig(selectedNode.status).label}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-sm text-soft-gray">
                    <div>ID: <span className="text-mycelium-white font-mono text-xs">{selectedNode.nodeId}</span></div>
                    {selectedNode.address && (
                      <div>Address: <span className="text-glow-cyan font-mono text-xs">{selectedNode.address}</span></div>
                    )}
                    {selectedNode.version && (
                      <div>Version: <span className="text-mycelium-white">{selectedNode.version}</span></div>
                    )}
                    {selectedNode.region && (
                      <div>Region: <span className="text-glow-cyan">{selectedNode.region}</span></div>
                    )}
                    {selectedNode.uptime !== undefined && (
                      <div>Uptime: <span className="text-mycelium-white">{formatDuration(selectedNode.uptime)}</span></div>
                    )}
                  </div>
                </div>

                {/* CPU - from real API */}
                <div className="p-4 bg-moss rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-glow-cyan">
                      <rect x="4" y="4" width="16" height="16" rx="2" />
                      <rect x="9" y="9" width="6" height="6" />
                      <path d="M9 1v3M15 1v3M9 20v3M15 20v3M20 9h3M20 14h3M1 9h3M1 14h3" />
                    </svg>
                    <h4 className="font-display font-semibold text-mycelium-white">CPU</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <div className="text-xs text-soft-gray">Usage</div>
                      <div className="text-lg font-display text-glow-cyan">{getCpuUsage(selectedNode)}%</div>
                    </div>
                    <div>
                      <div className="text-xs text-soft-gray">Cores</div>
                      <div className="text-lg font-display text-mycelium-white">
                        {selectedNode.resources_capacity?.cpu_cores ?? selectedNode.cpu?.cores ?? '--'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-soft-gray">Available</div>
                      <div className="text-lg font-display text-glow-gold">
                        {selectedNode.resources_allocatable?.cpu_cores ?? '--'}
                      </div>
                    </div>
                  </div>
                  <div className="h-2 bg-bark rounded-full overflow-hidden">
                    <div
                      className={`h-full transition-all duration-500 ${
                        getCpuUsage(selectedNode) > 80 ? 'bg-red-400' :
                        getCpuUsage(selectedNode) > 60 ? 'bg-glow-gold' : 'bg-glow-cyan'
                      }`}
                      style={{ width: `${getCpuUsage(selectedNode)}%` }}
                    />
                  </div>
                </div>

                {/* Memory - from real API */}
                <div className="p-4 bg-moss rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-spore-purple">
                      <rect x="2" y="6" width="20" height="12" rx="2" />
                      <path d="M6 6V4a2 2 0 012-2h8a2 2 0 012 2v2M6 18v2a2 2 0 002 2h8a2 2 0 002-2v-2" />
                    </svg>
                    <h4 className="font-display font-semibold text-mycelium-white">Memory</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <div className="text-xs text-soft-gray">Usage</div>
                      <div className="text-lg font-display text-spore-purple">{getMemoryUsage(selectedNode)}%</div>
                    </div>
                    <div>
                      <div className="text-xs text-soft-gray">Capacity</div>
                      <div className="text-lg font-display text-mycelium-white">
                        {selectedNode.resources_capacity?.memory_mb
                          ? formatMB(selectedNode.resources_capacity.memory_mb)
                          : selectedNode.memory?.total
                            ? formatBytes(selectedNode.memory.total)
                            : '--'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-soft-gray">Available</div>
                      <div className="text-lg font-display text-glow-cyan">
                        {selectedNode.resources_allocatable?.memory_mb
                          ? formatMB(selectedNode.resources_allocatable.memory_mb)
                          : selectedNode.memory?.available
                            ? formatBytes(selectedNode.memory.available)
                            : '--'}
                      </div>
                    </div>
                  </div>
                  <div className="h-2 bg-bark rounded-full overflow-hidden">
                    <div
                      className="h-full bg-spore-purple transition-all duration-500"
                      style={{ width: `${getMemoryUsage(selectedNode)}%` }}
                    />
                  </div>
                </div>

                {/* Disk - from real API */}
                <div className="p-4 bg-moss rounded-lg">
                  <div className="flex items-center gap-2 mb-3">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-glow-gold">
                      <ellipse cx="12" cy="5" rx="9" ry="3" />
                      <path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
                      <path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
                    </svg>
                    <h4 className="font-display font-semibold text-mycelium-white">Disk</h4>
                  </div>
                  <div className="grid grid-cols-3 gap-4 mb-3">
                    <div>
                      <div className="text-xs text-soft-gray">Usage</div>
                      <div className="text-lg font-display text-glow-gold">{getDiskUsage(selectedNode)}%</div>
                    </div>
                    <div>
                      <div className="text-xs text-soft-gray">Capacity</div>
                      <div className="text-lg font-display text-mycelium-white">
                        {selectedNode.resources_capacity?.disk_mb
                          ? formatMB(selectedNode.resources_capacity.disk_mb)
                          : selectedNode.disk?.total
                            ? formatBytes(selectedNode.disk.total)
                            : '--'}
                      </div>
                    </div>
                    <div>
                      <div className="text-xs text-soft-gray">Available</div>
                      <div className="text-lg font-display text-glow-cyan">
                        {selectedNode.resources_allocatable?.disk_mb
                          ? formatMB(selectedNode.resources_allocatable.disk_mb)
                          : '--'}
                      </div>
                    </div>
                  </div>
                  <div className="h-2 bg-bark rounded-full overflow-hidden">
                    <div
                      className="h-full bg-glow-gold transition-all duration-500"
                      style={{ width: `${getDiskUsage(selectedNode)}%` }}
                    />
                  </div>
                </div>

                {/* Network - only show if data available */}
                {selectedNode.network && (
                  <div className="p-4 bg-moss rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-glow-cyan">
                        <path d="M22 12h-4l-3 9L9 3l-3 9H2" />
                      </svg>
                      <h4 className="font-display font-semibold text-mycelium-white">Network</h4>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <div className="text-xs text-soft-gray">In</div>
                        <div className="text-sm font-display text-glow-cyan">{formatBytes(selectedNode.network.bytesIn)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-soft-gray">Out</div>
                        <div className="text-sm font-display text-spore-purple">{formatBytes(selectedNode.network.bytesOut)}</div>
                      </div>
                      <div>
                        <div className="text-xs text-soft-gray">Connections</div>
                        <div className="text-sm font-display text-mycelium-white">{selectedNode.network.connections}</div>
                      </div>
                      <div>
                        <div className="text-xs text-soft-gray">Latency</div>
                        <div className="text-sm font-display text-glow-gold">{selectedNode.network.latency}ms</div>
                      </div>
                    </div>
                  </div>
                )}

                {/* Workloads - only show if data available */}
                {selectedNode.workloads && (
                  <div className="p-4 bg-moss rounded-lg">
                    <div className="flex items-center gap-2 mb-3">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-glow-gold">
                        <rect x="3" y="3" width="18" height="18" rx="2" />
                        <path d="M9 3v18M15 3v18M3 9h18M3 15h18" />
                      </svg>
                      <h4 className="font-display font-semibold text-mycelium-white">Workloads</h4>
                    </div>
                    <div className="grid grid-cols-4 gap-4">
                      <div className="text-center p-2 bg-bark rounded-lg">
                        <div className="text-lg font-display text-glow-cyan">{selectedNode.workloads.running}</div>
                        <div className="text-xs text-soft-gray">Running</div>
                      </div>
                      <div className="text-center p-2 bg-bark rounded-lg">
                        <div className="text-lg font-display text-glow-gold">{selectedNode.workloads.queued}</div>
                        <div className="text-xs text-soft-gray">Queued</div>
                      </div>
                      <div className="text-center p-2 bg-bark rounded-lg">
                        <div className="text-lg font-display text-green-400">{selectedNode.workloads.completed}</div>
                        <div className="text-xs text-soft-gray">Done</div>
                      </div>
                      <div className="text-center p-2 bg-bark rounded-lg">
                        <div className="text-lg font-display text-red-400">{selectedNode.workloads.failed}</div>
                        <div className="text-xs text-soft-gray">Failed</div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center">
                  <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-moss flex items-center justify-center">
                    <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-soft-gray">
                      <rect x="2" y="2" width="20" height="8" rx="2" />
                      <rect x="2" y="14" width="20" height="8" rx="2" />
                      <circle cx="6" cy="6" r="1" fill="currentColor" />
                      <circle cx="6" cy="18" r="1" fill="currentColor" />
                    </svg>
                  </div>
                  <p className="text-soft-gray">Select a node to view details</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
