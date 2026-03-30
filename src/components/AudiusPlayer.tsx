"use client";

import { useEffect, useRef, useState } from 'react';
import { useAudioStore } from '@/hooks/useAudioStore';

/**
 * AudiusPlayer - Background music player using Audius embed
 * Track: 9OmXQ3O
 * 
 * Implements autoplay with muted initial state (browser compliance),
 * unmutes on first user interaction.
 */
export function AudiusPlayer() {
    const iframeRef = useRef<HTMLIFrameElement>(null);
    const [isReady, setIsReady] = useState(false);
    const [hasInteracted, setHasInteracted] = useState(false);
    const isMuted = useAudioStore(state => state.isMuted);

    // Listen for first user interaction to enable audio
    useEffect(() => {
        const handleInteraction = () => {
            if (!hasInteracted) {
                setHasInteracted(true);
                // Remove listener after first interaction
                document.removeEventListener('click', handleInteraction);
                document.removeEventListener('keydown', handleInteraction);
                document.removeEventListener('touchstart', handleInteraction);
            }
        };

        document.addEventListener('click', handleInteraction);
        document.addEventListener('keydown', handleInteraction);
        document.addEventListener('touchstart', handleInteraction);

        return () => {
            document.removeEventListener('click', handleInteraction);
            document.removeEventListener('keydown', handleInteraction);
            document.removeEventListener('touchstart', handleInteraction);
        };
    }, [hasInteracted]);

    // Set ready state when iframe loads
    const handleLoad = () => {
        setIsReady(true);
    };

    // The embed URL with autoPlay enabled
    // Note: Most browsers block autoplay with audio, so we rely on user interaction
    const embedUrl = "https://audius.co/embed/track/9OmXQ3O?flavor=card&autoplay=true";

    // When muted globally or hasn't interacted, hide the player (it's already non-visible)
    // When unmuted and has interacted, the iframe plays
    const shouldPlay = hasInteracted && !isMuted && isReady;

    return (
        <>
            {/* Hidden iframe for Audius embed — sandboxed to prevent cross-origin RPC errors (BUG-08) */}
            <iframe
                ref={iframeRef}
                src={shouldPlay ? embedUrl : undefined}
                width="300"
                height="120"
                allow="autoplay; encrypted-media"
                sandbox="allow-scripts allow-same-origin allow-popups"
                className={`fixed bottom-24 right-4 z-[500] rounded-lg shadow-[0_0_20px_rgba(0,243,255,0.3)] transition-all duration-500 ${shouldPlay ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-10 pointer-events-none'}`}
                onLoad={handleLoad}
                title="Background Music"
            />

            {/* Visual indicator for audio status (debug) */}
            {hasInteracted && (
                <div className="fixed bottom-20 left-4 z-[100] pointer-events-none">
                    <div className={`text-[8px] font-mono uppercase tracking-widest px-2 py-1 rounded ${isMuted ? 'bg-red-500/20 text-red-400' : 'bg-neon-green/20 text-neon-green'
                        }`}>
                        {isMuted ? '🔇 AUDIO_MUTED' : '🔊 AUDIUS_UPLINK'}
                    </div>
                </div>
            )}
        </>
    );
}
