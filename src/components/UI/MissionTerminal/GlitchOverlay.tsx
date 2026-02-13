"use client";

import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import * as THREE from 'three';

// === SHADER DEFINITION ===
const GlitchMaterial = {
    uniforms: {
        uTime: { value: 0 },
        uIntensity: { value: 0 },       // From Sonic Depth (0.0 to 1.0)
        uGlitchStrength: { value: 0 },  // Momentary burst (0.0 to 1.0)
        uResolution: { value: new THREE.Vector2(0, 0) }
    },
    vertexShader: `
        varying vec2 vUv;
        void main() {
            vUv = uv;
            gl_Position = vec4(position, 1.0);
        }
    `,
    fragmentShader: `
        uniform float uTime;
        uniform float uIntensity;
        uniform float uGlitchStrength;
        uniform vec2 uResolution;
        varying vec2 vUv;

        // Hash function for noise
        float random(vec2 st) {
            return fract(sin(dot(st.xy, vec2(12.9898, 78.233))) * 43758.5453123);
        }

        void main() {
            vec2 uv = vUv;
            
            // 1. HORIZONTAL TEARING (Based on Intensity + Glitch Strength)
            float tearThreshold = 0.95 - (uIntensity * 0.4); // More tears at high intensity
            float tear = step(tearThreshold, random(vec2(0.0, floor(uv.y * 10.0 + uTime * 20.0))));
            float tearShift = (random(vec2(uTime, uv.y)) - 0.5) * 0.1 * (uIntensity + uGlitchStrength) * tear;
            uv.x += tearShift;

            // 2. CHROMATIC ABERRATION (RGB Shift)
            float shift = (0.005 + (uIntensity * 0.02) + (uGlitchStrength * 0.05));
            float r = 0.0;
            float g = 0.0;
            float b = 0.0;

            // Simple block-noise for glitchiness
            float noiseBlock = step(0.5, random(floor(uv * 50.0) + uTime));
            
            // Only apply color logic if we are "rendering" something - here we simulate a screen overlay
            // Ideally this shader runs on a captured texture, but for overlay we modulate transparency/color
            
            // Fake "Screen Content" color modulation (Simulates looking through a corrupted lens)
            // We'll output a color that is composited OVER existing UI
            
            vec3 glitchColor = vec3(0.0);
            float alpha = 0.0;

            // CRT SCANLINES
            float scanline = sin(uv.y * 800.0 + uTime * 10.0) * 0.1;
            
            // COMPOSITION LOGIC
            // Low Intensity: Subtle Vignette / Scanline
            if (uIntensity < 0.5) {
                glitchColor = vec3(0.0, 0.0, 0.1); 
                alpha = 0.05 * uIntensity + abs(scanline); // Very subtle
            } 
            // Combat Mode
            else {
                // RGB Split Noise
                float noiseR = random(uv + uTime);
                float noiseG = random(uv + uTime + 1.0);
                float noiseB = random(uv + uTime + 2.0);

                glitchColor = vec3(noiseR, noiseG, noiseB);
                
                // Visibility increases with intensity
                alpha = (uIntensity * 0.2) + (uGlitchStrength * 0.5);
                
                // Occasional inverted flash at Max Intensity
                if (uIntensity > 0.9 && random(vec2(uTime, 0.0)) > 0.95) {
                    glitchColor = vec3(1.0) - glitchColor;
                    alpha = 0.8;
                }
            }
            
            // Add scanlines to alpha to give texture
            alpha += clamp(scanline * uIntensity, 0.0, 0.2);

            gl_FragColor = vec4(glitchColor, clamp(alpha, 0.0, 0.8));
        }
    `
};

const GlitchScreen = ({ intensity, glitchStrength }: { intensity: number, glitchStrength: number }) => {
    const mesh = useRef<THREE.Mesh>(null);
    const material = useRef<THREE.ShaderMaterial>(null);

    useFrame(({ clock, size }) => {
        if (material.current) {
            material.current.uniforms.uTime.value = clock.getElapsedTime();
            material.current.uniforms.uIntensity.value = intensity; // Lerp this if needed for smoother transitions
            material.current.uniforms.uGlitchStrength.value = glitchStrength;
            material.current.uniforms.uResolution.value.set(size.width, size.height);
        }
    });

    const shaderArgs = useMemo(() => ({
        uniforms: {
            uTime: { value: 0 },
            uIntensity: { value: 0 },
            uGlitchStrength: { value: 0 },
            uResolution: { value: new THREE.Vector2(0, 0) }
        },
        vertexShader: GlitchMaterial.vertexShader,
        fragmentShader: GlitchMaterial.fragmentShader,
        transparent: true
    }), []);

    return (
        <mesh ref={mesh}>
            <planeGeometry args={[2, 2]} />
            <shaderMaterial
                ref={material}
                attach="material"
                args={[shaderArgs]}
                transparent={true}
                depthTest={false}
                depthWrite={false}
            />
        </mesh>
    );
};

// Error Boundary to prevent WebGL crashes from killing the entire MissionTerminal
class GlitchErrorBoundary extends React.Component<
    { children: React.ReactNode },
    { hasError: boolean }
> {
    constructor(props: { children: React.ReactNode }) {
        super(props);
        this.state = { hasError: false };
    }

    static getDerivedStateFromError() {
        return { hasError: true };
    }

    componentDidCatch(error: Error) {
        console.warn('[GlitchOverlay] WebGL Canvas crashed, rendering fallback:', error.message);
    }

    render() {
        if (this.state.hasError) {
            // Silent fallback — no visual disruption, just skip the glitch effect
            return null;
        }
        return this.props.children;
    }
}

export const GlitchOverlay = ({ intensity, glitchStrength = 0 }: { intensity: number, glitchStrength?: number }) => {
    return (
        <GlitchErrorBoundary>
            <div className="absolute inset-0 pointer-events-none z-[500] overflow-hidden rounded-lg">
                <Canvas
                    orthographic
                    camera={{ zoom: 1, position: [0, 0, 1] }}
                    gl={{ alpha: true, antialias: false }}
                    style={{ width: '100%', height: '100%' }}
                    onCreated={({ gl }) => {
                        // Defensive: if context is lost, don't crash the app
                        gl.domElement.addEventListener('webglcontextlost', (e) => {
                            e.preventDefault();
                            console.warn('[GlitchOverlay] WebGL context lost');
                        });
                    }}
                >
                    <GlitchScreen intensity={intensity} glitchStrength={glitchStrength} />
                </Canvas>
            </div>
        </GlitchErrorBoundary>
    );
};
