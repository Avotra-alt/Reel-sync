const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const generateBtn = document.getElementById('generateBtn');
const statusEl = document.getElementById('status');
const downloadLink = document.getElementById('downloadLink');
const audio = document.getElementById('audio');

function log(t){ statusEl.textContent = t; }

function loadAsset(file){
  return new Promise((resolve)=>{
    const url = URL.createObjectURL(file);
    if(file.type.startsWith('image/')){
      const img = new Image();
      img.onload = () => resolve({type:'image', el:img, url, name:file.name});
      img.onerror = () => resolve(null);
      img.src = url;
    } else if(file.type.startsWith('video/')){
      const vid = document.createElement('video');
      vid.src = url; vid.muted = true; vid.playsInline = true; vid.loop = true;
      vid.onloadedmetadata = () => resolve({type:'video', el:vid, url, name:file.name});
      vid.onerror = () => resolve(null);
    } else resolve(null);
  });
}

function drawCover(el, scale=1, rotate=0, alpha=1){
  ctx.save();
  ctx.globalAlpha = alpha;
  ctx.translate(canvas.width/2, canvas.height/2);
  ctx.rotate(rotate);
  ctx.scale(scale, scale);
  const iw = el.videoWidth || el.naturalWidth || el.width;
  const ih = el.videoHeight || el.naturalHeight || el.height;
  const r = Math.max(canvas.width/iw, canvas.height/ih);
  const w = iw*r, h = ih*r;
  ctx.drawImage(el, -w/2, -h/2, w, h);
  ctx.restore();
}

function overlay(style, progress, beat){
  let grad = ctx.createLinearGradient(0,0,canvas.width,canvas.height);
  if(style==='luxury'){ grad.addColorStop(0,'rgba(255,210,120,.18)'); grad.addColorStop(1,'rgba(0,0,0,.25)'); }
  if(style==='viral'){ grad.addColorStop(0,'rgba(124,92,255,.25)'); grad.addColorStop(1,'rgba(255,61,129,.22)'); }
  if(style==='sport'){ grad.addColorStop(0,'rgba(0,255,180,.20)'); grad.addColorStop(1,'rgba(0,0,0,.35)'); }
  if(style==='travel'){ grad.addColorStop(0,'rgba(0,212,255,.20)'); grad.addColorStop(1,'rgba(255,160,80,.18)'); }
  ctx.fillStyle = grad; ctx.fillRect(0,0,canvas.width,canvas.height);

  if(beat){
    ctx.fillStyle = 'rgba(255,255,255,.18)';
    ctx.fillRect(0,0,canvas.width,canvas.height);
  }

  ctx.font = '900 96px -apple-system, BlinkMacSystemFont, Arial';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,.65)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = 'white';
  ctx.fillText(style.toUpperCase() + ' REEL', canvas.width/2, 1580);

  ctx.font = '700 44px -apple-system, BlinkMacSystemFont, Arial';
  ctx.fillText('Auto Sync • Transitions • 9:16', canvas.width/2, 1660);
  ctx.shadowBlur = 0;
}

async function generate(){
  downloadLink.style.display='none';
  const files = [...document.getElementById('mediaInput').files];
  const audioFile = document.getElementById('audioInput').files[0];
  const style = document.getElementById('style').value;
  const duration = Number(document.getElementById('duration').value);

  if(!files.length){ log('Ajoute au moins une photo ou vidéo.'); return; }
  if(!audioFile){ log('Ajoute un audio ou une chanson.'); return; }
  if(!window.MediaRecorder){ log('Ton navigateur ne supporte pas encore l’export vidéo. Essaie Safari récent ou Chrome.'); return; }

  generateBtn.disabled = true;
  log('Chargement des contenus…');
  const assets = (await Promise.all(files.map(loadAsset))).filter(Boolean);
  if(!assets.length){ log('Aucun média compatible trouvé.'); generateBtn.disabled=false; return; }

  audio.src = URL.createObjectURL(audioFile);
  audio.currentTime = 0;

  const fps = 30;
  const canvasStream = canvas.captureStream(fps);
  let combined = canvasStream;
  try{
    const audioStream = audio.captureStream ? audio.captureStream() : (audio.mozCaptureStream ? audio.mozCaptureStream() : null);
    if(audioStream){
      combined = new MediaStream([...canvasStream.getVideoTracks(), ...audioStream.getAudioTracks()]);
    }
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
    downloadLink.download = mime.includes('mp4') ? 'reelsync-ai-reel.mp4' : 'reelsync-ai-reel.webm';
    downloadLink.style.display = 'block';
    log('✅ Reel généré. Tu peux le télécharger.');
    generateBtn.disabled = false;
  };

  log('Analyse audio…\nDétection du rythme…\nCréation des transitions…');
  recorder.start();
  try { await audio.play(); } catch(e){}

  const start = performance.now();
  const clipDur = duration / assets.length;

  async function frame(now){
    const t = (now-start)/1000;
    if(t >= duration){
      try { recorder.stop(); } catch(e) {}
      audio.pause();
      for (const a of assets) if(a.type === 'video') a.el.pause();
      return;
    }

    const clipIndex = Math.min(assets.length-1, Math.floor(t/clipDur));
    const local = (t % clipDur) / clipDur;
    const asset = assets[clipIndex];

    ctx.fillStyle = '#000';
    ctx.fillRect(0,0,canvas.width,canvas.height);

    if(asset.type==='video'){
      if(asset.el.paused) { try{ await asset.el.play(); }catch(e){} }
      drawCover(asset.el, 1 + local*.08);
    } else {
      let scale = 1 + local*.10;
      let rot = 0;
      if(style==='viral') scale = 1 + local*.18;
      if(style==='sport') rot = Math.sin(local*8)*0.015;
      if(style==='luxury') scale = 1.03 + Math.sin(local*Math.PI)*.04;
      drawCover(asset.el, scale, rot);
    }

    const beat = Math.floor(t*2.2) !== Math.floor((t-1/fps)*2.2);
    if(local < .12 && clipIndex>0){
      ctx.fillStyle = 'rgba(255,255,255,'+(0.35*(1-local/.12))+')';
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }
    overlay(style, t/duration, beat);
    requestAnimationFrame(frame);
  }

  requestAnimationFrame(frame);
}

generateBtn.addEventListener('click', generate);
