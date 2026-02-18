import { useRef, useState, useCallback, useEffect } from 'react';

export function useSpeech() {
  const [muted, setMuted] = useState(false);
  const mutedRef = useRef(false);

  // Cancel any speech on unmount
  useEffect(() => {
    return () => { window.speechSynthesis?.cancel(); };
  }, []);

  const speak = useCallback((text) => {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.92;   // slightly slower — more dramatic
    utterance.pitch = 0.85;  // slightly deeper
    utterance.volume = mutedRef.current ? 0 : 1; // silent when muted, not skipped
    window.speechSynthesis.speak(utterance);
  }, []);

  const cancel = useCallback(() => {
    window.speechSynthesis?.cancel();
  }, []);

  const toggleMute = useCallback(() => {
    mutedRef.current = !mutedRef.current;
    setMuted(mutedRef.current);
    // Don't cancel — let speech continue silently so timing stays intact
  }, []);

  return { speak, cancel, muted, toggleMute };
}
