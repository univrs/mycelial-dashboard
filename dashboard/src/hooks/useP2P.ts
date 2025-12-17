import { useEffect, useRef, useState, useCallback } from 'react';
import type { ChatMessage, GraphNode, GraphLink, NormalizedPeer } from '../types';

interface UseP2POptions {
  url?: string;
  reconnectInterval?: number;
  maxReconnectAttempts?: number;
  apiUrl?: string;
}

interface P2PState {
  connected: boolean;
  localPeerId: string | null;
  peers: Map<string, NormalizedPeer>;
  messages: ChatMessage[];
}

// Normalize peer data from different backend formats
function normalizePeer(peer: any): NormalizedPeer {
  const id = peer.id || peer.peer_id || '';
  const name = peer.name || peer.display_name || `Peer-${id.slice(0, 12)}`;
  const reputation = typeof peer.reputation === 'number' 
    ? peer.reputation 
    : (peer.reputation?.score ?? 0.5);
  
  return {
    id,
    name,
    reputation,
    location: peer.location,
    addresses: peer.addresses || [],
  };
}

export function useP2P(options: UseP2POptions = {}) {
  const {
    url = import.meta.env.VITE_WS_URL || 'ws://localhost:8080/ws',
    apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8080',
    reconnectInterval = 3000,
    maxReconnectAttempts = 5,
  } = options;

  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimerRef = useRef<number>();
  const reconnectAttemptsRef = useRef(0);
  const isConnectingRef = useRef(false);

  const [state, setState] = useState<P2PState>({
    connected: false,
    localPeerId: null,
    peers: new Map(),
    messages: [],
  });

  // Fetch peers via REST API (more reliable than WebSocket for initial load)
  const fetchPeers = useCallback(async () => {
    try {
      console.log('Fetching peers from:', `${apiUrl}/api/peers`);
      const response = await fetch(`${apiUrl}/api/peers`);
      const peers = await response.json();
      console.log('REST API returned', peers.length, 'peers');
      
      setState(s => {
        const newPeers = new Map<string, NormalizedPeer>();
        for (const peer of peers) {
          const normalized = normalizePeer(peer);
          if (normalized.id) {
            newPeers.set(normalized.id, normalized);
          }
        }
        console.log('Normalized peers:', newPeers.size);
        return { ...s, peers: newPeers };
      });
    } catch (e) {
      console.error('Failed to fetch peers:', e);
    }
  }, [apiUrl]);

  // Fetch local peer info
  const fetchInfo = useCallback(async () => {
    try {
      const response = await fetch(`${apiUrl}/api/info`);
      const info = await response.json();
      console.log('Local node info:', info);
      setState(s => ({ ...s, localPeerId: info.peer_id }));
    } catch (e) {
      console.error('Failed to fetch info:', e);
    }
  }, [apiUrl]);

  const handleMessage = useCallback((message: any) => {
    console.log('WS Message:', message);
    
    switch (message.type) {
      case 'peers_list': {
        const peers = message.peers || message.data?.peers || [];
        setState(s => {
          const newPeers = new Map(s.peers);
          for (const peer of peers) {
            const normalized = normalizePeer(peer);
            if (normalized.id) {
              newPeers.set(normalized.id, normalized);
            }
          }
          return { ...s, peers: newPeers };
        });
        break;
      }

      case 'peer_joined': {
        const peerId = message.peer_id || message.data?.peer_id;
        const peerInfo = message.peer_info || message.data?.peer_info || message;
        if (peerId) {
          setState(s => {
            const newPeers = new Map(s.peers);
            const normalized = normalizePeer({ ...peerInfo, id: peerId });
            newPeers.set(peerId, normalized);
            return { ...s, peers: newPeers };
          });
        }
        break;
      }

      case 'peer_left': {
        const peerId = message.peer_id || message.data?.peer_id;
        if (peerId) {
          setState(s => {
            const newPeers = new Map(s.peers);
            newPeers.delete(peerId);
            return { ...s, peers: newPeers };
          });
        }
        break;
      }

      case 'chat_message':
        setState(s => ({
          ...s,
          messages: [...s.messages.slice(-99), message.data || message],
        }));
        break;

      default:
        console.log('Unhandled message type:', message.type);
    }
  }, []);

  const connect = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current) return;
    if (wsRef.current?.readyState === WebSocket.OPEN) return;
    if (wsRef.current?.readyState === WebSocket.CONNECTING) return;

    // Check if we've exceeded max reconnect attempts
    if (reconnectAttemptsRef.current >= maxReconnectAttempts) {
      console.warn(`P2P: Max reconnect attempts (${maxReconnectAttempts}) reached. Stopping reconnection.`);
      return;
    }

    isConnectingRef.current = true;
    console.log(`Connecting to P2P WebSocket: ${url} (attempt ${reconnectAttemptsRef.current + 1}/${maxReconnectAttempts})`);

    try {
      const ws = new WebSocket(url);

      ws.onopen = () => {
        console.log('P2P WebSocket connected!');
        isConnectingRef.current = false;
        reconnectAttemptsRef.current = 0; // Reset on successful connection
        setState(s => ({ ...s, connected: true }));
        // Fetch data via REST (more reliable)
        fetchInfo();
        fetchPeers();
      };

      ws.onclose = (event) => {
        console.log('P2P WebSocket disconnected:', event.code);
        isConnectingRef.current = false;
        wsRef.current = null;
        setState(s => ({ ...s, connected: false }));

        // Auto-reconnect with exponential backoff if not a clean close
        if (event.code !== 1000 && reconnectAttemptsRef.current < maxReconnectAttempts) {
          reconnectAttemptsRef.current++;
          // Exponential backoff: 3s, 6s, 12s, 24s, 48s...
          const backoffDelay = reconnectInterval * Math.pow(2, reconnectAttemptsRef.current - 1);
          console.log(`P2P: Reconnecting in ${backoffDelay / 1000}s...`);
          reconnectTimerRef.current = window.setTimeout(connect, backoffDelay);
        }
      };

      ws.onerror = () => {
        // Don't log the full error object as it's not useful
        console.warn('P2P WebSocket connection error');
        isConnectingRef.current = false;
      };

      ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          handleMessage(message);
        } catch (e) {
          console.error('Failed to parse message:', e, event.data);
        }
      };

      wsRef.current = ws;
    } catch (err) {
      console.error('P2P WebSocket connection error:', err);
      isConnectingRef.current = false;
    }
  }, [url, reconnectInterval, maxReconnectAttempts, handleMessage, fetchPeers, fetchInfo]);

  const sendChat = useCallback((content: string, to?: string) => {
    console.log('sendChat called:', { content, to, readyState: wsRef.current?.readyState });

    if (wsRef.current?.readyState !== WebSocket.OPEN) {
      console.warn('WebSocket not open! State:', wsRef.current?.readyState);
      return;
    }

    const message = JSON.stringify({ type: 'send_chat', content, to });
    console.log('Sending via WebSocket:', message);
    wsRef.current.send(message);

    // Optimistically add our own message to local state
    // (gossipsub doesn't echo messages back to the sender)
    setState(s => {
      const localId = s.localPeerId || 'unknown';
      const shortId = localId.slice(0, 8);
      const chatMessage: ChatMessage = {
        id: `local-${Date.now()}`,
        from: localId,
        from_name: `Peer-${shortId} (you)`,
        to: to || undefined,
        content,
        timestamp: Date.now(),
      };
      return {
        ...s,
        messages: [...s.messages.slice(-99), chatMessage],
      };
    });
  }, []);

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
    setTimeout(() => connect(), 100);
  }, [disconnect, connect]);

  useEffect(() => {
    connect();
    return () => disconnect();
  }, [connect, disconnect]);

  const graphData = useCallback((): { nodes: GraphNode[]; links: GraphLink[] } => {
    const nodes: GraphNode[] = Array.from(state.peers.values()).map(peer => ({
      id: peer.id,
      name: peer.name,
      reputation: peer.reputation,
      location: peer.location,
      isLocal: peer.id === state.localPeerId,
    }));

    // Create mesh links between peers
    const links: GraphLink[] = [];
    const peerIds = Array.from(state.peers.keys());
    for (let i = 0; i < peerIds.length; i++) {
      for (let j = i + 1; j < peerIds.length; j++) {
        links.push({ source: peerIds[i], target: peerIds[j] });
      }
    }

    return { nodes, links };
  }, [state.peers, state.localPeerId]);

  return {
    ...state,
    sendChat,
    disconnect,
    resetConnection,
    graphData,
    refreshPeers: fetchPeers,
  };
}