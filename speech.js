const names = {
  person: 'insan', bicycle: 'bisiklet', car: 'araba', motorcycle: 'motosiklet', airplane: 'uçak', bus: 'otobüs', train: 'tren', truck: 'kamyon', boat: 'tekne',
  'traffic light': 'trafik lambası', 'fire hydrant': 'yangın musluğu', 'stop sign': 'dur levhası', 'parking meter': 'parkmetre', bench: 'bank',
  bird: 'kuş', cat: 'kedi', dog: 'köpek', horse: 'at', sheep: 'koyun', cow: 'inek', elephant: 'fil', bear: 'ayı', zebra: 'zebra', giraffe: 'zürafa',
  backpack: 'sırt çantası', umbrella: 'şemsiye', handbag: 'el çantası', tie: 'kravat', suitcase: 'bavul', frisbee: 'frizbi', skis: 'kayak', snowboard: 'kar tahtası',
  'sports ball': 'spor topu', kite: 'uçurtma', 'baseball bat': 'beyzbol sopası', 'baseball glove': 'beyzbol eldiveni', skateboard: 'kaykay', surfboard: 'sörf tahtası', 'tennis racket': 'tenis raketi',
  bottle: 'şişe', 'wine glass': 'şarap kadehi', cup: 'fincan', fork: 'çatal', knife: 'bıçak', spoon: 'kaşık', bowl: 'kase', banana: 'muz', apple: 'elma', sandwich: 'sandviç', orange: 'portakal', broccoli: 'brokoli', carrot: 'havuç', 'hot dog': 'sosisli sandviç', pizza: 'pizza', donut: 'donut', cake: 'pasta',
  chair: 'sandalye', couch: 'kanepe', 'potted plant': 'saksı bitkisi', bed: 'yatak', 'dining table': 'yemek masası', toilet: 'tuvalet', tv: 'televizyon', laptop: 'dizüstü bilgisayar', mouse: 'fare', remote: 'uzaktan kumanda', keyboard: 'klavye', 'cell phone': 'cep telefonu', microwave: 'mikrodalga fırın', oven: 'fırın', toaster: 'ekmek kızartma makinesi', sink: 'lavabo', refrigerator: 'buzdolabı', book: 'kitap', clock: 'saat', vase: 'vazo', scissors: 'makas', 'teddy bear': 'oyuncak ayı', 'hair drier': 'saç kurutma makinesi', toothbrush: 'diş fırçası'
};
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
    const text = this.language === 'tr-TR' ? (classes.length ? `Kamera görüntüsünde ${classes.map(c => (names[c] || c)).join(', ')} algılandı.` : 'Nesne tanınmadı. Tanınmayan engeller bulunabilir.') : (classes.length ? `${classes.join(', ')} detected in the camera view.` : 'No objects recognized. Unrecognized obstacles may still be present.');
    this.last = text; this.lastKey = key; this.lastTime = Date.now(); this.say(text);
  }
}
