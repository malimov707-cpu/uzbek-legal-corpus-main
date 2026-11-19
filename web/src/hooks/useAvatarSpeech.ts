import { useEffect, useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ConferenceReply } from "../services/conferenceApi";

export interface AvatarSpeech {
  id: number;
  reply: ConferenceReply;
}

function selectSpeechVoice(voices: SpeechSynthesisVoice[]) {
  return voices.find((voice) => /^uz(?:-|$)/i.test(voice.lang))
    ?? voices.find((voice) => /^ru(?:-|$)/i.test(voice.lang))
    ?? voices.find((voice) => /^en(?:-|$)/i.test(voice.lang))
    ?? voices.find((voice) => voice.default)
    ?? voices[0];
}

export function useAvatarSpeech(
  speech: AvatarSpeech | null,
  onStart: () => void,
  onEnd: () => void,
) {
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const samplesRef = useRef(new Uint8Array(128));
  const speakingRef = useRef(false);
  const jawRef = useRef(0);
  const pulseRef = useRef(0);
  const callbacksRef = useRef({ onStart, onEnd });
  callbacksRef.current = { onStart, onEnd };

  useEffect(() => {
    if (!speech) return;
    let disposed = false;
    let ended = false;
    const finish = () => {
      if (ended || disposed) return;
      ended = true;
      speakingRef.current = false;
      jawRef.current = 0;
      callbacksRef.current.onEnd();
    };
    const start = () => {
      if (disposed) return;
      speakingRef.current = true;
      callbacksRef.current.onStart();
    };

    if (speech.reply.audio_base64 && speech.reply.audio_mime_type) {
      const binary = atob(speech.reply.audio_base64);
      const bytes = new Uint8Array(binary.length);
      for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
      const objectUrl = URL.createObjectURL(
        new Blob([bytes], { type: speech.reply.audio_mime_type }),
      );
      const audio = new Audio(objectUrl);
      audioRef.current = audio;
      const context = new AudioContext();
      audioContextRef.current = context;
      const source = context.createMediaElementSource(audio);
      const analyser = context.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.72;
      source.connect(analyser);
      analyser.connect(context.destination);
      sourceRef.current = source;
      analyserRef.current = analyser;
      audio.onplay = start;
      audio.onended = finish;
      audio.onerror = finish;
      void context.resume().then(() => audio.play()).catch(finish);
      return () => {
        disposed = true;
        speakingRef.current = false;
        jawRef.current = 0;
        audio.pause();
        audio.removeAttribute("src");
        URL.revokeObjectURL(objectUrl);
        source.disconnect();
        analyser.disconnect();
        void context.close();
        if (audioRef.current === audio) audioRef.current = null;
        analyserRef.current = null;
        audioContextRef.current = null;
        sourceRef.current = null;
      };
    }

    if ("speechSynthesis" in window && "SpeechSynthesisUtterance" in window) {
      const synth = window.speechSynthesis;
      const utterance = new SpeechSynthesisUtterance(speech.reply.answer);
      utterance.volume = 1;
      utterance.rate = 0.92;
      utterance.pitch = 1;
      utterance.onstart = start;
      utterance.onend = finish;
      utterance.onerror = finish;
      pulseRef.current = 0;
      synth.cancel();

      let launchTimer = 0;
      let launched = false;
      const removeVoiceListener = () => synth.removeEventListener("voiceschanged", onVoicesChanged);
      const launch = () => {
        if (disposed || launched) return;
        launched = true;
        window.clearTimeout(launchTimer);
        removeVoiceListener();
        const voice = selectSpeechVoice(synth.getVoices());
        if (voice) {
          utterance.voice = voice;
          utterance.lang = voice.lang;
        } else {
          utterance.lang = "uz-UZ";
        }
        try {
          synth.resume();
          synth.speak(utterance);
        } catch {
          finish();
        }
      };
      const onVoicesChanged = () => {
        if (synth.getVoices().length) launch();
      };

      if (synth.getVoices().length) launch();
      else {
        synth.addEventListener("voiceschanged", onVoicesChanged);
        // Some browsers do not emit voiceschanged; use their default voice after a short wait.
        launchTimer = window.setTimeout(launch, 400);
      }
      return () => {
        disposed = true;
        speakingRef.current = false;
        jawRef.current = 0;
        window.clearTimeout(launchTimer);
        removeVoiceListener();
        synth.cancel();
      };
    }

    finish();
    return () => { disposed = true; };
  }, [speech]);

  useFrame((_, delta) => {
    const analyser = analyserRef.current;
    let level = 0;
    if (analyser) {
      analyser.getByteFrequencyData(samplesRef.current);
      let sum = 0;
      for (let i = 2; i < 40; i += 1) sum += samplesRef.current[i] ?? 0;
      level = Math.min(1, (sum / 38 / 255) * 2.8);
    } else if (speakingRef.current) {
      pulseRef.current += delta;
      // Native speech has no readable audio stream; use a gentle syllabic pulse.
      level = 0.12 + Math.max(0, Math.sin(pulseRef.current * 15)) * 0.34;
    }
    jawRef.current = THREE.MathUtils.damp(
      jawRef.current,
      speakingRef.current ? level : 0,
      16,
      delta,
    );
  });

  return { jawRef, speakingRef };
}
