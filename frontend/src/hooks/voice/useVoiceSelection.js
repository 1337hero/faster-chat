import { useEffect, useState } from "preact/hooks";
import { VOICE_CONSTANTS } from "@faster-chat/shared";

const selectDefaultVoice = (voices, savedVoiceName) => {
  const savedVoice = voices.find((v) => v.name === savedVoiceName);
  if (savedVoice) return savedVoice;

  const englishVoice = voices.find((v) =>
    v.lang.startsWith(VOICE_CONSTANTS.DEFAULT_LANGUAGE_PREFIX)
  );
  if (englishVoice) return englishVoice;

  return voices[0]; // First available as fallback
};

export function useVoiceSelection() {
  const [availableVoices, setAvailableVoices] = useState([]);
  const [selectedVoice, setSelectedVoice] = useState(null);

  useEffect(() => {
    const loadVoices = () => {
      const voices = window.speechSynthesis.getVoices();
      if (voices.length === 0) return;

      setAvailableVoices(voices);

      const savedVoiceName = localStorage.getItem(VOICE_CONSTANTS.STORAGE_KEY_VOICE);
      setSelectedVoice(selectDefaultVoice(voices, savedVoiceName));
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
