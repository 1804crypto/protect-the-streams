"use client";

/**
 * useVoiceOperator - "Sophia" TTS Engine
 *
 * Natural-sounding Web Speech API implementation.
 * Clean voice with light warmth processing — no hiss, no heavy distortion.
 * Sophia is a late-20s streamer advocate from the grassroots.
 */

import { useCallback, useRef, useEffect } from 'react';
import { useAudioStore } from './useAudioStore';

// Singleton AudioContext for TTS processing
let ttsAudioCtx: AudioContext | null = null;

interface VoiceOperatorOptions {
    pitch?: number;      // 0.1 - 2 (default: 1.05 for natural female)
    rate?: number;       // 0.1 - 2 (default: 1.0 for conversational pace)
    gain?: number;       // 0 - 1 (default: 0.9)
}

export const useVoiceOperator = () => {
    const isMuted = useAudioStore(state => state.isMuted);
    const synthRef = useRef<SpeechSynthesis | null>(null);
    const currentUtteranceRef = useRef<SpeechSynthesisUtterance | null>(null);
    const isInitializedRef = useRef(false);

    // Initialize AudioContext and speech synthesis
    const initTTS = useCallback(() => {
        if (typeof window === 'undefined') return false;

        // Initialize Web Speech API
        if (!synthRef.current) {
            synthRef.current = window.speechSynthesis;
        }

        // Initialize Audio Context for light warmth processing
        if (!ttsAudioCtx) {
            ttsAudioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        }

        // Resume if suspended (browser autoplay policy)
        if (ttsAudioCtx.state === 'suspended') {
            ttsAudioCtx.resume();
        }

        isInitializedRef.current = true;
        return true;
    }, []);

    // Get the best available voice — prioritize natural-sounding female voices
    const getOperatorVoice = useCallback((): SpeechSynthesisVoice | null => {
        if (!synthRef.current) return null;

        const voices = synthRef.current.getVoices();


        // Priority: Energetic, younger female voices
        const preferred = [
            'Google US English',                 // Chrome (often best for casual/energetic)
            'Microsoft Zira',                    // Windows
            'Samantha',                          // macOS (good fallback)
            'Tessa',                             // macOS
            'Microsoft Jenny'                    // Windows
        ];

        for (const name of preferred) {
            const match = voices.find(v => v.name.includes(name));
            if (match) return match;
        }

        // Fallback to any English female voice
        const englishFemale = voices.find(v =>
            v.lang.startsWith('en') && v.name.toLowerCase().includes('female')
        );
        if (englishFemale) return englishFemale;

        // Final fallback: any English voice
        return voices.find(v => v.lang.startsWith('en')) || voices[0] || null;
    }, []);

    // Core TTS function — clean, natural voice
    const speak = useCallback((text: string, options: VoiceOperatorOptions = {}) => {
        if (isMuted) return;
        if (!initTTS()) return;
        if (!synthRef.current) return;

        const {
            pitch = 1.15, // Higher pitch for younger energy
            rate = 1.1,   // Faster rate for streamer cadence
            gain = 0.95
        } = options;

        // Cancel any ongoing speech
        synthRef.current.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = getOperatorVoice();
        utterance.pitch = pitch;
        utterance.rate = rate;
        utterance.volume = gain;

        currentUtteranceRef.current = utterance;

        // Speak the text — clean, no filters, no hiss
        synthRef.current.speak(utterance);

    }, [isMuted, initTTS, getOperatorVoice]);

    // Stop speaking
    const stop = useCallback(() => {
        if (synthRef.current) {
            synthRef.current.cancel();
        }
    }, []);

    // Check if currently speaking
    const isSpeaking = useCallback(() => {
        return synthRef.current?.speaking || false;
    }, []);

    // Preload voices (some browsers need this)
    useEffect(() => {
        if (typeof window === 'undefined') return;

        const loadVoices = () => {
            if (!synthRef.current) {
                synthRef.current = window.speechSynthesis;
            }
            synthRef.current.getVoices();
        };

        // Load immediately
        loadVoices();

        // Also load on voiceschanged event (Chrome needs this)
        if (synthRef.current) {
            synthRef.current.onvoiceschanged = loadVoices;
        }
    }, []);

    // === SOPHIA VOICE PRESETS ===

    // Standard — conversational, warm, grounded
    const speakOperator = useCallback((text: string) => {
        speak(text, {
            pitch: 1.15,
            rate: 1.1,
            gain: 0.95
        });
    }, [speak]);

    // Hype — for critical hits and big moments
    const speakHype = useCallback((text: string) => {
        speak(text, {
            pitch: 1.25,
            rate: 1.2,
            gain: 1.0
        });
    }, [speak]);

    // Urgent — warning tone
    const speakUrgent = useCallback((text: string) => {
        speak(text, {
            pitch: 1.1,
            rate: 1.25,
            gain: 1.0
        });
    }, [speak]);

    // Intel — calm, strategic delivery
    const speakIntel = useCallback((text: string) => {
        speak(text, {
            pitch: 1.05,
            rate: 1.0,
            gain: 0.9
        });
    }, [speak]);

    // Sophia greeting — welcoming and real
    const speakAida = useCallback((text: string) => {
        speak(text, {
            pitch: 1.08,
            rate: 0.98,
            gain: 0.9
        });
    }, [speak]);

    // Initialize Sophia Greeting
    const initAida = useCallback(() => {
        if (initTTS()) {
            setTimeout(() => {
                speakAida("Hey, you made it. Welcome to the Resistance.");
            }, 1000);
        }
    }, [initTTS, speakAida]);

    return {
        speak,
        speakOperator,
        speakUrgent,
        speakHype,
        speakIntel,
        speakAida,
        initAida,
        stop,
        isSpeaking,
        initTTS
    };
};
