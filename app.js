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

function refreshList(){
  mediaList.innerHTML = '';
  selectedFiles.forEach((item) => {
    const url = URL.createObjectURL(item.file);
    const el = item.file.type.startsWith('video/') ? document.createElement('video') : document.createElement('img');
    el.className = 'thumb';
    el.src = url;
    if(el.tagName === 'VIDEO'){ el.muted = true; el.playsInline = true; }
    mediaList.appendChild(el);
  });
  countText.textContent = selectedFiles.length ? selectedFiles.length + ' contenu(s) ajouté(s).' : 'Aucun contenu ajouté.';
}

document.getElementById('addImageBtn').addEventListener('click', () => {
  const file = document.getElementById('imageInput').files[0];
  if(!file){ log('Choisis d’abord une photo.'); return; }
  selectedFiles.push({file});
  document.getElementById('imageInput').value = '';
  refreshList();
  log('Photo ajoutée ✅');
});

document.getElementById('addVideoBtn').addEventListener('click', () => {
  const file = document.getElementById('videoInput').files[0];
  if(!file){ log('Choisis d’abord une vidéo.'); return; }
  selectedFiles.push({file});
  document.getElementById('videoInput').value = '';
  refreshList();
  log('Vidéo ajoutée ✅');
});

function loadAsset(file){
  return new Promise((resolve)=>{
    const url = URL.createObjectURL(file);
    if(file.type.startsWith('image/')){
      const img = new Image();
      img.onload = () => resolve({type:'image', el:img, url});
      img.onerror = () => resolve(null);
      img.src = url;
    } else if(file.type.startsWith('video/')){
      const vid = document.createElement('video');
      vid.src = url; vid.muted = true; vid.playsInline = true; vid.loop = true;
      vid.onloadedmetadata = () => resolve({type:'video', el:vid, url});
      vid.onerror = () => resolve(null);
    } else resolve(null);
  });
}

function drawCover(el, scale=1, rotate=0){
  const iw = el.videoWidth || el.naturalWidth || el.width;
  const ih = el.videoHeight || el.naturalHeight || el.height;
  if(!iw || !ih) return;
  ctx.save();
  ctx.translate(canvas.width/2, canvas.height/2);
  ctx.rotate(rotate);
  ctx.scale(scale, scale);
  const r = Math.max(canvas.width/iw, canvas.height/ih);
  const w = iw*r, h = ih*r;
  ctx.drawImage(el, -w/2, -h/2, w, h);
  ctx.restore();
}

function overlay(style, beat){
  let grad = ctx.createLinearGradient(0,0,canvas.width,canvas.height);
  const colors = {
    luxury:['rgba(255,210,120,.18)','rgba(0,0,0,.25)'],
    viral:['rgba(124,92,255,.25)','rgba(255,61,129,.22)'],
    sport:['rgba(0,255,180,.20)','rgba(0,0,0,.35)'],
    travel:['rgba(0,212,255,.20)','rgba(255,160,80,.18)']
  };
  grad.addColorStop(0, colors[style][0]);
  grad.addColorStop(1, colors[style][1]);
  ctx.fillStyle = grad; ctx.fillRect(0,0,canvas.width,canvas.height);
  if(beat){ ctx.fillStyle='rgba(255,255,255,.18)'; ctx.fillRect(0,0,canvas.width,canvas.height); }

  ctx.font = '900 92px -apple-system, BlinkMacSystemFont, Arial';
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,.7)';
  ctx.shadowBlur = 20;
  ctx.fillStyle = 'white';
  ctx.fillText(style.toUpperCase() + ' REEL', canvas.width/2, 1580);
  ctx.font = '700 42px -apple-system, BlinkMacSystemFont, Arial';
  ctx.fillText('ReelSync AI • 9:16', canvas.width/2, 1660);
  ctx.shadowBlur = 0;
}

async function generate(){
  downloadLink.style.display='none';
  const audioFile = document.getElementById('audioInput').files[0];
  const style = document.getElementById('style').value;
  const duration = Number(document.getElementById('duration').value);

  if(!selectedFiles.length){ log('Ajoute au moins une photo ou vidéo.'); return; }
  if(!audioFile){ log('Ajoute un audio.'); return; }
  if(!window.MediaRecorder){ log('Export vidéo non supporté sur ce navigateur.'); return; }

  generateBtn.disabled = true;
  log('Chargement des médias…');
  const assets = (await Promise.all(selectedFiles.map(x => loadAsset(x.file)))).filter(Boolean);
  if(!assets.length){ log('Médias incompatibles.'); generateBtn.disabled=false; return; }

  audio.src = URL.createObjectURL(audioFile);
  audio.currentTime = 0;

  const fps = 30;
  const canvasStream = canvas.captureStream(fps);
  let combined = canvasStream;
  try{
    const audioStream = audio.captureStream ? audio.captureStream() : null;
    if(audioStream) combined = new MediaStream([...canvasStream.getVideoTracks(), ...audioStream.getAudioTracks()]);
  }catch(e){}

  let mime = MediaRecorder.isTypeSupported('video/mp4') ? 'video/mp4' : 'video/webm';
  const chunks = [];
  const recorder = new MediaRecorder(combined, {mimeType:mime});
  recorder.ondataavailable = e => { if(e.data.size) chunks.push(e.data); };
  recorder.onstop = () => {
    const blob = new Blob(chunks, {type:mime});
    const url = URL.createObjectURL(blob);
    downloadLink.href = url;
    downloadLink.download = mime.includes('mp4') ? 'reelsync-ai.mp4' : 'reelsync-ai.webm';
    downloadLink.style.display = 'block';
    log('✅ Reel généré. Clique sur Télécharger.');
    generateBtn.disabled = false;
  };

  log('Création du Reel…\nAjout transitions…\nSynchronisation simulée…');
  recorder.start();
  try { await audio.play(); } catch(e){}

  const start = performance.now();
  const clipDur = duration / assets.length;

  async function frame(now){
    const t = (now-start)/1000;
    if(t >= duration){
      try{ recorder.stop(); }catch(e){}
      audio.pause();
      assets.forEach(a => { if(a.type === 'video') a.el.pause(); });
      return;
    }
    const clipIndex = Math.min(assets.length-1, Math.floor(t/clipDur));
    const local = (t % clipDur) / clipDur;
    const asset = assets[clipIndex];

    ctx.fillStyle = '#000'; ctx.fillRect(0,0,canvas.width,canvas.height);

    if(asset.type === 'video'){
      if(asset.el.paused){ try{ await asset.el.play(); }catch(e){} }
      drawCover(asset.el, 1 + local*.08, 0);
    } else {
      let scale = 1 + local*.12;
      let rot = style === 'sport' ? Math.sin(local*8)*0.015 : 0;
      if(style === 'viral') scale = 1 + local*.18;
      if(style === 'luxury') scale = 1.03 + Math.sin(local*Math.PI)*.04;
      drawCover(asset.el, scale, rot);
    }

    const beat = Math.floor(t*2.2) !== Math.floor((t-1/fps)*2.2);
    if(local < .12 && clipIndex > 0){
      ctx.fillStyle = 'rgba(255,255,255,' + (0.35*(1-local/.12)) + ')';
      ctx.fillRect(0,0,canvas.width,canvas.height);
    }
    overlay(style, beat);
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);
}

generateBtn.addEventListener('click', generate);
