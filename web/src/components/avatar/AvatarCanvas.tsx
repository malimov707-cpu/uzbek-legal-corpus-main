import { Canvas } from "@react-three/fiber";
import { ContactShadows, Environment } from "@react-three/drei";
import { Component, Suspense, type ErrorInfo, type ReactNode } from "react";
import type { AvatarSpeech } from "../../hooks/useAvatarSpeech";
import type { AvatarMode } from "./AvatarModel";
import { AvatarModel } from "./AvatarModel";
import { FallbackSpeaker } from "./FallbackSpeaker";

class AvatarAssetBoundary extends Component<{
  children: ReactNode;
  fallback: ReactNode;
}, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch(_error: Error, _info: ErrorInfo) { /* Asset fallback is rendered below. */ }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

interface AvatarCanvasProps {
  mode: AvatarMode;
  isUserTyping: boolean;
  speech: AvatarSpeech | null;
  onSpeechStart: () => void;
  onSpeechEnd: () => void;
}

export function AvatarCanvas(props: AvatarCanvasProps) {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      camera={{ position: [0, 1.45, 4.8], fov: 34, near: 0.1, far: 40 }}
      gl={{ alpha: true, antialias: true, powerPreference: "high-performance" }}
      className="avatar-canvas"
    >
      <color attach="background" args={["#090d16"]} />
      <fog attach="fog" args={["#090d16", 8, 22]} />
      <ambientLight intensity={0.42} />
      <spotLight position={[-3, 4.5, 3]} angle={0.34} penumbra={0.9} intensity={1.05} castShadow />
      <pointLight position={[3, 2.8, -1]} color="#5e8cff" intensity={5} distance={9} />
      <pointLight position={[-3, 1.5, -2]} color="#b67aff" intensity={4} distance={8} />
      <mesh position={[0, -1.4, -1.15]} receiveShadow>
        <cylinderGeometry args={[1.28, 1.4, 0.16, 64]} />
        <meshStandardMaterial color="#141c2b" roughness={0.72} metalness={0.22} />
      </mesh>
      <mesh position={[0, -1.305, -1.15]} receiveShadow>
        <cylinderGeometry args={[1.22, 1.22, 0.035, 64]} />
        <meshStandardMaterial color="#1b2639" roughness={0.68} metalness={0.18} />
      </mesh>
      <Suspense fallback={null}>
        <Environment preset="studio" environmentIntensity={0.3} />
        <AvatarAssetBoundary fallback={
          <FallbackSpeaker
            mode={props.mode}
            isUserTyping={props.isUserTyping}
            speech={props.speech}
            onSpeechStart={props.onSpeechStart}
            onSpeechEnd={props.onSpeechEnd}
          />
        }>
          <Suspense fallback={
            <FallbackSpeaker
              mode={props.mode}
              isUserTyping={props.isUserTyping}
              speech={props.speech}
              onSpeechStart={props.onSpeechStart}
              onSpeechEnd={props.onSpeechEnd}
            />
          }>
            <AvatarModel {...props} />
          </Suspense>
        </AvatarAssetBoundary>
        <ContactShadows position={[0, -1.305, -1.15]} opacity={0.22} scale={3.4} blur={2.4} far={2.2} />
      </Suspense>
    </Canvas>
  );
}
