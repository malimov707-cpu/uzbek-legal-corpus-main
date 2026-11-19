import { useAnimations, useGLTF } from "@react-three/drei";
import { useFrame } from "@react-three/fiber";
import { useEffect, useMemo, useRef } from "react";
import * as THREE from "three";
import type { AvatarSpeech } from "../../hooks/useAvatarSpeech";
import { useAvatarSpeech } from "../../hooks/useAvatarSpeech";

export type AvatarMode = "idle" | "listening" | "thinking" | "speaking";

interface AvatarModelProps {
  mode: AvatarMode;
  isUserTyping: boolean;
  speech: AvatarSpeech | null;
  onSpeechStart: () => void;
  onSpeechEnd: () => void;
}

const MODEL_URL = "/models/conference-speaker.glb";
const EXPECTED_CLIPS = ["Idle", "Explaining_1", "Explaining_2", "Gesture_Pointing"];

function findClip(names: string[], actionNames: string[], preferred: string[]) {
  for (const fragment of preferred) {
    const match = names.find((name) => name.toLowerCase().includes(fragment.toLowerCase()));
    if (match) return actionNames.includes(match) ? match : undefined;
  }
  return undefined;
}

export function AvatarModel({ mode, isUserTyping, speech, onSpeechStart, onSpeechEnd }: AvatarModelProps) {
  const root = useRef<THREE.Group>(null);
  const { scene, animations } = useGLTF(MODEL_URL);
  const { actions, names, mixer } = useAnimations(animations, root);
  const { jawRef, speakingRef } = useAvatarSpeech(speech, onSpeechStart, onSpeechEnd);
  const rig = useMemo(() => {
    const bones: THREE.Bone[] = [];
    const morphs: Array<{ influences: number[]; dictionary: Record<string, number> }> = [];
    scene.traverse((object) => {
      if ((object as THREE.Bone).isBone) {
        bones.push(object as THREE.Bone);
      }
      const mesh = object as THREE.Mesh;
      if (mesh.morphTargetInfluences && mesh.morphTargetDictionary) {
        morphs.push({ influences: mesh.morphTargetInfluences, dictionary: mesh.morphTargetDictionary });
      }
    });
    const head = bones.find((bone) => /^head$/i.test(bone.name)) ?? null;
    const neck = bones.find((bone) => /^neck$/i.test(bone.name)) ?? null;
    return {
      head,
      neck,
      headRestX: head?.rotation.x ?? 0,
      neckRestX: neck?.rotation.x ?? 0,
      morphs,
    };
  }, [scene]);
  const blink = useRef({ value: 0, from: 0, to: 0, elapsed: 0, duration: 0.12, next: 3.7 });
  const thinkingPhase = useRef(0);
  const speakingClips = useMemo(() => {
    const list = [
      findClip(names, names, ["Explaining_1", "explaining1"]),
      findClip(names, names, ["Explaining_2", "explaining2"]),
      findClip(names, names, ["Gesture_Pointing", "pointing"]),
    ].filter((name): name is string => Boolean(name));
    return [...new Set(list)];
  }, [names]);

  useEffect(() => {
    const idle = findClip(names, names, ["Idle", "Breathing", "Standing"]);
    const next = mode === "speaking"
      ? (speakingClips[0] ?? idle)
      : mode === "thinking"
        ? findClip(names, names, ["Thinking", "Idle"]) ?? idle
        : idle;
    if (!next || !actions[next]) return;
    const target = actions[next];
    target.reset().fadeIn(0.35).play();
    const previous = Object.entries(actions).find(([name, action]) => name !== next && action?.isRunning())?.[1];
    if (previous && previous !== target) previous.crossFadeTo(target, 0.4, false);
    return () => { target.fadeOut(0.25); };
  }, [actions, mode, names, speakingClips]);

  useEffect(() => {
    if (mode !== "speaking" || speakingClips.length < 2) return;
    let current = "";
    let timer: number;
    const cycle = () => {
      const available = speakingClips.filter((name) => name !== current);
      const next = available[Math.floor(Math.random() * available.length)] ?? speakingClips[0];
      const target = actions[next];
      if (target) {
        const previous = actions[current];
        target.reset().fadeIn(0.4).play();
        if (previous && previous !== target) previous.crossFadeTo(target, 0.4, false);
        current = next;
      }
      timer = window.setTimeout(cycle, 4000 + Math.random() * 1000);
    };
    cycle();
    return () => window.clearTimeout(timer);
  }, [actions, mode, speakingClips]);

  useFrame((_, delta) => {
    if (rig.head) {
      const listening = isUserTyping || mode === "listening";
      const down = listening ? 0.28 : 0;
      thinkingPhase.current += delta;
      const nod = mode === "thinking" ? Math.sin(thinkingPhase.current * 2.15) * 0.045 : 0;
      rig.head.rotation.x = THREE.MathUtils.lerp(rig.head.rotation.x, rig.headRestX + down + nod, 1 - Math.exp(-delta * 5));
    }
    if (rig.neck) {
      const down = isUserTyping || mode === "listening" ? 0.07 : 0;
      rig.neck.rotation.x = THREE.MathUtils.lerp(rig.neck.rotation.x, rig.neckRestX + down, 1 - Math.exp(-delta * 4));
    }

    const blinkState = blink.current;
    blinkState.elapsed += delta;
    if (blinkState.elapsed >= blinkState.next) {
      blinkState.elapsed = 0;
      blinkState.next = 3 + Math.random() * 2;
      blinkState.from = blinkState.value;
      blinkState.to = 1;
      blinkState.duration = 0.07 + Math.random() * 0.04;
    }
    if (blinkState.to === 1 && blinkState.elapsed >= blinkState.duration) {
      blinkState.from = 1;
      blinkState.to = 0;
      blinkState.elapsed = 0;
      blinkState.duration = 0.09;
    }
    const blinkProgress = Math.min(1, blinkState.elapsed / blinkState.duration);
    blinkState.value = THREE.MathUtils.lerp(blinkState.from, blinkState.to, blinkProgress);
    const jaw = speakingRef.current ? jawRef.current : 0;
    for (const morph of rig.morphs) {
      for (const [key, index] of Object.entries(morph.dictionary)) {
        const normalized = key.toLowerCase().replace(/[^a-z]/g, "");
        if (normalized === "eyeblinkleft" || normalized === "eyeblinkright") {
          morph.influences[index] = blinkState.value;
        } else if (normalized === "jawopen" || normalized === "mouthopen") {
          morph.influences[index] = jaw;
        } else if (/viseme(aa|ah)$/.test(normalized)) {
          morph.influences[index] = jaw * 0.72;
        } else if (/eyelookdown(left|right)$/.test(normalized)) {
          morph.influences[index] = isUserTyping ? 0.45 : 0;
        }
      }
    }
    if (root.current && mode === "idle") {
      root.current.position.y = -1.23 + Math.sin(mixer.time * 1.6) * 0.012;
    } else if (root.current) {
      root.current.position.y = THREE.MathUtils.lerp(root.current.position.y, -1.23, 1 - Math.exp(-delta * 5));
    }
  });

  return <group ref={root} position={[0, -1.23, 0]} scale={1.72} dispose={null}>
    <primitive object={scene} />
  </group>;
}

useGLTF.preload(MODEL_URL);
export { EXPECTED_CLIPS };
