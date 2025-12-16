import { useState, useCallback } from 'react';
import { QRCode } from './QRCode';
import type { GeneratedIdentity, OnboardingStep } from '@/types';

interface OnboardingPanelProps {
  bootstrapAddress?: string;
  onComplete?: (identity: GeneratedIdentity) => void;
  onClose?: () => void;
}

// Generate a cryptographically secure keypair using Web Crypto API
async function generateKeypair(): Promise<GeneratedIdentity> {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: 'ECDSA',
      namedCurve: 'P-256',
    },
    true,
    ['sign', 'verify']
  );

  const publicKeyRaw = await window.crypto.subtle.exportKey('raw', keyPair.publicKey);
  const privateKeyRaw = await window.crypto.subtle.exportKey('pkcs8', keyPair.privateKey);

  const publicKeyHex = Array.from(new Uint8Array(publicKeyRaw))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  const privateKeyHex = Array.from(new Uint8Array(privateKeyRaw))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  // Create a peer ID from the public key hash (similar to libp2p)
  const hashBuffer = await window.crypto.subtle.digest('SHA-256', publicKeyRaw);
  const peerId = '12D3KooW' + Array.from(new Uint8Array(hashBuffer))
    .slice(0, 16)
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');

  return {
    peerId,
    publicKey: publicKeyHex,
    privateKey: privateKeyHex,
    createdAt: Date.now(),
  };
}

// Generate invite link
function generateInviteLink(bootstrapAddress: string, peerId?: string): string {
  const baseUrl = window.location.origin;
  const params = new URLSearchParams({
    bootstrap: bootstrapAddress,
    ...(peerId && { inviter: peerId }),
  });
  return `${baseUrl}/join?${params.toString()}`;
}

const ONBOARDING_STEPS: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Mycelial Network',
    description: 'A peer-to-peer network for regenerative economics',
    completed: false,
  },
  {
    id: 'identity',
    title: 'Generate Your Identity',
    description: 'Create a secure cryptographic keypair',
    completed: false,
  },
  {
    id: 'connect',
    title: 'Connect to Network',
    description: 'Join the mycelial mesh',
    completed: false,
  },
  {
    id: 'reputation',
    title: 'Build Reputation',
    description: 'Start contributing to earn trust',
    completed: false,
  },
];

export function OnboardingPanel({
  bootstrapAddress = '/ip4/127.0.0.1/tcp/9000',
  onComplete,
  onClose,
}: OnboardingPanelProps) {
  const [currentStep, setCurrentStep] = useState(0);
  const [identity, setIdentity] = useState<GeneratedIdentity | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [peerName, setPeerName] = useState('');
  const [copied, setCopied] = useState<string | null>(null);

  const handleGenerateIdentity = useCallback(async () => {
    setIsGenerating(true);
    try {
      const newIdentity = await generateKeypair();
      setIdentity(newIdentity);
      setCurrentStep(2);
    } catch (error) {
      console.error('Failed to generate keypair:', error);
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const handleCopy = useCallback(async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(label);
      setTimeout(() => setCopied(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  }, []);

  const handleComplete = useCallback(() => {
    if (identity && onComplete) {
      onComplete(identity);
    }
    onClose?.();
  }, [identity, onComplete, onClose]);

  const inviteLink = identity
    ? generateInviteLink(bootstrapAddress, identity.peerId)
    : generateInviteLink(bootstrapAddress);

  const steps = ONBOARDING_STEPS.map((step, i) => ({
    ...step,
    completed: i < currentStep,
  }));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-void/80 backdrop-blur-sm">
      <div className="w-full max-w-2xl bg-forest-floor border border-border-subtle rounded-xl shadow-card overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-border-subtle flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full overflow-hidden">
              <img src="/icon.jpg" alt="Univrs.io" className="w-full h-full object-cover" />
            </div>
            <div>
              <h2 className="text-lg font-display font-bold text-mycelium-white">
                Join the Mycelial Network
              </h2>
              <p className="text-sm text-soft-gray">Regenerative P2P Economics</p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-soft-gray hover:text-mycelium-white transition-colors"
              aria-label="Close"
            >
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          )}
        </div>

        {/* Progress Steps */}
        <div className="px-6 py-4 border-b border-border-subtle">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-display font-bold text-sm transition-colors ${
                    step.completed
                      ? 'bg-glow-cyan text-void'
                      : index === currentStep
                      ? 'bg-glow-gold text-void'
                      : 'bg-bark text-soft-gray'
                  }`}
                >
                  {step.completed ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3">
                      <path d="M20 6L9 17l-5-5" />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-12 h-0.5 mx-2 transition-colors ${
                      step.completed ? 'bg-glow-cyan' : 'bg-bark'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-8">
          {/* Step 0: Welcome */}
          {currentStep === 0 && (
            <div className="text-center space-y-6">
              <div className="w-20 h-20 mx-auto rounded-full bg-glow-cyan-dim flex items-center justify-center">
                <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" className="text-glow-cyan">
                  <circle cx="12" cy="12" r="10" />
                  <path d="M12 6v12M6 12h12" />
                </svg>
              </div>
              <div>
                <h3 className="text-2xl font-display font-bold text-mycelium-white mb-2">
                  Welcome to the Mycelial Network
                </h3>
                <p className="text-soft-gray max-w-md mx-auto">
                  A decentralized network for regenerative economics. Connect with peers,
                  build reputation, and participate in mutual credit systems.
                </p>
              </div>
              <div className="grid grid-cols-3 gap-4 max-w-md mx-auto">
                <div className="p-4 bg-moss rounded-lg">
                  <div className="text-glow-cyan text-2xl font-display font-bold">P2P</div>
                  <div className="text-sm text-soft-gray">Peer-to-Peer</div>
                </div>
                <div className="p-4 bg-moss rounded-lg">
                  <div className="text-glow-gold text-2xl font-display font-bold">Trust</div>
                  <div className="text-sm text-soft-gray">Reputation</div>
                </div>
                <div className="p-4 bg-moss rounded-lg">
                  <div className="text-spore-purple text-2xl font-display font-bold">Credit</div>
                  <div className="text-sm text-soft-gray">Mutual Aid</div>
                </div>
              </div>
              <button
                onClick={() => setCurrentStep(1)}
                className="btn-primary px-8 py-3 rounded-lg"
              >
                Get Started
              </button>
            </div>
          )}

          {/* Step 1: Generate Identity */}
          {currentStep === 1 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-display font-bold text-mycelium-white mb-2">
                  Create Your Identity
                </h3>
                <p className="text-soft-gray">
                  Generate a unique cryptographic identity for the network
                </p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-display text-soft-gray mb-2">
                    Display Name (optional)
                  </label>
                  <input
                    type="text"
                    value={peerName}
                    onChange={(e) => setPeerName(e.target.value)}
                    placeholder="Enter your name..."
                    className="w-full px-4 py-3 bg-moss border border-border-subtle rounded-lg text-mycelium-white placeholder-soft-gray focus:border-glow-cyan focus:outline-none transition-colors"
                  />
                </div>

                <button
                  onClick={handleGenerateIdentity}
                  disabled={isGenerating}
                  className="w-full btn-primary px-6 py-3 rounded-lg flex items-center justify-center gap-2"
                >
                  {isGenerating ? (
                    <>
                      <svg className="animate-spin w-5 h-5" viewBox="0 0 24 24">
                        <circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" strokeWidth="2" opacity="0.25" />
                        <path d="M4 12a8 8 0 018-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
                      </svg>
                      Generating...
                    </>
                  ) : (
                    <>
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
                        <path d="M7 11V7a5 5 0 0110 0v4" />
                      </svg>
                      Generate Secure Identity
                    </>
                  )}
                </button>
              </div>
            </div>
          )}

          {/* Step 2: Connect to Network */}
          {currentStep === 2 && identity && (
            <div className="space-y-6">
              <div className="text-center">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-glow-cyan-dim flex items-center justify-center">
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-glow-cyan">
                    <path d="M20 6L9 17l-5-5" />
                  </svg>
                </div>
                <h3 className="text-xl font-display font-bold text-mycelium-white mb-2">
                  Identity Created!
                </h3>
                <p className="text-soft-gray">
                  Your peer ID is ready. Connect to the network or share with others.
                </p>
              </div>

              {/* Peer ID Display */}
              <div className="p-4 bg-moss rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-display text-soft-gray uppercase tracking-wider">
                    Your Peer ID
                  </span>
                  <button
                    onClick={() => handleCopy(identity.peerId, 'peerId')}
                    className="text-glow-cyan hover:text-glow-gold transition-colors text-sm"
                  >
                    {copied === 'peerId' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="font-mono text-sm text-mycelium-white break-all">
                  {identity.peerId}
                </div>
              </div>

              {/* QR Code and Invite Link */}
              <div className="grid md:grid-cols-2 gap-4">
                <div className="p-4 bg-moss rounded-lg text-center">
                  <h4 className="text-sm font-display text-soft-gray uppercase tracking-wider mb-3">
                    Scan to Connect
                  </h4>
                  <div className="inline-block p-2 bg-white rounded-lg">
                    <QRCode data={inviteLink} size={120} className="text-void" />
                  </div>
                </div>

                <div className="p-4 bg-moss rounded-lg space-y-3">
                  <h4 className="text-sm font-display text-soft-gray uppercase tracking-wider">
                    Invite Link
                  </h4>
                  <div className="flex items-stretch gap-2">
                    <input
                      type="text"
                      value={inviteLink}
                      readOnly
                      className="flex-1 px-3 py-2 bg-bark border border-border-subtle rounded text-sm text-soft-gray font-mono truncate"
                    />
                    <button
                      onClick={() => handleCopy(inviteLink, 'invite')}
                      className="px-3 py-2 bg-glow-cyan text-void rounded font-display font-bold text-sm hover:shadow-glow-sm transition-shadow"
                    >
                      {copied === 'invite' ? 'Copied!' : 'Copy'}
                    </button>
                  </div>
                  <p className="text-xs text-soft-gray">
                    Share this link to invite others to join the network
                  </p>
                </div>
              </div>

              {/* Bootstrap Address */}
              <div className="p-4 bg-moss rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-display text-soft-gray uppercase tracking-wider">
                    Bootstrap Node
                  </span>
                  <button
                    onClick={() => handleCopy(bootstrapAddress, 'bootstrap')}
                    className="text-glow-cyan hover:text-glow-gold transition-colors text-sm"
                  >
                    {copied === 'bootstrap' ? 'Copied!' : 'Copy'}
                  </button>
                </div>
                <div className="font-mono text-sm text-mycelium-white break-all">
                  {bootstrapAddress}
                </div>
              </div>

              <button
                onClick={() => setCurrentStep(3)}
                className="w-full btn-primary px-6 py-3 rounded-lg"
              >
                Continue to Reputation
              </button>
            </div>
          )}

          {/* Step 3: Build Reputation */}
          {currentStep === 3 && (
            <div className="space-y-6">
              <div className="text-center">
                <h3 className="text-xl font-display font-bold text-mycelium-white mb-2">
                  Build Your Reputation
                </h3>
                <p className="text-soft-gray">
                  Your reputation grows through network contributions
                </p>
              </div>

              <div className="grid gap-4">
                <div className="p-4 bg-moss rounded-lg flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-glow-cyan-dim flex items-center justify-center flex-shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-glow-cyan">
                      <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                      <circle cx="9" cy="7" r="4" />
                      <path d="M23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-mycelium-white">Get Vouched</h4>
                    <p className="text-sm text-soft-gray">
                      Ask existing network members to vouch for you
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-moss rounded-lg flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-glow-gold-dim flex items-center justify-center flex-shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-glow-gold">
                      <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-mycelium-white">Participate</h4>
                    <p className="text-sm text-soft-gray">
                      Join conversations and contribute to discussions
                    </p>
                  </div>
                </div>

                <div className="p-4 bg-moss rounded-lg flex items-start gap-4">
                  <div className="w-10 h-10 rounded-full bg-spore-purple/25 flex items-center justify-center flex-shrink-0">
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-spore-purple">
                      <circle cx="12" cy="12" r="10" />
                      <path d="M12 6v6l4 2" />
                    </svg>
                  </div>
                  <div>
                    <h4 className="font-display font-bold text-mycelium-white">Stay Active</h4>
                    <p className="text-sm text-soft-gray">
                      Regular participation maintains your reputation score
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 bg-glow-cyan-dim/30 border border-glow-cyan/30 rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-glow-cyan">
                    <circle cx="12" cy="12" r="10" />
                    <path d="M12 16v-4M12 8h.01" />
                  </svg>
                  <span className="font-display font-bold text-glow-cyan">Initial Reputation</span>
                </div>
                <p className="text-sm text-soft-gray">
                  New members start with a neutral reputation (0.5). Build trust through
                  positive interactions and vouches from established members.
                </p>
              </div>

              <button
                onClick={handleComplete}
                className="w-full btn-primary px-6 py-3 rounded-lg"
              >
                Enter the Network
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
