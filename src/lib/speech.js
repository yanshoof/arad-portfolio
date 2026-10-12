// Picks the most natural-sounding available browser TTS voice.
// Browsers (especially Chrome/Edge) expose cloud "Natural"/"Neural" voices for free.
// This ranks the voice list and caches the best pick.

let cachedVoice = null;

function scoreVoice(v) {
  const name = (v.name || '').toLowerCase();
  let score = 0;

  // English voices strongly preferred
  if (v.lang && v.lang.toLowerCase().startsWith('en')) score += 50;
  if (v.lang === 'en-US') score += 10;

  // Natural/Neural/Online variants sound far more human
  if (name.includes('natural')) score += 100;
  if (name.includes('neural')) score += 80;
  if (name.includes('online')) score += 40;
  if (name.includes('wavenet')) score += 70;
  if (name.includes('studio')) score += 60;

  // Known good voice names
  if (name.includes('jenny')) score += 30;       // Microsoft Jenny (Natural)
  if (name.includes('aria')) score += 25;        // Microsoft Aria
  if (name.includes('guy')) score += 20;         // Microsoft Guy
  if (name.includes('samantha')) score += 20;    // Apple Samantha (decent)
  if (name.includes('google')) score += 15;      // Google voices on Chrome

  // Penalize clearly robotic ones
  if (name.includes('microsoft david')) score -= 20;
  if (name.includes('microsoft zira')) score -= 10;
  if (name.includes('espeak')) score -= 100;

  if (!v.localService) score += 5; // cloud voices usually better

  return score;
}

export function getBestVoice() {
  if (cachedVoice) return cachedVoice;
  const voices = window.speechSynthesis.getVoices();
  if (!voices || voices.length === 0) return null;
  const ranked = [...voices].sort((a, b) => scoreVoice(b) - scoreVoice(a));
  cachedVoice = ranked[0];
  return cachedVoice;
}

export function speakText(text, { onEnd } = {}) {
  window.speechSynthesis.cancel();
  const utterance = new SpeechSynthesisUtterance(text);
  const voice = getBestVoice();
  if (voice) utterance.voice = voice;
  utterance.rate = 1.0;
  utterance.pitch = 1.0;
  if (onEnd) utterance.onend = onEnd;
  window.speechSynthesis.speak(utterance);
  return utterance;
}

// Voices load asynchronously in most browsers — preload them.
if (typeof window !== 'undefined' && window.speechSynthesis) {
  window.speechSynthesis.getVoices();
  window.speechSynthesis.onvoiceschanged = () => {
    cachedVoice = null;
    getBestVoice();
  };
}