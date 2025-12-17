import { useEffect, useRef, useState, useCallback } from 'react';
import type { Workload, NodeHealth, ClusterMetrics, OrchestratorEvent } from '../types';

interface UseOrchestratorOptions {
  wsUrl?: string;
  apiUrl?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  autoConnect?: boolean;
}

interface OrchestratorState {
  connected: boolean;
  loading: boolean;
  error: string | null;
  workloads: Map<string, Workload>;
  nodes: Map<string, NodeHealth>;
  clusterMetrics: ClusterMetrics | null;
}

// Environment configuration - configurable via env vars or options
const ENV_WS_URL = import.meta.env.VITE_ORCHESTRATOR_WS_URL || import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws';
const ENV_API_URL = import.meta.env.VITE_ORCHESTRATOR_API_URL || import.meta.env.VITE_API_URL || 'http://localhost:8080/api';

export function useOrchestrator(options: UseOrchestratorOptions = {}) {
  const {
    wsUrl = ENV_WS_URL,
    apiUrl = ENV_API_URL,
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
    autoConnect = true,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number>();
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);

  const [state, setState] = useState<OrchestratorState>({
    connected: false,
    loading: false,
    error: null,
    workloads: new Map(),
    nodes: new Map(),
    clusterMetrics: null,
  });

  // Handle incoming WebSocket messages for real-time updates
  const handleMessage = useCallback((event: OrchestratorEvent) => {
    console.log('Orchestrator event:', event);

    switch (event.type) {
      case 'workload_list': {
        const workloads = (event.data as Workload[]) || [];
        setState(s => {
          const newWorkloads = new Map(s.workloads);
          for (const workload of workloads) {
            newWorkloads.set(workload.id, workload);
          }
          return { ...s, workloads: newWorkloads };
        });
        break;
      }

      case 'workload_created':
      case 'workload_updated': {
        const workload = event.data as Workload;
        setState(s => {
          const newWorkloads = new Map(s.workloads);
          newWorkloads.set(workload.id, workload);
          return { ...s, workloads: newWorkloads };
        });
        break;
      }

      case 'workload_completed':
      case 'workload_failed': {
        const workload = event.data as Workload;
        setState(s => {
          const newWorkloads = new Map(s.workloads);
          newWorkloads.set(workload.id, workload);
          return { ...s, workloads: newWorkloads };
        });
        break;
      }

      case 'node_list': {
        const nodes = (event.data as NodeHealth[]) || [];
        setState(s => {
          const newNodes = new Map(s.nodes);
          for (const node of nodes) {
            newNodes.set(node.nodeId, node);
          }
          return { ...s, nodes: newNodes };
        });
        break;
      }

      case 'node_status':
      case 'node_joined': {
        const node = event.data as NodeHealth;
        setState(s => {
          const newNodes = new Map(s.nodes);
          newNodes.set(node.nodeId, node);
          return { ...s, nodes: newNodes };
        });
        break;
      }

      case 'node_left': {
        const nodeId = (event.data as { nodeId: string }).nodeId;
        setState(s => {
          const newNodes = new Map(s.nodes);
          newNodes.delete(nodeId);
          return { ...s, nodes: newNodes };
        });
        break;
      }

      case 'cluster_metrics': {
        const metrics = event.data as ClusterMetrics;
        setState(s => ({ ...s, clusterMetrics: metrics }));
        break;
      }
    }
  }, []);

  // Fetch workloads from REST API
  const fetchWorkloads = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/orchestrator/workloads`);
      if (!response.ok) {
        throw new Error(`Failed to fetch workloads: ${response.status}`);
      }
      const data = await response.json();
      const workloads = new Map<string, Workload>();
      const workloadList = Array.isArray(data) ? data : data.workloads || [];
      for (const w of workloadList) {
        workloads.set(w.id, w);
      }
      setState(s => ({ ...s, workloads, error: null }));
      return workloads;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch workloads';
      console.error('Failed to fetch workloads:', errorMsg);
      setState(s => ({ ...s, error: errorMsg }));
      throw err;
    }
  }, [apiUrl]);

  // Fetch nodes from REST API
  const fetchNodes = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/orchestrator/nodes`);
      if (!response.ok) {
        throw new Error(`Failed to fetch nodes: ${response.status}`);
      }
      const data = await response.json();
      const nodes = new Map<string, NodeHealth>();
      const nodeList = Array.isArray(data) ? data : data.nodes || [];
      for (const n of nodeList) {
        nodes.set(n.nodeId, n);
      }
      setState(s => ({ ...s, nodes, error: null }));
      return nodes;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch nodes';
      console.error('Failed to fetch nodes:', errorMsg);
      setState(s => ({ ...s, error: errorMsg }));
      throw err;
    }
  }, [apiUrl]);

  // Fetch cluster metrics from REST API
  const fetchClusterMetrics = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/orchestrator/metrics`);
      if (!response.ok) {
        throw new Error(`Failed to fetch cluster metrics: ${response.status}`);
      }
      const data = await response.json();
      const clusterMetrics = data.cluster || data;
      setState(s => ({ ...s, clusterMetrics, error: null }));
      return clusterMetrics;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch cluster metrics';
      console.error('Failed to fetch cluster metrics:', errorMsg);
      setState(s => ({ ...s, error: errorMsg }));
      throw err;
    }
  }, [apiUrl]);

  // Fetch all orchestrator data
  const fetchOrchestratorData = useCallback(async () => {
    setState(s => ({ ...s, loading: true, error: null }));
    try {
      await Promise.all([
        fetchWorkloads(),
        fetchNodes(),
        fetchClusterMetrics(),
      ]);
      setState(s => ({ ...s, loading: false }));
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to fetch orchestrator data';
      setState(s => ({ ...s, loading: false, error: errorMsg }));
    }
  }, [fetchWorkloads, fetchNodes, fetchClusterMetrics]);

  // Connect to WebSocket for real-time updates
  const connect = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    // Check if we've exceeded max reconnect attempts
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.warn(`Orchestrator: Max reconnect attempts (${maxReconnectAttempts}) reached. Stopping reconnection.`);
      setState(s => ({
        ...s,
        connected: false,
        loading: false,
        error: `Connection failed after ${maxReconnectAttempts} attempts. Server may be unavailable.`,
      }));
      return;
    }

    isConnectingRef.current = true;
    console.log(`Connecting to orchestrator WebSocket: ${wsUrl} (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);
    setState(s => ({ ...s, loading: true, error: null }));

    try {
      const ws = new WebSocket(wsUrl);

      ws.onopen = () => {
        console.log('Orchestrator WebSocket connected!');
        isConnectingRef.current = false;
        reconnectAttemptsRef.current = 0; // Reset on successful connection
        setState(s => ({ ...s, connected: true, loading: false, error: null }));

        // Fetch initial data via REST API
        fetchOrchestratorData();

        // Subscribe to orchestrator events for real-time updates
        ws.send(JSON.stringify({ type: 'subscribe', topic: 'orchestrator' }));
        ws.send(JSON.stringify({ type: 'subscribe', topic: 'workloads' }));
        ws.send(JSON.stringify({ type: 'subscribe', topic: 'nodes' }));
        ws.send(JSON.stringify({ type: 'subscribe', topic: 'cluster' }));
      };

      ws.onclose = (event) => {
        console.log('Orchestrator WebSocket disconnected:', event.code, event.reason);
        isConnectingRef.current = false;
        wsRef.current = null;
        setState(s => ({ ...s, connected: false }));

        // Auto-reconnect with exponential backoff if not a clean close
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          // Exponential backoff: 3s, 6s, 12s, 24s, 48s...
          const backoffDelay = reconnectInterval * Math.pow(2, reconnectAttemptsRef.current - 1);
          console.log(`Orchestrator: Reconnecting in ${backoffDelay / 1000}s...`);
          reconnectTimerRef.current = window.setTimeout(connect, backoffDelay);
        }
      };

      ws.onerror = () => {
        // Don't log the full error object as it's not useful
        console.warn('Orchestrator WebSocket connection error');
        isConnectingRef.current = false;
        setState(s => ({
          ...s,
          connected: false,
          loading: false,
          error: 'WebSocket connection failed',
        }));
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          // Handle orchestrator events for real-time updates
          if (
            message.type?.startsWith('workload_') ||
            message.type?.startsWith('node_') ||
            message.type === 'cluster_metrics' ||
            message.type === 'workload_list' ||
            message.type === 'node_list'
          ) {
            handleMessage(message as OrchestratorEvent);
          }
        } catch (e) {
          console.error('Failed to parse orchestrator message:', e);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to connect to WebSocket';
      console.error('WebSocket connection error:', errorMsg);
      isConnectingRef.current = false;
      setState(s => ({ ...s, loading: false, error: errorMsg }));
    }
  }, [wsUrl, reconnectInterval, maxReconnectAttempts, handleMessage, fetchOrchestratorData]);

  const disconnect = useCallback(() => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
      reconnectTimerRef.current = undefined;
    }
    reconnectAttemptsRef.current = 0;
    isConnectingRef.current = false;
    if (wsRef.current) {
      wsRef.current.close(1000, 'Client disconnect');
      wsRef.current = null;
    }
  }, []);

  // Reset connection state and retry connecting
  const resetConnection = useCallback(() => {
    disconnect();
    // Small delay before reconnecting
    setTimeout(() => connect(), 100);
  }, [disconnect, connect]);

  // Send workload command via WebSocket (for real-time actions)
  const sendWorkloadCommand = useCallback((command: string, workloadId: string, data?: unknown) => {
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(
        JSON.stringify({
          type: `workload_${command}`,
          workloadId,
          data,
        })
      );
    }
  }, []);

  // Create a new workload via REST API
  const createWorkload = useCallback(
    async (workload: Omit<Workload, 'id' | 'createdAt' | 'progress'>) => {
      try {
        const response = await fetch(`${apiUrl}/orchestrator/workloads`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(workload),
        });

        if (!response.ok) {
          throw new Error(`Failed to create workload: ${response.status}`);
        }

        const newWorkload = await response.json();

        // Update local state with server response
        setState(s => {
          const newWorkloads = new Map(s.workloads);
          newWorkloads.set(newWorkload.id, newWorkload);
          return { ...s, workloads: newWorkloads };
        });

        return newWorkload;
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to create workload';
        console.error('Create workload error:', errorMsg);
        setState(s => ({ ...s, error: errorMsg }));
        throw err;
      }
    },
    [apiUrl]
  );

  // Cancel a workload via REST API
  const cancelWorkload = useCallback(
    async (workloadId: string) => {
      try {
        const response = await fetch(`${apiUrl}/orchestrator/workloads/${workloadId}/cancel`, {
          method: 'POST',
        });

        if (!response.ok) {
          throw new Error(`Failed to cancel workload: ${response.status}`);
        }

        // Optimistically update local state
        setState(s => {
          const newWorkloads = new Map(s.workloads);
          const workload = newWorkloads.get(workloadId);
          if (workload) {
            newWorkloads.set(workloadId, { ...workload, status: 'cancelled' });
          }
          return { ...s, workloads: newWorkloads };
        });

        // Also notify via WebSocket for real-time sync
        sendWorkloadCommand('cancel', workloadId);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to cancel workload';
        console.error('Cancel workload error:', errorMsg);
        setState(s => ({ ...s, error: errorMsg }));
        throw err;
      }
    },
    [apiUrl, sendWorkloadCommand]
  );

  // Retry a failed workload via REST API
  const retryWorkload = useCallback(
    async (workloadId: string) => {
      try {
        const response = await fetch(`${apiUrl}/orchestrator/workloads/${workloadId}/retry`, {
          method: 'POST',
        });

        if (!response.ok) {
          throw new Error(`Failed to retry workload: ${response.status}`);
        }

        // Optimistically update local state
        setState(s => {
          const newWorkloads = new Map(s.workloads);
          const workload = newWorkloads.get(workloadId);
          if (workload) {
            newWorkloads.set(workloadId, { ...workload, status: 'pending', progress: 0 });
          }
          return { ...s, workloads: newWorkloads };
        });

        // Also notify via WebSocket for real-time sync
        sendWorkloadCommand('retry', workloadId);
      } catch (err) {
        const errorMsg = err instanceof Error ? err.message : 'Failed to retry workload';
        console.error('Retry workload error:', errorMsg);
        setState(s => ({ ...s, error: errorMsg }));
        throw err;
      }
    },
    [apiUrl, sendWorkloadCommand]
  );

  // Clear error state
  const clearError = useCallback(() => {
    setState(s => ({ ...s, error: null }));
  }, []);

  // Auto-connect on mount if autoConnect is enabled
  useEffect(() => {
    if (autoConnect) {
      connect();
    }
    return () => disconnect();
  }, [autoConnect, connect, disconnect]);

  return {
    // State
    ...state,
    // Connection methods
    connect,
    disconnect,
    resetConnection,
    // Workload operations
    createWorkload,
    cancelWorkload,
    retryWorkload,
    // Data fetching
    refreshData: fetchOrchestratorData,
    fetchWorkloads,
    fetchNodes,
    fetchClusterMetrics,
    // Utilities
    clearError,
  };
}
