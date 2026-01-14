"use client";

import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Float, MeshDistortMaterial, Stars } from '@react-three/drei';
import { Suspense, useRef, useMemo, useEffect } from 'react';
import * as THREE from 'three';
import { useVisualEffects } from '@/hooks/useVisualEffects';

function ResistanceCore() {
    const meshRef = useRef<THREE.Mesh>(null!);
    const { integrity, glitchIntensity, isCritical } = useVisualEffects();

    // Smoothly interpolate colors based on health integrity
    const baseColor = useMemo(() => new THREE.Color("#00f3ff"), []);
    const criticalColor = useMemo(() => new THREE.Color("#ff003c"), []);
    const currentColor = useMemo(() => new THREE.Color(), []);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();

        // React to integrity: Shift toward red when health is low
        currentColor.lerpColors(criticalColor, baseColor, integrity);
        if (meshRef.current.material) {
            (meshRef.current.material as any).color.copy(currentColor);
            (meshRef.current.material as any).emissive.copy(currentColor);
            (meshRef.current.material as any).distort = THREE.MathUtils.lerp(
                (meshRef.current.material as any).distort,
                0.4 + (1 - integrity) * 0.4 + glitchIntensity,
                0.1
            );
        }

        // Physical reaction: Core rotates faster during glitches
        const speedMult = 1 + glitchIntensity * 5;
        meshRef.current.rotation.x = Math.cos(t / 4) / 2 * speedMult;
        meshRef.current.rotation.y = Math.sin(t / 2) / 2 * speedMult;
        meshRef.current.rotation.z = Math.sin(t / 1.5) / 2 * speedMult;
        meshRef.current.position.y = Math.sin(t / 1.5) / 5;

        // Critical jitter
        if (isCritical) {
            meshRef.current.position.x = (Math.random() - 0.5) * 0.05;
            meshRef.current.position.z = (Math.random() - 0.5) * 0.05;
        } else {
            meshRef.current.position.x = 0;
            meshRef.current.position.z = 0;
        }
    });

    return (
        <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
            <mesh ref={meshRef} position={[0, 0, 0]} castShadow>
                <tetrahedronGeometry args={[2.8, 0]} />
                <MeshDistortMaterial
                    color="#00f3ff"
                    speed={4}
                    distort={0.4}
                    radius={1}
                    emissive="#00f3ff"
                    emissiveIntensity={12 + (1 - integrity) * 20}
                    wireframe
                    opacity={0.9}
                    transparent
                />
            </mesh>

            {/* Inner Core Solid */}
            <mesh position={[0, 0, 0]}>
                <tetrahedronGeometry args={[1.2, 0]} />
                <meshStandardMaterial
                    color={isCritical ? "#ff003c" : "#00f3ff"}
                    emissive={isCritical ? "#ff003c" : "#00f3ff"}
                    emissiveIntensity={isCritical ? 30 : 15}
                    roughness={0}
                    metalness={1}
                />
            </mesh>
        </Float>
    );
}

function DataStreams() {
    const meshRef = useRef<THREE.InstancedMesh>(null!);
    const { integrity, glitchIntensity } = useVisualEffects();
    const count = 100;
    const dummy = useMemo(() => new THREE.Object3D(), []);

    const particles = useMemo(() => {
        const temp = [];
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 50;
            const y = (Math.random() - 0.5) * 50;
            const z = (Math.random() - 0.5) * 50;
            temp.push({ x, y, z });
        }
        return temp;
    }, []);

    useFrame((state) => {
        const t = state.clock.elapsedTime;
        particles.forEach((p, i) => {
            const speed = 0.5 + (1 - integrity);
            dummy.position.set(p.x, p.y + Math.sin(t * speed + i) * 2, p.z);
            dummy.scale.y = 1 + Math.sin(t + i) * 0.5 + glitchIntensity * 2;
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
            <boxGeometry args={[0.05, 10, 0.05]} />
            <meshStandardMaterial
                color={integrity < 0.3 ? "#ff003c" : "#00f3ff"}
                emissive={integrity < 0.3 ? "#ff003c" : "#00f3ff"}
                emissiveIntensity={2 + glitchIntensity * 10}
                transparent
                opacity={0.3}
                blending={THREE.AdditiveBlending}
            />
        </instancedMesh>
    );
}

function SceneContent() {
    const { shakeIntensity, integrity, lastImpactTime } = useVisualEffects();
    const cameraRef = useRef<THREE.PerspectiveCamera>(null!);
    const { scene } = useThree();

    useFrame((state) => {
        // Handle Camera Shake on Impact
        const timeSinceImpact = (Date.now() - lastImpactTime) / 1000;
        if (timeSinceImpact < 0.5) {
            const decay = 1 - (timeSinceImpact / 0.5);
            const shake = shakeIntensity * decay * 0.2;
            cameraRef.current.position.x = (Math.random() - 0.5) * shake;
            cameraRef.current.position.y = (Math.random() - 0.5) * shake;
        } else {
            cameraRef.current.position.x = THREE.MathUtils.lerp(cameraRef.current.position.x, 0, 0.1);
            cameraRef.current.position.y = THREE.MathUtils.lerp(cameraRef.current.position.y, 0, 0.1);
        }

        // Red tint to background fog on low integrity
        const fogColor = integrity < 0.3 ? new THREE.Color("#1a0000") : new THREE.Color("#050505");
        scene.fog?.color.lerp(fogColor, 0.05);
        (scene.background as THREE.Color)?.lerp(fogColor, 0.05);
    });

    return (
        <>
            <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 0, 12]} fov={50} />
            <OrbitControls
                enableZoom={false}
                enablePan={false}
                maxPolarAngle={Math.PI / 1.5}
                minPolarAngle={Math.PI / 3}
            />

            {/* Lighting Architecture */}
            <ambientLight intensity={1.5} />
            <pointLight position={[15, 15, 15]} intensity={50} color={integrity < 0.4 ? "#ff003c" : "#00f3ff"} />
            <pointLight position={[-15, -15, -15]} intensity={30} color="#ff003c" />
            <spotLight position={[0, 20, 0]} angle={0.3} penumbra={1} intensity={100} color={integrity < 0.3 ? "#ff003c" : "#00f3ff"} castShadow />

            {/* Environmental Elements */}
            <Stars radius={100} depth={50} count={5000} factor={4} saturation={0} fade speed={integrity < 0.3 ? 5 : 1.5} />
            <DataStreams />
            <ResistanceCore />

            <Suspense fallback={null}>
                <Environment preset="night" />
            </Suspense>
        </>
    );
}

export default function Scene() {
    return (
        <div className="w-full h-full">
            <Canvas
                shadows
                dpr={[1, 1.5]}
                gl={{ antialias: true, alpha: false, stencil: false, depth: true, powerPreference: "high-performance" }}
            >
                <color attach="background" args={['#050505']} />
                <fog attach="fog" args={['#050505', 10, 50]} />
                <SceneContent />
            </Canvas>
        </div>
    );
}
