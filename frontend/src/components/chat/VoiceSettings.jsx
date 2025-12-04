import { useState } from "preact/hooks";
import { Volume2, X } from "lucide-react";
import { getLanguageName } from "@faster-chat/shared";

const VoiceSettings = ({ voiceControls, onClose }) => {
  const [selectedVoice, setSelectedVoice] = useState(voiceControls.selectedVoice?.name || "");

  const handleVoiceChange = (e) => {
    const voiceName = e.target.value;
    const voice = voiceControls.availableVoices.find((v) => v.name === voiceName);

    if (voice) {
      voiceControls.changeVoice(voice);
      setSelectedVoice(voice.name);
    }
  };

  // Group voices by language
  const voicesByLanguage = voiceControls.availableVoices.reduce((acc, voice) => {
    const lang = voice.lang;
    if (!acc[lang]) {
      acc[lang] = [];
    }
    acc[lang].push(voice);
    return acc;
  }, {});

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-theme-surface border-theme-border relative w-full max-w-md rounded-2xl border p-6 shadow-xl">
        {/* Header */}
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Volume2 size={20} className="text-theme-blue" />
            <h2 className="text-theme-text text-lg font-semibold">Voice Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="text-theme-overlay hover:text-theme-text hover:bg-theme-surface-strong/50 rounded-lg p-2 transition-all"
            aria-label="Close">
            <X size={20} />
          </button>
        </div>

        {/* Voice Selection */}
        <div className="space-y-3">
          <label className="text-theme-text-subtle block text-sm font-medium">Select Voice</label>

          <select
            value={selectedVoice}
            onChange={handleVoiceChange}
            className="bg-theme-surface text-theme-text border-theme-overlay/20 focus:border-theme-blue focus:ring-theme-blue/20 w-full rounded-lg border px-4 py-2 focus:ring-2 focus:outline-none">
            <option value="">Select a voice...</option>
            {Object.entries(voicesByLanguage).map(([lang, voices]) => (
              <optgroup key={lang} label={getLanguageName(lang)}>
                {voices.map((voice) => (
                  <option key={voice.name} value={voice.name}>
                    {voice.name} {voice.localService ? "(Local)" : "(Online)"}
                  </option>
                ))}
              </optgroup>
            ))}
          </select>

          {/* Voice Info */}
          {voiceControls.selectedVoice && (
            <div className="bg-theme-surface/50 rounded-lg p-3">
              <p className="text-theme-text-subtle text-sm">
                <span className="font-medium">Language:</span>{" "}
                {getLanguageName(voiceControls.selectedVoice.lang)}
              </p>
              <p className="text-theme-text-subtle text-sm">
                <span className="font-medium">Type:</span>{" "}
                {voiceControls.selectedVoice.localService ? "Local" : "Online"}
              </p>
            </div>
          )}

          {/* Status */}
          {voiceControls.isActive && (
            <div className="bg-theme-green/10 text-theme-green rounded-lg px-3 py-2 text-sm">
              Voice conversation is active
            </div>
          )}
        </div>

        {/* Close Button */}
        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="btn btn-primary px-4 py-2 text-sm">
            Done
          </button>
        </div>
      </div>
    </div>
  );
};

export default VoiceSettings;
