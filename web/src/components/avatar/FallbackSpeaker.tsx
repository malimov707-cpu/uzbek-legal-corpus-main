import { useFrame } from "@react-three/fiber";
import { useRef } from "react";
import * as THREE from "three";
import type { AvatarSpeech } from "../../hooks/useAvatarSpeech";
import { useAvatarSpeech } from "../../hooks/useAvatarSpeech";
import type { AvatarMode } from "./AvatarModel";

interface FallbackSpeakerProps {
  mode: AvatarMode;
  isUserTyping: boolean;
  speech: AvatarSpeech | null;
  onSpeechStart: () => void;
  onSpeechEnd: () => void;
}

export function FallbackSpeaker({
  mode,
  isUserTyping,
  speech,
  onSpeechStart,
  onSpeechEnd,
}: FallbackSpeakerProps) {
  const body = useRef<THREE.Group>(null);
  const head = useRef<THREE.Group>(null);
  const armLeft = useRef<THREE.Group>(null);
  const armRight = useRef<THREE.Group>(null);
  const mouth = useRef<THREE.Mesh>(null);
  const { jawRef, speakingRef } = useAvatarSpeech(speech, onSpeechStart, onSpeechEnd);
  useFrame((state, delta) => {
    const t = state.clock.elapsedTime;
    if (body.current) {
      body.current.position.y = Math.sin(t * 1.5) * 0.012;
      body.current.rotation.z = THREE.MathUtils.damp(body.current.rotation.z, mode === "speaking" ? Math.sin(t * 1.3) * 0.025 : 0, 3, delta);
    }
    if (head.current) {
      const down = isUserTyping || mode === "listening" ? 0.25 : 0;
      const nod = mode === "thinking" ? Math.sin(t * 2.2) * 0.04 : 0;
      head.current.rotation.x = THREE.MathUtils.damp(head.current.rotation.x, down + nod, 4, delta);
    }
    if (mouth.current) {
      const talking = speakingRef.current ? 0.035 + jawRef.current * 0.45 : 0.025;
      mouth.current.scale.y = THREE.MathUtils.damp(mouth.current.scale.y, talking, 12, delta);
    }
    if (armLeft.current && armRight.current) {
      const speaking = mode === "speaking";
      armLeft.current.rotation.z = THREE.MathUtils.damp(armLeft.current.rotation.z, speaking ? -0.3 + Math.sin(t * 1.7) * 0.22 : 0.08, 3, delta);
      armRight.current.rotation.z = THREE.MathUtils.damp(armRight.current.rotation.z, speaking ? 0.45 + Math.sin(t * 1.4 + 1) * 0.28 : -0.08, 3, delta);
    }
  });
  return <group position={[0, 0.26, 0]} scale={1.1}>
    <group ref={body}>
      <mesh position={[0, -0.59, 0]} castShadow>
        <cylinderGeometry args={[0.36, 0.32, 0.38, 32]} />
        <meshStandardMaterial color="#202a3d" roughness={0.76} />
      </mesh>
      <mesh position={[-0.18, -1.01, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.16, 0.78, 24]} />
        <meshStandardMaterial color="#202a3d" roughness={0.74} />
      </mesh>
      <mesh position={[0.18, -1.01, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.16, 0.78, 24]} />
        <meshStandardMaterial color="#202a3d" roughness={0.74} />
      </mesh>
      <mesh position={[-0.18, -1.38, 0.065]} scale={[0.18, 0.085, 0.28]} castShadow>
        <sphereGeometry args={[1, 20, 12]} />
        <meshStandardMaterial color="#121721" roughness={0.5} />
      </mesh>
      <mesh position={[0.18, -1.38, 0.065]} scale={[0.18, 0.085, 0.28]} castShadow>
        <sphereGeometry args={[1, 20, 12]} />
        <meshStandardMaterial color="#121721" roughness={0.5} />
      </mesh>
      <mesh position={[0, -0.08, 0]} castShadow>
        <cylinderGeometry args={[0.45, 0.35, 0.88, 40]} />
        <meshStandardMaterial color="#202a3d" roughness={0.72} />
      </mesh>
      <mesh position={[0, 0.38, 0]}>
        <cylinderGeometry args={[0.12, 0.15, 0.22, 20]} />
        <meshStandardMaterial color="#c58e70" roughness={0.8} />
      </mesh>
      <mesh position={[0, -0.06, 0.466]}>
        <boxGeometry args={[0.27, 0.78, 0.035]} />
        <meshStandardMaterial color="#f4f3ee" roughness={0.74} />
      </mesh>
      <mesh position={[-0.12, 0.12, 0.49]} rotation={[0, 0, -0.42]}>
        <boxGeometry args={[0.115, 0.53, 0.035]} />
        <meshStandardMaterial color="#334057" roughness={0.64} />
      </mesh>
      <mesh position={[0.12, 0.12, 0.49]} rotation={[0, 0, 0.42]}>
        <boxGeometry args={[0.115, 0.53, 0.035]} />
        <meshStandardMaterial color="#334057" roughness={0.64} />
      </mesh>
      <mesh position={[-0.055, 0.28, 0.47]} rotation={[0, 0, -0.2]}>
        <coneGeometry args={[0.075, 0.17, 3]} />
        <meshStandardMaterial color="#f4f3ee" roughness={0.74} />
      </mesh>
      <mesh position={[0.055, 0.28, 0.47]} rotation={[0, 0, 0.2]}>
        <coneGeometry args={[0.075, 0.17, 3]} />
        <meshStandardMaterial color="#f4f3ee" roughness={0.74} />
      </mesh>
      <mesh position={[0, 0.21, 0.52]}>
        <cylinderGeometry args={[0.045, 0.045, 0.085, 4]} />
        <meshStandardMaterial color="#813d4c" roughness={0.42} />
      </mesh>
      <mesh position={[0, -0.015, 0.52]} rotation={[Math.PI, 0, 0]}>
        <coneGeometry args={[0.09, 0.43, 4]} />
        <meshStandardMaterial color="#813d4c" roughness={0.42} />
      </mesh>
      {[-0.25, -0.35].map((y) => <mesh key={y} position={[0.2, y, 0.312]}>
        <sphereGeometry args={[0.022, 12, 8]} />
        <meshStandardMaterial color="#b9a77f" metalness={0.45} roughness={0.42} />
      </mesh>)}
      <group ref={head} position={[0, 0.67, 0]}>
        <mesh castShadow scale={[0.92, 1.08, 0.88]}>
          <sphereGeometry args={[0.31, 40, 32]} />
          <meshStandardMaterial color="#c58e70" roughness={0.72} />
        </mesh>
        <mesh position={[0, 0.15, -0.015]} castShadow>
          <sphereGeometry args={[0.315, 40, 24, 0, Math.PI * 2, 0, 1.18]} />
          <meshStandardMaterial color="#211e1d" roughness={0.92} />
        </mesh>
        <mesh position={[-0.275, -0.005, 0.004]} scale={[0.12, 0.16, 0.1]}>
          <sphereGeometry args={[0.11, 16, 12]} />
          <meshStandardMaterial color="#bd886c" roughness={0.78} />
        </mesh>
        <mesh position={[0.275, -0.005, 0.004]} scale={[0.12, 0.16, 0.1]}>
          <sphereGeometry args={[0.11, 16, 12]} />
          <meshStandardMaterial color="#bd886c" roughness={0.78} />
        </mesh>
        <mesh position={[-0.105, 0.11, 0.264]} rotation={[0, 0, -0.08]}>
          <boxGeometry args={[0.085, 0.014, 0.018]} />
          <meshStandardMaterial color="#382a25" roughness={0.7} />
        </mesh>
        <mesh position={[0.105, 0.11, 0.264]} rotation={[0, 0, 0.08]}>
          <boxGeometry args={[0.085, 0.014, 0.018]} />
          <meshStandardMaterial color="#382a25" roughness={0.7} />
        </mesh>
        {[-0.105, 0.105].map((x) => <group key={x} position={[x, 0.025, 0.269]}>
          <mesh>
            <sphereGeometry args={[0.026, 16, 12]} />
            <meshStandardMaterial color="#f1d4c2" roughness={0.48} />
          </mesh>
          <mesh position={[0, 0, 0.019]}>
            <sphereGeometry args={[0.013, 12, 10]} />
            <meshStandardMaterial color="#29221e" roughness={0.42} />
          </mesh>
        </group>)}
        <mesh position={[0, -0.07, 0.278]} scale={[0.06, 0.075, 0.08]}>
          <sphereGeometry args={[0.5, 18, 14]} />
          <meshStandardMaterial color="#b87d60" roughness={0.55} />
        </mesh>
        <mesh ref={mouth} position={[0, -0.19, 0.247]}>
          <sphereGeometry args={[0.045, 16, 10]} />
          <meshStandardMaterial color="#7c4746" roughness={0.72} />
        </mesh>
      </group>
      <group ref={armLeft} position={[-0.37, 0.23, 0]}>
        <mesh position={[-0.06, -0.27, 0]} rotation={[0, 0, -0.12]} castShadow>
          <capsuleGeometry args={[0.105, 0.48, 6, 12]} />
          <meshStandardMaterial color="#202a3d" roughness={0.72} />
        </mesh>
        <mesh position={[-0.06, -0.12, 0]} rotation={[0, 0, -0.12]}>
          <cylinderGeometry args={[0.106, 0.101, 0.09, 16]} />
          <meshStandardMaterial color="#29364d" roughness={0.68} />
        </mesh>
        <mesh position={[-0.1, -0.51, 0.012]} rotation={[0, 0, -0.12]}>
          <cylinderGeometry args={[0.091, 0.087, 0.075, 16]} />
          <meshStandardMaterial color="#f4f3ee" roughness={0.74} />
        </mesh>
        <mesh position={[-0.11, -0.58, 0.02]}>
          <sphereGeometry args={[0.11, 16, 12]} />
          <meshStandardMaterial color="#c58e70" roughness={0.78} />
        </mesh>
      </group>
      <group ref={armRight} position={[0.37, 0.23, 0]}>
        <mesh position={[0.06, -0.27, 0]} rotation={[0, 0, 0.12]} castShadow>
          <capsuleGeometry args={[0.105, 0.48, 6, 12]} />
          <meshStandardMaterial color="#202a3d" roughness={0.72} />
        </mesh>
        <mesh position={[0.06, -0.12, 0]} rotation={[0, 0, 0.12]}>
          <cylinderGeometry args={[0.106, 0.101, 0.09, 16]} />
          <meshStandardMaterial color="#29364d" roughness={0.68} />
        </mesh>
        <mesh position={[0.1, -0.51, 0.012]} rotation={[0, 0, 0.12]}>
          <cylinderGeometry args={[0.091, 0.087, 0.075, 16]} />
          <meshStandardMaterial color="#f4f3ee" roughness={0.74} />
        </mesh>
        <mesh position={[0.11, -0.58, 0.02]}>
          <sphereGeometry args={[0.11, 16, 12]} />
          <meshStandardMaterial color="#c58e70" roughness={0.78} />
        </mesh>
      </group>
    </group>
  </group>;
}
