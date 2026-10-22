import { Camera } from './camera.js';
import { Detection, draw } from './detection.js';
import { Voice } from './speech.js';
import { setupNavigation } from './navigation.js';
const $ = id => document.getElementById(id);
const ai = new Detection(), voice = new Voice($('speech-status'));
const camera = new Camera($('video'), message => stop(message, true));
let generation = 0, predictions = [], observedAt = 0, timer, previewTimer, captureTimer, working = false, settingsRevision = 0;
const snapshot = document.createElement('canvas');
const settings = ['source','camera-ip','language','mode','confidence','rate','speed','voice'];
let saved = {}; try { saved = JSON.parse(localStorage.getItem('smartvision-settings') || '{}'); } catch {}
settings.forEach(id => {
  const el = $(id);
  if (saved[id] !== undefined) { if (el.type === 'checkbox') el.checked = saved[id] === true; else el.value = saved[id]; }
  el.addEventListener('change', () => {
    if (['source','camera-ip'].includes(id)) stop('Camera settings changed. Connect to apply.');
    if (['confidence','mode','language','voice'].includes(id)) clearResults();
    updateSettings();
    const values = Object.fromEntries(settings.map(key => [key, $(key).type === 'checkbox' ? $(key).checked : $(key).value]));
    try { localStorage.setItem('smartvision-settings', JSON.stringify(values)); } catch {}
  });
});
function updateSettings() { voice.enabled = $('voice').checked; voice.language = $('language').value; voice.rate = Number($('speed').value) || 1; if (!voice.enabled) voice.stop(); $('confidence-value').value = `${$('confidence').value}%`; $('source-label').textContent = $('source').value === 'webcam' ? 'WEBCAM TEST' : 'ESP32-CAM'; }
$('confidence').addEventListener('input', () => $('confidence-value').value = `${$('confidence').value}%`);
function status(state) {
  document.querySelectorAll('.connection').forEach(el => { el.textContent = `● ${state}`; el.className = `badge connection ${state.toLowerCase()}`; });
  $('view-status').textContent = state === 'Connected' ? '● CAMERA LIVE' : state === 'Connecting' ? '◌ CONNECTING' : '○ CAMERA OFFLINE';
  $('stop').disabled = $('disconnect').disabled = state === 'Disconnected';
  $('connect').disabled = $('start').disabled = state !== 'Disconnected';
}
function clearResults() { settingsRevision++; predictions = []; observedAt = 0; voice.last = ''; voice.stop(); $('count').textContent = '0'; $('objects').replaceChildren(); const p = document.createElement('p'); p.className = 'hint'; p.textContent = 'No current observations. Start a camera with AI enabled.'; $('objects').append(p); }
function stop(message = 'Camera disconnected. Please check your Wi-Fi connection and camera IP address.', error = false) {
  generation++; clearTimeout(timer); clearTimeout(captureTimer); cancelAnimationFrame(previewTimer); camera.disconnect(); clearResults(); status('Disconnected');
  $('camera-empty').hidden = false; $('preview').getContext('2d').clearRect(0,0,$('preview').width,$('preview').height);
  $('camera-message').textContent = message; $('camera-message').classList.toggle('error',error); $('camera-caption').textContent = 'Camera disconnected'; $('resolution').textContent = 'Waiting for camera'; $('fps').textContent = '— FPS';
  if (ai.model) $('ai-status').textContent = 'AI ready';
  if (error) voice.say(voice.language === 'tr-TR' ? 'Kamera bağlantısı kesildi. Bağlantıyı kontrol edin.' : 'Camera disconnected. Please check the connection.');
}
async function loadAI() {
  $('ai-status').textContent = 'Loading AI model...'; $('retry').disabled = true;
  try { await ai.load(); $('ai-status').textContent = 'AI ready'; $('retry').textContent = 'AI loaded'; }
  catch(error) { $('ai-status').textContent = `AI unavailable: ${error.message}`; $('retry').textContent = 'Retry AI'; }
  finally { $('retry').disabled = !!ai.model; }
}
async function start() {
  stop('Connecting camera…'); const token = generation; status('Connecting');
  try {
    const connected = await camera.connect($('source').value, $('camera-ip').value.trim());
    if (token !== generation || !connected) return;
    status('Connected'); $('camera-empty').hidden = true; $('camera-message').classList.remove('error');
    $('camera-message').textContent = camera.source === 'webcam' ? 'Webcam testing mode · real images and real model predictions.' : `ESP32-CAM ${$('camera-ip').value} · CORS-enabled JPEG frames`;
    $('camera-caption').textContent = 'Camera connected'; loadAI(); preview(token); if (camera.source === 'esp32') capture(token); tick(token);
  } catch (error) { if (token === generation) stop(`${error.message} Check camera permissions, Wi-Fi, IP address, and CORS.`, true); }
}
function preview(token) {
  if (token !== generation || !camera.active) return;
  if (!document.hidden) {
    const frame = camera.currentFrame();
    if (frame) draw($('preview'), frame, observedAt && Date.now() - observedAt < 1000 ? predictions : []);
  }
  previewTimer = requestAnimationFrame(() => preview(token));
}
async function capture(token) {
  if (token !== generation || !camera.active) return;
  if (document.hidden) { captureTimer = setTimeout(() => capture(token), 300); return; }
  const started = performance.now();
  try { await camera.snapshot(); }
  catch (error) { if (token === generation) stop(`Camera frame failed: ${error.message}`, true); }
  finally {
    if (token === generation && camera.active) captureTimer = setTimeout(() => capture(token), Math.max(0,100-(performance.now()-started)));
  }
}
async function tick(token) {
  if (token !== generation || !camera.active) return;
  if (working || document.hidden) { timer = setTimeout(() => tick(token), 300); return; }
  working = true; const started = performance.now();
  try {
    const frame = camera.currentFrame(); if (token !== generation || !frame) return;
    const width = frame.videoWidth || frame.width, height = frame.videoHeight || frame.height;
    if (!width || !height) return;
    // One inference owns this reusable, bounded canvas until its promise settles.
    const scale = Math.min(1, 640 / width);
    if (snapshot.width !== Math.round(width * scale)) snapshot.width = Math.round(width * scale);
    if (snapshot.height !== Math.round(height * scale)) snapshot.height = Math.round(height * scale);
    snapshot.getContext('2d').drawImage(frame,0,0,snapshot.width,snapshot.height);
    const revision = settingsRevision, capturedAt = Date.now();
    let results = [];
    if (ai.model) {
      $('ai-status').textContent = 'Detecting';
      try { results = await ai.detect(snapshot, Number($('confidence').value)/100); }
      catch (error) { if (token === generation && revision === settingsRevision) { $('ai-status').textContent = `AI error: ${error.message}`; clearResults(); } return; }
    }
    if (token !== generation || document.hidden || revision !== settingsRevision) return;
    results = results.map(p => ({ ...p, bbox: p.bbox.map(v => v / scale) }));
    $('resolution').textContent = `${width} × ${height} / ${camera.source === 'webcam' ? 'DEVICE CAMERA' : 'WI-FI SNAPSHOTS'}`;
    $('fps').textContent = `${(1000/Math.max(Number($('rate').value),performance.now()-started)).toFixed(1)} AI FPS`;
    if (ai.model) {
      predictions = results; observedAt = capturedAt; $('count').textContent = results.length; $('objects').replaceChildren();
      if (!results.length) { const p = document.createElement('p'); p.className = 'hint'; p.textContent = 'No objects recognized in this frame. Unrecognized obstacles may still be present.'; $('objects').append(p); }
      results.forEach(p => { const row = document.createElement('div'); row.className = 'object-row'; const name = document.createElement('span'); name.textContent = p.class[0].toUpperCase()+p.class.slice(1); const score = document.createElement('strong'); score.textContent = `${Math.round(p.score*100)}%`; row.append(name,score); $('objects').append(row); });
      if ($('mode').value === 'automatic' && voice.enabled) voice.describe(results,true);
    }
  } catch(error) { if (token === generation) stop(`Camera frame failed: ${error.message}`, true); }
  finally { working = false; if (token === generation && camera.active) timer = setTimeout(() => tick(token), Math.max(0, Number($('rate').value)-(performance.now()-started))); }
}
function fresh() { return camera.active && ai.model && observedAt && Date.now()-observedAt < 5000 && !document.hidden; }
$('describe').onclick = () => fresh() ? voice.describe(predictions) : voice.say(voice.language === 'tr-TR' ? 'Güncel gözlem yok. Kamera ve yapay zekayı kontrol edin.' : 'No current observations. Check the camera and AI status.');
$('repeat').onclick = () => fresh() && voice.last ? voice.say(voice.last) : voice.say('No recent description to repeat.');
$('speak-stop').onclick = () => { voice.stop(); $('speech-status').textContent = 'Speech stopped.'; };
$('connect').onclick = $('start').onclick = start; $('stop').onclick = $('disconnect').onclick = () => { stop(); voice.say(voice.language === 'tr-TR' ? 'Kamera bağlantısı kesildi.' : 'Camera disconnected.'); };
$('retry').onclick = loadAI;
document.addEventListener('visibilitychange', () => { if (document.hidden) { clearResults(); $('preview').getContext('2d').clearRect(0,0,$('preview').width,$('preview').height); } });
window.addEventListener('offline', () => { if (camera.source === 'esp32') stop('Network connection lost. Reconnect to the camera Wi-Fi.', true); });
window.addEventListener('pagehide', () => { camera.disconnect(); voice.stop(); });
setupNavigation(); updateSettings();
