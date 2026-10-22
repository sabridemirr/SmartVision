function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script'); script.src = src;
    script.onload = resolve; script.onerror = () => { script.remove(); reject(Error('AI download failed. Check your internet connection and retry.')); };
    document.head.append(script);
  });
}
export class Detection {
  async load() {
    if (this.model) return this.model;
    if (this.loading) return this.loading;
    this.loading = (async () => {
      if (!window.tf) await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow/tfjs@4.22.0/dist/tf.min.js');
      if (!window.cocoSsd) await loadScript('https://cdn.jsdelivr.net/npm/@tensorflow-models/coco-ssd@2.2.3/dist/coco-ssd.min.js');
      await window.tf.ready();
      this.model = await window.cocoSsd.load({ base: 'lite_mobilenet_v2' }); return this.model;
    })().finally(() => { this.loading = null; });
    return this.loading;
  }
  async detect(frame, threshold) {
    if (!this.model) return [];
    return (await this.model.detect(frame, 80, threshold)).filter(p => p.score >= threshold);
  }
}
export function draw(canvas, frame, predictions) {
  const width = frame.videoWidth || frame.width, height = frame.videoHeight || frame.height;
  if (!width || !height) return;
  if (canvas.width !== width) canvas.width = width;
  if (canvas.height !== height) canvas.height = height;
  const ctx = canvas.getContext('2d'); ctx.drawImage(frame, 0, 0, width, height);
  ctx.lineWidth = Math.max(2, width / 300); ctx.font = `${Math.max(14, width / 40)}px sans-serif`;
  predictions.forEach(p => {
    const [x,y,w,h] = p.bbox, label = `${p.class} ${Math.round(p.score * 100)}%`;
    ctx.strokeStyle = '#43e1a0'; ctx.strokeRect(x,y,w,h);
    const boxHeight = Math.max(24, width / 25), top = Math.max(0,y-boxHeight);
    ctx.fillStyle = '#43e1a0'; ctx.fillRect(x,top,ctx.measureText(label).width+12,boxHeight);
    ctx.fillStyle = '#10213a'; ctx.fillText(label,x+6,top+boxHeight-6);
  });
}
