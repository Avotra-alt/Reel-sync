const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const generateBtn = document.getElementById('generateBtn');
const statusEl = document.getElementById('status');
const downloadLink = document.getElementById('downloadLink');
const audio = document.getElementById('audio');
const mediaList = document.getElementById('mediaList');
const countText = document.getElementById('countText');
let selectedFiles = [];

function log(t){ statusEl.textContent = t; }

document.getElementById('mediaInput').addEventListener('change', () => {
  const files = [...document.getElementById('mediaInput').files];
  if(!files.length) return;
  selectedFiles.push(...files);
  document.getElementById('mediaInput').value = '';
  refreshList();
  log(files.length + ' contenu(s) ajouté(s) automatiquement ✅');
});

document.getElementById('clearMediaBtn').addEventListener('click', () => {
  selectedFiles = [];
  refreshList();
  log('Sélection vidée.');
});

document.getElementById('audioInput').addEventListener('change', () => {
  const file = document.getElementById('audioInput').files[0];
  const audioText = document.getElementById('audioText');
  if(file){
    audioText.textContent = 'Audio ajouté : ' + file.name;
    log('Audio ajouté ✅');
  } else {
    audioText.textContent = 'Aucun audio ajouté.';
  }
});

function refreshList(){
  mediaList.innerHTML = '';
  selectedFiles.forEach((file, i) => {
    const wrap = document.createElement('div');
    const url = URL.createObjectURL(file);
    const el = file.type.startsWith('video/') ? document.createElement('video') : document.createElement('img');
    el.className = 'thumb';
    el.src = url;
    if(el.tagName === 'VIDEO'){ el.muted = true; el.playsInline = true; }
    el.title = file.name;
    el.onclick = () => {
      selectedFiles.splice(i, 1);
      refreshList();
    };
    wrap.appendChild(el);
    mediaList.appendChild(wrap);
  });
  countText.textContent = selectedFiles.length ? selectedFiles.length + ' contenu(s) ajouté(s). Tape une miniature pour la supprimer.' : 'Aucun contenu ajouté.';
}

function loadAsset(file){
  return new Promise((resolve)=>{
    const url = URL.createObjectURL(file);
    if(file.type.startsWith('image/')){
      const img = new Image();
      img.onload = () => resolve({type:'image', el:img, url, file});
      img.onerror = () => resolve(null);
      img.src = url;
    } else if(file.type.startsWith('video/')){
      const vid = document.createElement('video');
      vid.src = url; vid.muted = true; vid.playsInline = true; vid.loop = true;
      vid.onloadedmetadata = () => resolve({type:'video', el:vid, url, file});
      vid.onerror = () => resolve(null);
    } else resolve(null);
  });
}

function drawCover(el, scale=1, rotate=0, offsetX=0, offsetY=0, alpha=1){
  const iw = el.videoWidth || el.naturalWidth || el.width;
  const ih = el.videoHeight || el.naturalHeight || el.height;
  if(!iw || !ih) return;
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(canvas.width/2 + offsetX, canvas.height/2 + offsetY);
  ctx.rotate(rotate);
  ctx.scale(scale, scale);
  const r = Math.max(canvas.width/iw, canvas.height/ih);
  const w = iw*r, h = ih*r;
  ctx.drawImage(el, -w/2, -h/2, w, h);
  ctx.restore();
}

function overlay(style, beatPower, t){
  let grad = ctx.createLinearGradient(0,0,canvas.width,canvas.height);
  const colors = {
    luxury:['rgba(255,210,120,.18)','rgba(0,0,0,.32)'],
    viral:['rgba(124,92,255,.28)','rgba(255,61,129,.24)'],
    sport:['rgba(0,255,180,.22)','rgba(0,0,0,.40)'],
    travel:['rgba(0,212,255,.20)','rgba(255,160,80,.20)']
  };
  grad.addColorStop(0, colors[style][0]);
  grad.addColorStop(1, colors[style][1]);
  ctx.fillStyle = grad; ctx.fillRect(0,0,canvas.width,canvas.height);

  if(beatPower > .45){
    ctx.fillStyle = 'rgba(255,255,255,' + Math.min(.35, beatPower*.35) + ')';
    ctx.fillRect(0,0,canvas.width,canvas.height);
  }

  // animated beat bars
  ctx.save();
  ctx.globalAlpha = .55;
  for(let i=0;i<12;i++){
    const h = 80 + Math.sin(t*6+i)*40 + beatPower*180;
    ctx.fillStyle = 'rgba(255,255,255,.22)';
    ctx.fillRect(60+i*82, canvas.height-180-h, 28, h);
  }
  ctx.restore();

  ctx.font = '900 92px -apple-system, BlinkMacSystemFont, Arial';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,.75)';
  ctx.shadowBlur = 22;
  ctx.fillStyle = 'white';
  ctx.fillText(style.toUpperCase() + ' REEL', canvas.width/2, 1580 + Math.sin(t*4)*8);
  ctx.font = '700 42px -apple-system, BlinkMacSystemFont, Arial';
  ctx.fillText('Beat Sync • Effects • 9:16', canvas.width/2, 1660);
  ctx.shadowBlur = 0;
}

async function prepareAudioAnalysis(audioFile){
  audio.src = URL.createObjectURL(audioFile);
  audio.currentTime = 0;

  // WebAudio analyser: real-time beat energy detection
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if(!AudioContext) return null;

  const audioCtx = new AudioContext();
  const src = audioCtx.createMediaElementSource(audio);
  const analyser = audioCtx.createAnalyser();
  analyser.fftSize = 1024;
  analyser.smoothingTimeConstant = .72;
  src.connect(analyser);
  analyser.connect(audioCtx.destination);

  return { audioCtx, analyser, data: new Uint8Array(analyser.frequencyBinCount), history: [], lastBeat: 0 };
}

function getBeatPower(analysis, nowSec){
  if(!analysis) return (Math.sin(nowSec*13) > .86) ? .8 : 0;
  analysis.analyser.getByteFrequencyData(analysis.data);
  let bass = 0;
  const bassBins = Math.max(8, Math.floor(analysis.data.length * .12));
  for(let i=0;i<bassBins;i++) bass += analysis.data[i];
  bass = bass / bassBins / 255;

  analysis.history.push(bass);
  if(analysis.history.length > 40) analysis.history.shift();
  const avg = analysis.history.reduce((a,b)=>a+b,0) / analysis.history.length;
  const spike = bass - avg;
  const isBeat = spike > .09 && bass > .28 && (nowSec - analysis.lastBeat) > .18;
  if(isBeat) analysis.lastBeat = nowSec;
  return isBeat ? Math.min(1, .45 + spike*4) : Math.max(0, spike*1.8);
}

function transitionDraw(type, asset, nextAsset, local, style, beatPower, baseScale, rot, ox, oy){
  const edge = .14;
  if(!nextAsset || local < 1-edge){
    drawCover(asset.el, baseScale, rot, ox, oy);
    return;
  }
  const p = (local - (1-edge)) / edge;
  if(type === 'auto') type = style === 'luxury' || style === 'travel' ? 'slide' : (style === 'viral' ? 'flash' : 'zoom');

  if(type === 'slide'){
    drawCover(asset.el, baseScale, rot, -p*canvas.width, oy, 1);
    drawCover(nextAsset.el, baseScale, rot, canvas.width*(1-p), oy, 1);
  } else if(type === 'zoom'){
    drawCover(asset.el, baseScale + p*.5, rot, ox, oy, 1-p);
    drawCover(nextAsset.el, 1.35 - p*.25, 0, 0, 0, p);
  } else {
    drawCover(asset.el, baseScale, rot, ox, oy);
    ctx.fillStyle = 'rgba(255,255,255,' + p*.8 + ')';
    ctx.fillRect(0,0,canvas.width,canvas.height);
    if(p>.5) drawCover(nextAsset.el, 1 + (1-p)*.2, 0, 0, 0, (p-.5)*2);
  }
}

async function generate(){
  downloadLink.style.display='none';
  const audioFile = document.getElementById('audioInput').files[0];
  const style = document.getElementById('style').value;
  const intensity = Number(document.getElementById('intensity').value);
  const duration = Number(document.getElementById('duration').value);
  const transition = document.getElementById('transition').value;

  if(!selectedFiles.length){ log('Ajoute plusieurs photos/vidéos.'); return; }
  if(!audioFile){ log('Ajoute un fichier audio : MP3, M4A, AAC, WAV ou MP4.'); return; }
  if(!window.MediaRecorder){ log('Export vidéo non supporté sur ce navigateur.'); return; }

  generateBtn.disabled = true;
  log('Chargement des contenus…');
  const assets = (await Promise.all(selectedFiles.map(loadAsset))).filter(Boolean);
  if(!assets.length){ log('Médias incompatibles.'); generateBtn.disabled=false; return; }

  let analysis = null;
  try { analysis = await prepareAudioAnalysis(audioFile); } catch(e) { analysis = null; }

  const fps = 30;
  const canvasStream = canvas.captureStream(fps);
  let combined = canvasStream;
  try{
    const audioStream = audio.captureStream ? audio.captureStream() : (audio.mozCaptureStream ? audio.mozCaptureStream() : null);
    if(audioStream) combined = new MediaStream([...canvasStream.getVideoTracks(), ...audioStream.getAudioTracks()]);
  }catch(e){}

  let mime = '';
  if(MediaRecorder.isTypeSupported('video/mp4')) mime = 'video/mp4';
  else if(MediaRecorder.isTypeSupported('video/webm;codecs=vp9')) mime = 'video/webm;codecs=vp9';
  else mime = 'video/webm';

  const chunks = [];
  const recorder = new MediaRecorder(combined, {mimeType:mime});
  recorder.ondataavailable = e => { if(e.data.size) chunks.push(e.data); };
  recorder.onstop = () => {
    const blob = new Blob(chunks, {type:mime});
    const url = URL.createObjectURL(blob);
    downloadLink.href = url;
    downloadLink.download = mime.includes('mp4') ? 'reelsync-ai-v2.mp4' : 'reelsync-ai-v2.webm';
    downloadLink.style.display = 'block';
    log('✅ Reel généré. Télécharge-le puis poste-le sur Instagram/Facebook.');
    generateBtn.disabled = false;
    if(analysis && analysis.audioCtx) analysis.audioCtx.close();
  };

  log('Analyse audio en direct…\nDétection des pics/beat…\nEffets calés sur le rythme…');
  recorder.start();
  try {
    if(analysis && analysis.audioCtx.state === 'suspended') await analysis.audioCtx.resume();
    await audio.play();
  } catch(e){}

  const start = performance.now();
  const clipDur = Math.max(.65, duration / assets.length);

  async function frame(now){
    const t = (now-start)/1000;
    if(t >= duration){
      try{ recorder.stop(); }catch(e){}
      audio.pause();
      assets.forEach(a => { if(a.type === 'video') a.el.pause(); });
      return;
    }

    const beatPower = getBeatPower(analysis, t) * intensity;
    const clipIndex = Math.min(assets.length-1, Math.floor(t/clipDur));
    const nextIndex = Math.min(assets.length-1, clipIndex + 1);
    const local = (t % clipDur) / clipDur;
    const asset = assets[clipIndex];
    const nextAsset = nextIndex !== clipIndex ? assets[nextIndex] : null;

    ctx.fillStyle = '#000'; ctx.fillRect(0,0,canvas.width,canvas.height);

    for(const a of [asset,nextAsset].filter(Boolean)){
      if(a.type === 'video' && a.el.paused){
        try{ await a.el.play(); }catch(e){}
      }
    }

    let baseScale = 1 + local*.08 + beatPower*.12;
    let rot = 0, ox = 0, oy = 0;

    if(style === 'viral'){
      baseScale = 1 + local*.16 + beatPower*.25;
      rot = Math.sin(t*20)*beatPower*.035;
      ox = Math.sin(t*40)*beatPower*45;
      oy = Math.cos(t*35)*beatPower*32;
    }
    if(style === 'sport'){
      baseScale = 1.04 + local*.10 + beatPower*.18;
      rot = Math.sin(t*24)*beatPower*.025;
      ox = Math.sin(t*30)*beatPower*35;
    }
    if(style === 'luxury'){
      baseScale = 1.03 + Math.sin(local*Math.PI)*.05 + beatPower*.04;
      rot = Math.sin(t*.8)*.006;
    }
    if(style === 'travel'){
      baseScale = 1.05 + local*.07 + beatPower*.05;
      ox = Math.sin(local*Math.PI*2)*35;
    }

    transitionDraw(transition, asset, nextAsset, local, style, beatPower, baseScale, rot, ox, oy);

    if(local < .10 && clipIndex > 0){
      ctx.fillStyle = 'rgba(255,255,255,' + (0.28*(1-local/.10) + beatPower*.18) + ')';
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }

    overlay(style, Math.min(1, beatPower), t);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

generateBtn.addEventListener('click', generate);
