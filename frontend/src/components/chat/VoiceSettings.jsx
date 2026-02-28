import { getLanguageName } from "@faster-chat/shared";
import Modal from "@/components/ui/Modal";

const VoiceSettings = ({ voiceControls, onClose }) => {
  const handleVoiceChange = (e) => {
    const voiceName = e.target.value;
    const voice = voiceControls.availableVoices.find((v) => v.name === voiceName);

    if (voice) {
      voiceControls.changeVoice(voice);
    }
  };

  const voicesByLanguage = voiceControls.availableVoices.reduce((acc, voice) => {
    const lang = voice.lang;
    if (!acc[lang]) {
      acc[lang] = [];
    }
    acc[lang].push(voice);
    return acc;
  }, {});

  return (
    <Modal isOpen={true} onClose={onClose} title="Voice Settings">
      <div className="space-y-3">
        <label className="text-theme-text-subtle block text-sm font-medium">Select Voice</label>

        <select
          value={voiceControls.selectedVoice?.name || ""}
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

        {voiceControls.isActive && (
          <div className="bg-theme-green/10 text-theme-green rounded-lg px-3 py-2 text-sm">
            Voice conversation is active
          </div>
        )}
      </div>
    </Modal>
  );
};

export default VoiceSettings;
