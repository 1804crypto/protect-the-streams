"use client";

import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment, Float, MeshDistortMaterial, Stars } from '@react-three/drei';
import { Suspense, useRef, useMemo } from 'react';
import * as THREE from 'three';

function ResistanceCore() {
    const meshRef = useRef<THREE.Mesh>(null!);

    useFrame((state) => {
        const t = state.clock.getElapsedTime();
        meshRef.current.rotation.x = Math.cos(t / 4) / 2;
        meshRef.current.rotation.y = Math.sin(t / 2) / 2;
        meshRef.current.rotation.z = Math.sin(t / 1.5) / 2;
        meshRef.current.position.y = Math.sin(t / 1.5) / 5;
    });

    return (
        <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
            <mesh ref={meshRef} position={[0, 0, 0]} castShadow>
                <octahedronGeometry args={[2.5, 0]} />
                <MeshDistortMaterial
                    color="#00f3ff"
                    speed={4}
                    distort={0.4}
                    radius={1}
                    emissive="#00f3ff"
                    emissiveIntensity={2}
                    wireframe
                    opacity={0.8}
                    transparent
                />
            </mesh>

            {/* Inner Core Solid */}
            <mesh position={[0, 0, 0]}>
                <octahedronGeometry args={[1.5, 0]} />
                <meshStandardMaterial
                    color="#ff003c"
                    emissive="#ff003c"
                    emissiveIntensity={4}
                    roughness={0.1}
                    metalness={1}
                />
            </mesh>
        </Float>
    );
}

function DataStreams() {
    const meshRef = useRef<THREE.InstancedMesh>(null!);
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
        // Optional: Slow vertical movement for "streaming" effect
        particles.forEach((p, i) => {
            dummy.position.set(p.x, p.y + Math.sin(state.clock.elapsedTime * 0.5 + i) * 2, p.z);
            dummy.scale.y = 1 + Math.sin(state.clock.elapsedTime + i) * 0.5; // Dynamic pulsing
            dummy.updateMatrix();
            meshRef.current.setMatrixAt(i, dummy.matrix);
        });
        meshRef.current.instanceMatrix.needsUpdate = true;
    });

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]}>
            <boxGeometry args={[0.05, 10, 0.05]} />
            <meshStandardMaterial
                color="#00f3ff"
                emissive="#00f3ff"
                emissiveIntensity={2}
                transparent
                opacity={0.3}
                blending={THREE.AdditiveBlending}
            />
        </instancedMesh>
    );
}

function SceneContent() {
    return (
        <>
            <PerspectiveCamera makeDefault position={[0, 0, 12]} fov={50} />
            <OrbitControls
                enableZoom={false}
                enablePan={false}
                maxPolarAngle={Math.PI / 1.5}
                minPolarAngle={Math.PI / 3}
            />

            {/* Lighting Architecture */}
            <ambientLight intensity={0.2} />
            <pointLight position={[15, 15, 15]} intensity={2} color="#00f3ff" />
            <pointLight position={[-15, -15, -15]} intensity={2} color="#ff003c" />
            <spotLight position={[0, 20, 0]} angle={0.3} penumbra={1} intensity={5} color="#00f3ff" castShadow />

            {/* Environmental Elements */}
            <Stars radius={100} depth={50} count={7000} factor={4} saturation={0} fade speed={1.5} />
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
        <div className="w-full h-full bg-[#050505]">
            <Canvas
                shadows
                dpr={[1, 2]}
                gl={{ antialias: true, alpha: false, stencil: false, depth: true }}
            >
                <color attach="background" args={['#050505']} />
                <fog attach="fog" args={['#050505', 10, 50]} />
                <SceneContent />
            </Canvas>
        </div>
    );
}
