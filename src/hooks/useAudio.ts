import { useCallback, useRef } from 'react';
import { AudioConfig } from '../types';

export function useAudio(config: AudioConfig) {
  const audioContextRef = useRef<AudioContext | null>(null);

  const getAudioContext = useCallback(() => {
    try {
      if (typeof window === 'undefined') return null;
      if (!audioContextRef.current) {
        const AudioCtx = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
        if (AudioCtx) {
          audioContextRef.current = new AudioCtx();
        }
      }
      if (audioContextRef.current && audioContextRef.current.state === 'suspended') {
        audioContextRef.current.resume().catch(() => {});
      }
      return audioContextRef.current;
    } catch (e) {
      console.warn('AudioContext failed:', e);
      return null;
    }
  }, []);

  // Synthesizer sounds using Web Audio API (Cute anime chimes and alerts)
  const playSynthSound = useCallback((type: 'chime' | 'alert' | 'complete' | 'routine' | 'peek') => {
    if (!config.enabled) return;
    try {
      const ctx = getAudioContext();
      if (!ctx) return;

      const masterGain = ctx.createGain();
      masterGain.gain.setValueAtTime(config.volume, ctx.currentTime);
      masterGain.connect(ctx.destination);

      const now = ctx.currentTime;

      if (type === 'peek') {
        // Single crisp bubble pop sound effect (1 ketukan)
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();

        osc.type = 'sine';
        osc.frequency.setValueAtTime(520, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.05);

        gain.gain.setValueAtTime(0.2, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.06);

        osc.connect(gain);
        gain.connect(masterGain);
        osc.start(now);
        osc.stop(now + 0.06);
      } else if (type === 'chime') {
        // High playful anime ding-dong
        [659.25, 880, 1046.5].forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = now + index * 0.08;

          osc.type = 'triangle';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.2, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.3);

          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(startTime);
          osc.stop(startTime + 0.3);
        });
      } else if (type === 'alert') {
        // Attention alert / Denia H-1 Warning Sound
        [880, 1174.66, 880, 1174.66].forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = now + index * 0.12;

          osc.type = 'sawtooth';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.15, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.1);

          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(startTime);
          osc.stop(startTime + 0.11);
        });
      } else if (type === 'complete') {
        // Happy task completion arpeggio
        [523.25, 659.25, 783.99, 1046.50].forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = now + index * 0.06;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.25, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.35);

          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(startTime);
          osc.stop(startTime + 0.35);
        });
      } else if (type === 'routine') {
        // Gentle routine reminder synth chime
        [440, 554.37, 659.25].forEach((freq, index) => {
          const osc = ctx.createOscillator();
          const gain = ctx.createGain();
          const startTime = now + index * 0.1;

          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, startTime);

          gain.gain.setValueAtTime(0.2, startTime);
          gain.gain.exponentialRampToValueAtTime(0.001, startTime + 0.4);

          osc.connect(gain);
          gain.connect(masterGain);
          osc.start(startTime);
          osc.stop(startTime + 0.4);
        });
      }
    } catch (e) {
      console.warn('Audio playback error:', e);
    }
  }, [config.enabled, config.volume, getAudioContext]);

  // Custom audio file playback fallback
  const playCustomAudio = useCallback((url: string) => {
    if (!config.enabled || !url) return;
    try {
      const audio = new Audio(url);
      audio.volume = config.volume;
      audio.play().catch(err => console.warn('Custom audio playback blocked:', err));
    } catch (err) {
      console.warn('Custom audio error:', err);
    }
  }, [config.enabled, config.volume]);

  const playNotification = useCallback((type: 'chime' | 'alert' | 'complete' | 'routine' | 'task' | 'schedule' | 'peek' | 'pointing') => {
    if (!config.enabled) return; // Master Mute check

    const customUrl = config.stateSounds?.[type as keyof typeof config.stateSounds];
    if (config.soundType === 'custom' && customUrl) {
      playCustomAudio(customUrl);
    } else {
      let synthType: 'chime' | 'alert' | 'complete' | 'routine' | 'peek' = 'chime';
      if (type === 'pointing' || type === 'task' || type === 'schedule' || type === 'chime') {
        synthType = 'chime';
      } else {
        synthType = type as 'alert' | 'complete' | 'routine' | 'peek';
      }
      playSynthSound(synthType);
    }
  }, [config.enabled, config.soundType, config.stateSounds, playCustomAudio, playSynthSound]);

  // Feature 1: Speech Bubble Sound Effect (Bubble Pop)
  const speakText = useCallback((_text?: string) => {
    // Play cute bubble pop sound effect when speech bubble appears
    playNotification('peek');
  }, [playNotification]);

  // Feature 4: Native Browser Push Notifications
  const requestPushPermission = useCallback(async () => {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      try {
        const permission = await Notification.requestPermission();
        return permission === 'granted';
      } catch (e) {
        console.warn('Push notification permission error:', e);
      }
    }
    return false;
  }, []);

  const sendPushNotification = useCallback((title: string, body: string, tag = 'remmie-alert') => {
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body,
          tag,
          requireInteraction: true,
        });
      } catch (e) {
        console.warn('Push notification send error:', e);
      }
    }
  }, []);

  return { playNotification, playSynthSound, playCustomAudio, speakText, requestPushPermission, sendPushNotification };
}
