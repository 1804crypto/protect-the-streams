"use client";

/**
 * useVoiceOperator - "Voice Operator 7 TTS Engine"
 * 
 * Zero-cost native Web Speech API implementation with Cyber-Grit audio filter.
 * Routes TTS through Web Audio API with distortion and pitch modulation
 * to achieve the "ghost server AI broadcast" aesthetic.
 */

import { useCallback, useRef, useEffect } from 'react';
import { useAudioStore } from './useAudioStore';

// Singleton AudioContext for TTS processing
let ttsAudioCtx: AudioContext | null = null;
let mediaStreamDestination: MediaStreamAudioDestinationNode | null = null;

// Cyber-Grit distortion curve generator - High grit for tactical radio transmission
function makeCyberGritCurve(amount: number = 400): Float32Array {
    const samples = 44100;
    const curve = new Float32Array(samples);
    const deg = Math.PI / 180;

    for (let i = 0; i < samples; i++) {
        const x = (i * 2) / samples - 1;
        // Heavy digital distortion for "gritty radio" aesthetic
        curve[i] = ((3 + amount) * x * 20 * deg) / (Math.PI + amount * Math.abs(x));
    }
    return curve;
}

interface VoiceOperatorOptions {
    pitch?: number;      // 0.1 - 2 (default: 0.8 for tactical AI voice)
    rate?: number;       // 0.1 - 2 (default: 0.9 for calculated pace)
    distortion?: number; // 0 - 500 (default: 400 for heavy grit)
    gain?: number;       // 0 - 1 (default: 0.8)
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

        // Initialize Audio Context for Cyber-Grit processing
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

    // Get the best available voice for Operator 7
    const getOperatorVoice = useCallback((): SpeechSynthesisVoice | null => {
        if (!synthRef.current) return null;

        const voices = synthRef.current.getVoices();

        // Priority: Find female, English voices
        const preferred = [
            'Samantha', 'Victoria', 'Karen', 'Moira', 'Tessa',  // macOS
            'Microsoft Zira', 'Microsoft Hazel',                 // Windows
            'Google UK English Female', 'Google US English'      // Chrome
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

    // Core TTS function with Cyber-Grit processing
    const speak = useCallback((text: string, options: VoiceOperatorOptions = {}) => {
        if (isMuted) return;
        if (!initTTS()) return;
        if (!synthRef.current) return;

        const {
            pitch = 0.8,
            rate = 0.9,
            distortion = 400,
            gain = 0.8
        } = options;

        // Cancel any ongoing speech
        synthRef.current.cancel();

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.voice = getOperatorVoice();
        utterance.pitch = pitch;
        utterance.rate = rate;
        utterance.volume = 1; // Max volume to TTS, we control via Web Audio

        currentUtteranceRef.current = utterance;

        // Track the digital hiss cleanup function
        let noiseCleanup: (() => void) | undefined;

        // Apply Cyber-Grit Effect via Web Audio
        if (ttsAudioCtx && distortion > 0) {
            // Create processing nodes
            const gainNode = ttsAudioCtx.createGain();
            gainNode.gain.value = gain;

            const distortionNode = ttsAudioCtx.createWaveShaper();
            distortionNode.curve = makeCyberGritCurve(distortion) as any;
            distortionNode.oversample = '4x';

            // High-pass filter at 1000Hz - Removes bass for thin "radio" transmission feel
            const highPass = ttsAudioCtx.createBiquadFilter();
            highPass.type = 'highpass';
            highPass.frequency.value = 1000;
            highPass.Q.value = 1.0;

            // Low-pass for slight muffling (transmission aesthetic)
            const lowPass = ttsAudioCtx.createBiquadFilter();
            lowPass.type = 'lowpass';
            lowPass.frequency.value = 4000;
            lowPass.Q.value = 0.5;

            // Dynamics compressor for consistent transmission level
            const compressor = ttsAudioCtx.createDynamicsCompressor();
            compressor.threshold.value = -24;
            compressor.knee.value = 12;
            compressor.ratio.value = 4;
            compressor.attack.value = 0.003;
            compressor.release.value = 0.25;

            // Play static burst at start for "transmission incoming"
            playTransmissionBurst(ttsAudioCtx);

            // Start white noise "digital hiss" during speech
            noiseCleanup = playDigitalHiss(ttsAudioCtx);
        }

        // Speak the text
        synthRef.current.speak(utterance);

        // Play outro static when complete and stop digital hiss
        utterance.onend = () => {
            if (ttsAudioCtx) {
                playTransmissionEnd(ttsAudioCtx);
            }
            // Stop the digital hiss noise
            if (noiseCleanup) {
                noiseCleanup();
            }
        };


    }, [isMuted, initTTS, getOperatorVoice]);

    // Transmission start burst
    const playTransmissionBurst = (ctx: AudioContext) => {
        const duration = 0.15;
        const bufferSize = ctx.sampleRate * duration;
        const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const data = buffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            // Decreasing static
            const envelope = 1 - (i / bufferSize);
            data[i] = (Math.random() * 2 - 1) * envelope * 0.3;
        }

        const source = ctx.createBufferSource();
        source.buffer = buffer;

        const filter = ctx.createBiquadFilter();
        filter.type = 'bandpass';
        filter.frequency.value = 2000;
        filter.Q.value = 1;

        const gain = ctx.createGain();
        gain.gain.value = 0.15;

        source.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);

        source.start();
    };

    // Digital Hiss - White noise that plays during speech transmission
    const playDigitalHiss = (ctx: AudioContext): (() => void) => {
        // Create 2 seconds of looping white noise
        const bufferSize = ctx.sampleRate * 2;
        const noiseBuffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        const noiseData = noiseBuffer.getChannelData(0);

        for (let i = 0; i < bufferSize; i++) {
            noiseData[i] = Math.random() * 2 - 1;
        }

        const noiseSource = ctx.createBufferSource();
        noiseSource.buffer = noiseBuffer;
        noiseSource.loop = true;

        // High-pass to keep it thin and digital sounding
        const hissFilter = ctx.createBiquadFilter();
        hissFilter.type = 'highpass';
        hissFilter.frequency.value = 3000;
        hissFilter.Q.value = 0.5;

        // Very low gain - subtle background hiss
        const hissGain = ctx.createGain();
        hissGain.gain.value = 0.015;

        noiseSource.connect(hissFilter);
        hissFilter.connect(hissGain);
        hissGain.connect(ctx.destination);

        noiseSource.start();

        // Return cleanup function
        return () => {
            try {
                hissGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.1);
                setTimeout(() => noiseSource.stop(), 150);
            } catch { /* ignore */ }
        };
    };

    // Transmission end click
    const playTransmissionEnd = (ctx: AudioContext) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.value = 1200;

        gain.gain.setValueAtTime(0.1, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05);

        osc.connect(gain);
        gain.connect(ctx.destination);

        osc.start();
        osc.stop(ctx.currentTime + 0.05);
    };

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

    // === BOONDOCKS PROTOCOL VOICE PRESETS ===

    // === BOONDOCKS PROTOCOL: Sharp, revolutionary, street-smart ===

    // Standard operator transmission - Tactical and calculated
    const speakOperator = useCallback((text: string) => {
        speak(text, {
            pitch: 0.8,
            rate: 0.9,
            distortion: 400,
            gain: 0.85
        });
    }, [speak]);

    // Urgent/warning transmission - Faster, more aggressive
    const speakUrgent = useCallback((text: string) => {
        speak(text, {
            pitch: 0.85,
            rate: 1.05,
            distortion: 450,
            gain: 0.95
        });
    }, [speak]);

    // Tactical/calm intel - Low and deliberate
    const speakIntel = useCallback((text: string) => {
        speak(text, {
            pitch: 0.75,
            rate: 0.85,
            distortion: 350,
            gain: 0.75
        });
    }, [speak]);

    // === AIDA PERSONALITY: Welcoming, slightly higher pitch, less grit ===
    const speakAida = useCallback((text: string) => {
        speak(text, {
            pitch: 1.1,         // Slightly higher, feminine
            rate: 0.95,         // Clear, welcoming pace
            distortion: 150,    // Light grit - cleaner signal
            gain: 0.8
        });
    }, [speak]);

    // Initialize Aida Greeting
    const initAida = useCallback(() => {
        if (initTTS()) {
            setTimeout(() => {
                speakAida("System Uplink Established. Welcome back, Commander.");
            }, 1000);
        }
    }, [initTTS, speakAida]);

    return {
        speak,
        speakOperator,
        speakUrgent,
        speakIntel,
        speakAida,
        initAida,
        stop,
        isSpeaking,
        initTTS
    };
};
