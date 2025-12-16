import { useState, useCallback } from 'react';
import type { NormalizedPeer, ReputationScore, VouchRequest } from '@/types';

interface ReputationCardProps {
  peer: NormalizedPeer | null;
  localPeerId?: string | null;
  onClose?: () => void;
  onVouch?: (request: VouchRequest) => void;
  onMessage?: (peerId: string) => void;
}

const tierConfig = {
  excellent: { label: 'Excellent', color: 'text-glow-cyan', bgColor: 'bg-glow-cyan' },
  good: { label: 'Good', color: 'text-glow-gold', bgColor: 'bg-glow-gold' },
  neutral: { label: 'Neutral', color: 'text-soft-gray', bgColor: 'bg-soft-gray' },
  poor: { label: 'Poor', color: 'text-amber-400', bgColor: 'bg-amber-400' },
  untrusted: { label: 'Untrusted', color: 'text-red-400', bgColor: 'bg-red-400' },
};

// Derive tier from score
function getTierFromScore(score: number): keyof typeof tierConfig {
  if (score >= 0.9) return 'excellent';
  if (score >= 0.7) return 'good';
  if (score >= 0.5) return 'neutral';
  if (score >= 0.3) return 'poor';
  return 'untrusted';
}

// Mock data for demonstration - in production this would come from the network
function getMockReputationDetails(score: number): ReputationScore {
  const tier = getTierFromScore(score);
  return {
    score,
    tier,
    contributions: Math.floor(score * 50),
    interactions: Math.floor(score * 100),
    vouches: Math.floor(score * 10),
    lastUpdated: Date.now() - Math.random() * 86400000 * 7,
  };
}

export function ReputationCard({
  peer,
  localPeerId,
  onClose,
  onVouch,
  onMessage
}: ReputationCardProps) {
  const [showVouchModal, setShowVouchModal] = useState(false);
  const [vouchMessage, setVouchMessage] = useState('');
  const [vouchStake, setVouchStake] = useState(10);

  const handleVouch = useCallback(() => {
    if (!peer || !localPeerId || !onVouch) return;

    const request: VouchRequest = {
      fromPeerId: localPeerId,
      toPeerId: peer.id,
      message: vouchMessage || undefined,
      stake: vouchStake,
      timestamp: Date.now(),
    };

    onVouch(request);
    setShowVouchModal(false);
    setVouchMessage('');
    setVouchStake(10);
  }, [peer, localPeerId, onVouch, vouchMessage, vouchStake]);

  if (!peer) {
    return (
      <div className="bg-forest-floor border border-border-subtle rounded-lg p-6">
        <div className="text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-moss flex items-center justify-center">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-soft-gray">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 16v-4M12 8h.01" />
            </svg>
          </div>
          <div className="text-soft-gray font-body italic">
            Select a peer to view details
          </div>
          <p className="text-xs text-soft-gray/60">
            Click on a node in the graph to see their reputation and contribution history
          </p>
        </div>
      </div>
    );
  }

  const tierKey = getTierFromScore(peer.reputation);
  const tier = tierConfig[tierKey];
  const scorePercent = Math.round(peer.reputation * 100);
  const reputationDetails = getMockReputationDetails(peer.reputation);
  const isLocalPeer = peer.id === localPeerId;

  const formatLocation = () => {
    if (!peer.location) return 'Location not shared';

    switch (peer.location.type) {
      case 'geographic':
        return `${peer.location.latitude?.toFixed(2)}, ${peer.location.longitude?.toFixed(2)}`;
      case 'logical':
        return `${peer.location.region}`;
      case 'approximate':
        return `${peer.location.city || ''} ${peer.location.country_code}`;
      default:
        return 'Unknown';
    }
  };

  const formatTimeAgo = (timestamp: number) => {
    const seconds = Math.floor((Date.now() - timestamp) / 1000);
    if (seconds < 60) return 'just now';
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes}m ago`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    return `${days}d ago`;
  };

  return (
    <div className="bg-forest-floor border border-border-subtle rounded-lg overflow-hidden card-hover">
      {/* Header with gradient accent */}
      <div className="relative px-6 py-4 bg-deep-earth border-b border-border-subtle">
        <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-glow-cyan via-glow-gold to-spore-purple" />
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${tier.bgColor}/20`}>
              <span className={`text-lg font-display font-bold ${tier.color}`}>
                {peer.name.charAt(0).toUpperCase()}
              </span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-display font-semibold text-mycelium-white">{peer.name}</h3>
                {isLocalPeer && (
                  <span className="px-2 py-0.5 bg-spore-purple/20 text-spore-purple text-xs font-display rounded">
                    You
                  </span>
                )}
              </div>
              <p className="text-sm text-soft-gray font-mono">{peer.id.slice(0, 16)}...</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-soft-gray hover:text-glow-cyan transition-colors"
              aria-label="Close"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-4">
        {/* Reputation Score */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-display uppercase tracking-wider text-soft-gray">Reputation</span>
            <span className={`font-display font-semibold ${tier.color}`}>
              {tier.label}
            </span>
          </div>
          <div className="h-3 bg-bark rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-glow-cyan to-glow-gold transition-all duration-500 shadow-glow-sm"
              style={{ width: `${scorePercent}%` }}
            />
          </div>
          <div className="mt-1 flex items-center justify-between text-sm">
            <span className="text-soft-gray/60 text-xs">
              Updated {formatTimeAgo(reputationDetails.lastUpdated)}
            </span>
            <span className="font-display text-glow-cyan font-bold">
              {scorePercent}%
            </span>
          </div>
        </div>

        {/* Contribution Stats */}
        <div className="grid grid-cols-3 gap-2">
          <div className="p-3 bg-moss rounded-lg text-center">
            <div className="text-lg font-display font-bold text-glow-cyan">
              {reputationDetails.contributions}
            </div>
            <div className="text-xs text-soft-gray uppercase tracking-wider">
              Contributions
            </div>
          </div>
          <div className="p-3 bg-moss rounded-lg text-center">
            <div className="text-lg font-display font-bold text-glow-gold">
              {reputationDetails.interactions}
            </div>
            <div className="text-xs text-soft-gray uppercase tracking-wider">
              Interactions
            </div>
          </div>
          <div className="p-3 bg-moss rounded-lg text-center">
            <div className="text-lg font-display font-bold text-spore-purple">
              {reputationDetails.vouches}
            </div>
            <div className="text-xs text-soft-gray uppercase tracking-wider">
              Vouches
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="flex items-center gap-2 text-soft-gray font-body text-sm">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-spore-purple">
            <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" />
            <circle cx="12" cy="10" r="3" />
          </svg>
          <span>{formatLocation()}</span>
        </div>

        {/* Action Buttons */}
        {!isLocalPeer && (
          <div className="flex gap-2 pt-2">
            {onVouch && (
              <button
                onClick={() => setShowVouchModal(true)}
                className="flex-1 btn-primary px-4 py-2 rounded-lg text-sm flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M14 9V5a3 3 0 00-3-3l-4 9v11h11.28a2 2 0 002-1.7l1.38-9a2 2 0 00-2-2.3zM7 22H4a2 2 0 01-2-2v-7a2 2 0 012-2h3" />
                </svg>
                Vouch
              </button>
            )}
            {onMessage && (
              <button
                onClick={() => onMessage(peer.id)}
                className="flex-1 btn-outline px-4 py-2 rounded-lg text-sm flex items-center justify-center gap-2"
              >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                </svg>
                Message
              </button>
            )}
          </div>
        )}
      </div>

      {/* Vouch Modal */}
      {showVouchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm">
          <div className="w-full max-w-md bg-forest-floor border border-border-subtle rounded-xl shadow-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-display font-bold text-mycelium-white">
                Vouch for {peer.name}
              </h3>
              <button
                onClick={() => setShowVouchModal(false)}
                className="text-soft-gray hover:text-mycelium-white transition-colors"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <p className="text-soft-gray text-sm">
              Vouching stakes your reputation on this peer. If they behave poorly,
              your reputation may be affected.
            </p>

            <div className="space-y-3">
              <div>
                <label className="block text-sm font-display text-soft-gray mb-1">
                  Stake Amount (1-100)
                </label>
                <input
                  type="range"
                  min="1"
                  max="100"
                  value={vouchStake}
                  onChange={(e) => setVouchStake(Number(e.target.value))}
                  className="w-full"
                />
                <div className="flex justify-between text-xs text-soft-gray mt-1">
                  <span>Low stake</span>
                  <span className="text-glow-cyan font-bold">{vouchStake}</span>
                  <span>High stake</span>
                </div>
              </div>

              <div>
                <label className="block text-sm font-display text-soft-gray mb-1">
                  Message (optional)
                </label>
                <textarea
                  value={vouchMessage}
                  onChange={(e) => setVouchMessage(e.target.value)}
                  placeholder="Why do you vouch for this peer?"
                  className="w-full px-3 py-2 bg-moss border border-border-subtle rounded-lg text-mycelium-white placeholder-soft-gray resize-none h-20"
                />
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowVouchModal(false)}
                className="flex-1 btn-outline px-4 py-2 rounded-lg"
              >
                Cancel
              </button>
              <button
                onClick={handleVouch}
                className="flex-1 btn-primary px-4 py-2 rounded-lg"
              >
                Confirm Vouch
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
