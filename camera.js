// All ESP32 endpoint configuration lives here. Snapshots permit reliable CORS pixel access.
export const CAMERA_CONFIG = { defaultIP: '192.168.1.100', snapshotPath: '/capture', streamPort: 81, streamPath: '/stream', timeout: 8000 };
export class Camera {
  constructor(video, onLost) { this.video = video; this.onLost = onLost; this.generation = 0; this.active = false; }
  async connect(source, ip) {
    this.disconnect(); const generation = this.generation; this.source = source;
    if (source === 'webcam') {
      if (!navigator.mediaDevices?.getUserMedia) throw Error('Webcam requires localhost or HTTPS and a browser with camera support.');
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment', width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 30, max: 30 } }, audio: false });
      if (generation !== this.generation) { stream.getTracks().forEach(t => t.stop()); return false; }
      this.stream = stream; this.video.srcObject = stream; await this.video.play();
      stream.getVideoTracks()[0].onended = () => this.onLost('Camera access ended. Reconnect your camera.');
    } else {
      if (!/^(localhost|[a-zA-Z0-9.-]+)(:\d{1,5})?$/.test(ip)) throw Error('Enter a camera IP or hostname, optionally with a port; omit http:// and paths.');
      this.url = `http://${ip}${CAMERA_CONFIG.snapshotPath}`;
      await this.snapshot();
    }
    if (generation !== this.generation) return false;
    this.active = true; return true;
  }
  async snapshot() {
    const generation = this.generation;
    this.controller = new AbortController(); const controller = this.controller;
    const timeout = setTimeout(() => controller.abort(), CAMERA_CONFIG.timeout);
    try {
      const response = await fetch(`${this.url}?t=${Date.now()}`, { mode: 'cors', cache: 'no-store', signal: controller.signal });
      if (!response.ok) throw Error(`Camera returned HTTP ${response.status}`);
      const bitmap = await createImageBitmap(await response.blob());
      if (generation !== this.generation) { bitmap.close(); return; }
      this.bitmap?.close(); this.bitmap = bitmap;
    } finally { clearTimeout(timeout); }
  }
  currentFrame() { return this.source === 'webcam' ? (this.video.readyState >= 2 ? this.video : null) : this.bitmap; }
  async frame() { if (!this.active) return null; if (this.source === 'esp32') await this.snapshot(); return this.source === 'webcam' ? this.video : this.bitmap; }
  disconnect() { this.generation++; this.active = false; this.controller?.abort(); this.stream?.getTracks().forEach(t => { t.onended = null; t.stop(); }); this.stream = null; this.video.srcObject = null; this.bitmap?.close(); this.bitmap = null; }
}
