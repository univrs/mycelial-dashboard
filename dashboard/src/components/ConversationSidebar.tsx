import { useState } from 'react';
import type { Conversation, Room } from '@/types';

interface ConversationSidebarProps {
  conversations: Map<string, Conversation>;
  rooms: Map<string, Room>;
  activeConversationId: string;
  onSelectConversation: (conversationId: string) => void;
  onCreateRoom: (name: string, description?: string) => void;
  onJoinRoom: (roomId: string) => void;
  onLeaveRoom: (roomId: string) => void;
}

export function ConversationSidebar({
  conversations,
  rooms: _rooms, // Available for room discovery
  activeConversationId,
  onSelectConversation,
  onCreateRoom,
  onJoinRoom: _onJoinRoom, // Available for joining discovered rooms
  onLeaveRoom,
}: ConversationSidebarProps) {
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [newRoomName, setNewRoomName] = useState('');
  const [newRoomDescription, setNewRoomDescription] = useState('');

  // Sort conversations by type, then by last message time
  const sortedConversations = Array.from(conversations.values()).sort((a, b) => {
    // Community always first
    if (a.type === 'community') return -1;
    if (b.type === 'community') return 1;
    // Then rooms
    if (a.type === 'room' && b.type !== 'room') return -1;
    if (b.type === 'room' && a.type !== 'room') return 1;
    // Then DMs, sorted by last message
    const aTime = a.lastMessage?.timestamp || a.createdAt;
    const bTime = b.lastMessage?.timestamp || b.createdAt;
    return bTime - aTime;
  });

  const handleCreateRoom = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRoomName.trim()) return;
    onCreateRoom(newRoomName.trim(), newRoomDescription.trim() || undefined);
    setNewRoomName('');
    setNewRoomDescription('');
    setShowCreateRoom(false);
  };

  const getConversationIcon = (type: Conversation['type']) => {
    switch (type) {
      case 'community':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
        );
      case 'dm':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
        );
      case 'room':
        return (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
          </svg>
        );
    }
  };

  return (
    <div className="flex flex-col h-full bg-forest-floor border border-border-subtle rounded-lg">
      {/* Header */}
      <div className="px-4 py-3 border-b border-border-subtle bg-deep-earth rounded-t-lg">
        <h3 className="text-lg font-display font-semibold text-mycelium-white">
          Conversations
        </h3>
      </div>

      {/* Conversation List */}
      <div className="flex-1 overflow-y-auto">
        {sortedConversations.map((conv) => (
          <button
            key={conv.id}
            onClick={() => onSelectConversation(conv.id)}
            className={`w-full flex items-center gap-3 px-4 py-3 border-b border-border-subtle transition-colors text-left ${
              activeConversationId === conv.id
                ? 'bg-moss/50 border-l-2 border-l-glow-cyan'
                : 'hover:bg-moss/30'
            }`}
          >
            <span className={`${activeConversationId === conv.id ? 'text-glow-cyan' : 'text-soft-gray'}`}>
              {getConversationIcon(conv.type)}
            </span>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className={`font-display font-medium truncate ${
                  activeConversationId === conv.id ? 'text-mycelium-white' : 'text-soft-gray'
                }`}>
                  {conv.name}
                </span>
                {conv.unreadCount > 0 && (
                  <span className="ml-2 px-2 py-0.5 text-xs font-bold bg-glow-cyan text-deep-earth rounded-full">
                    {conv.unreadCount}
                  </span>
                )}
              </div>
              {conv.lastMessage && (
                <p className="text-xs text-soft-gray truncate font-body">
                  {conv.lastMessage.content}
                </p>
              )}
            </div>
            {/* Leave room button */}
            {conv.type === 'room' && conv.roomId && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onLeaveRoom(conv.roomId!);
                }}
                className="p-1 text-soft-gray hover:text-spore-purple transition-colors"
                title="Leave room"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            )}
          </button>
        ))}
      </div>

      {/* Create Room Section */}
      <div className="border-t border-border-subtle p-4">
        {showCreateRoom ? (
          <form onSubmit={handleCreateRoom} className="space-y-2">
            <input
              type="text"
              value={newRoomName}
              onChange={(e) => setNewRoomName(e.target.value)}
              placeholder="Room name..."
              className="w-full bg-moss border border-border-subtle rounded px-3 py-2 text-sm text-mycelium-white placeholder-soft-gray font-body focus:outline-none focus:border-glow-cyan transition-all"
              autoFocus
            />
            <input
              type="text"
              value={newRoomDescription}
              onChange={(e) => setNewRoomDescription(e.target.value)}
              placeholder="Description (optional)..."
              className="w-full bg-moss border border-border-subtle rounded px-3 py-2 text-sm text-mycelium-white placeholder-soft-gray font-body focus:outline-none focus:border-glow-cyan transition-all"
            />
            <div className="flex gap-2">
              <button
                type="submit"
                disabled={!newRoomName.trim()}
                className="flex-1 btn-primary px-3 py-1.5 text-sm rounded disabled:opacity-50"
              >
                Create
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowCreateRoom(false);
                  setNewRoomName('');
                  setNewRoomDescription('');
                }}
                className="px-3 py-1.5 text-sm text-soft-gray hover:text-mycelium-white transition-colors"
              >
                Cancel
              </button>
            </div>
          </form>
        ) : (
          <button
            onClick={() => setShowCreateRoom(true)}
            className="w-full flex items-center justify-center gap-2 px-4 py-2 text-sm font-display text-glow-cyan hover:text-mycelium-white border border-glow-cyan/50 hover:border-glow-cyan rounded transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
            Create Room
          </button>
        )}
      </div>
    </div>
  );
}
