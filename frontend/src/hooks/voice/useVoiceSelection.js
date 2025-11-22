import { useEffect, useState } from 'preact/hooks';
import { VOICE_CONSTANTS } from '@faster-chat/shared';

export function useVoiceSelection() {
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return; // Not loaded yet

      setAvailableVoices(voices);

      const savedVoiceName = localStorage.getItem(VOICE_CONSTANTS.STORAGE_KEY_VOICE);
      const voice = voices.find(v => v.name === savedVoiceName) ||
                   voices.find(v => v.lang.startsWith('en')) ||
                   voices[0];
      setSelectedVoice(voice);
    };

    if (window.speechSynthesis.onvoiceschanged !== undefined) {
      window.speechSynthesis.onvoiceschanged = loadVoices;
    }
    loadVoices();

    return () => {
      window.speechSynthesis.onvoiceschanged = null;
    };
  }, []);

  const changeVoice = (voice) => {
    setSelectedVoice(voice);
    localStorage.setItem(VOICE_CONSTANTS.STORAGE_KEY_VOICE, voice.name);
    localStorage.setItem(VOICE_CONSTANTS.STORAGE_KEY_LANGUAGE, voice.lang);
  };

  return {
    availableVoices,
    selectedVoice,
    changeVoice,
  };
}
