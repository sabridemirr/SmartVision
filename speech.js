const names = { person: 'insan', chair: 'sandalye', bicycle: 'bisiklet', car: 'araba', backpack: 'sırt çantası' };
export class Voice {
  constructor(status) { this.status = status; this.last = ''; this.lastKey = ''; this.lastTime = 0; this.enabled = true; this.language = 'en-US'; this.rate = 1; this.available = 'speechSynthesis' in window; if (!this.available) status.textContent = 'Speech is unavailable in this browser.'; }
  stop() { if (this.available) speechSynthesis.cancel(); }
  say(text) {
    if (!this.enabled) { this.status.textContent = 'Enable Voice Assistance to speak.'; return; }
    if (!this.available) { this.status.textContent = 'Speech is unavailable in this browser.'; return; }
    this.stop(); const utterance = new SpeechSynthesisUtterance(text); utterance.lang = this.language; utterance.rate = this.rate;
    const voices = speechSynthesis.getVoices(); utterance.voice = voices.find(v => v.lang === this.language) || voices.find(v => v.lang.startsWith(this.language.slice(0,2))) || null;
    this.status.textContent = text; utterance.onerror = e => { if (!['interrupted','canceled'].includes(e.error)) this.status.textContent = 'Speech failed. Check installed voices and audio output.'; };
    speechSynthesis.speak(utterance);
  }
  describe(predictions, automatic = false) {
    const classes = [...new Set(predictions.map(p => p.class))].sort(); const key = classes.join(',');
    if (automatic && (!classes.length || Date.now()-this.lastTime < 10000 || (key === this.lastKey && Date.now()-this.lastTime < 30000))) return;
    const text = this.language === 'tr-TR' ? (classes.length ? `Kamera görüntüsünde ${classes.map(c => names[c]).join(', ')} algılandı.` : 'Desteklenen nesne algılanmadı.') : (classes.length ? `${classes.join(', ')} detected in the camera view.` : 'No supported objects detected.');
    this.last = text; this.lastKey = key; this.lastTime = Date.now(); this.say(text);
  }
}
