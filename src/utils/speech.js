/**
 * Speech utility — Web Speech API wrapper
 * Used for voice prompts throughout the app (non-verbal UI for young children)
 */

export function speakPrompt(text, lang = 'ja-JP') {
  if (!window.speechSynthesis) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.lang = lang;
  u.rate = 0.85;
  u.pitch = 1.1;
  u.volume = 1;
  window.speechSynthesis.speak(u);
}

export function stopSpeech() {
  if (window.speechSynthesis) window.speechSynthesis.cancel();
}
