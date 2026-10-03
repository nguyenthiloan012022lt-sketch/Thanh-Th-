const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const menu = document.getElementById('menu');
const gameWrap = document.getElementById('gameWrap');
const loseOverlay = document.getElementById('loseOverlay');
const winOverlay = document.getElementById('winOverlay');
const music = document.getElementById('music');
const progressBar = document.getElementById('progressBar');
const levelText = document.getElementById('levelText');
const auraText = document.getElementById('auraText');

let selectedChar = 0;
let selectedLevel = 1;
let aura = Number(localStorage.getItem('soTaiBaKhiAura') || 0);
let running = false;
let raf = 0;
let last = 0;
let distance = 0;
let player, walls = [], nextWallAt = 0;
let charImg = new Image();
charImg.src = 'assets/characters.jpg';
let bgImg = new Image();
bgImg.src = 'assets/background.jpg';

auraText.textContent = `Bá khí: ${aura}`;

const LEVELS = Array.from({length:10},(_,i)=>({
  level:i+1,
  speed:190 + i*26,
  verticalSpeed:150 + i*8,
  gap:230 - i*11,
  spacing:360 - i*15,
  goal:2800 + i*420
}));

const levelBox = document.getElementById('levels');
LEVELS.forEach(({level})=>{
  const b=document.createElement('button');
  b.className='level-btn'+(level===1?' active':'');
  b.textContent=level;
  b.onclick=()=>{selectedLevel=level;document.querySelectorAll('.level-btn').forEach(x=>x.classList.remove('active'));b.classList.add('active');levelText.textContent=`Cấp ${level}`};
  levelBox.appendChild(b);
});

document.querySelectorAll('.char-btn').forEach(btn=>btn.addEventListener('click',()=>{
  selectedChar=Number(btn.dataset.char);
  document.querySelectorAll('.char-btn').forEach(x=>x.classList.remove('active'));
  btn.classList.add('active');
}));

function fitCanvas(){
  const dpr=Math.max(1,Math.min(2,devicePixelRatio||1));
  const r=gameWrap.getBoundingClientRect();
  canvas.width=Math.floor(r.width*dpr); canvas.height=Math.floor(r.height*dpr);
  ctx.setTransform(dpr,0,0,dpr,0,0);
  canvas._w=r.width; canvas._h=r.height;
}
window.addEventListener('resize',()=>{if(!gameWrap.classList.contains('hidden')) fitCanvas()});

function levelCfg(){return LEVELS[selectedLevel-1]}
function resetGame(){
  fitCanvas();
  const h=canvas._h;
  player={x:120,y:h/2,size:58,dir:-1};
  walls=[];distance=0;nextWallAt=260;
  progressBar.style.width='0%';
}

function startGame(){
  loseOverlay.classList.add('hidden');winOverlay.classList.add('hidden');menu.classList.add('hidden');gameWrap.classList.remove('hidden');
  resetGame();running=true;last=performance.now();
  music.currentTime=0; music.volume=.7; music.play().catch(()=>{});
  cancelAnimationFrame(raf);raf=requestAnimationFrame(loop);
}

function stopMusic(){music.pause()}
function toggleDir(){if(running) player.dir*=-1}
window.addEventListener('keydown',e=>{if(e.code==='Space'){e.preventDefault();toggleDir()}});
gameWrap.addEventListener('pointerdown',e=>{if(e.target.id!=='quitBtn'){e.preventDefault();toggleDir()}});

function addWall(){
  const cfg=levelCfg(), h=canvas._h;
  const margin=55;
  const gap=cfg.gap;
  const center=margin+gap/2+Math.random()*(h-2*margin-gap);
  walls.push({x:canvas._w+40,w:64,top:center-gap/2,bottom:center+gap/2,passed:false});
}

function update(dt){
  const cfg=levelCfg(), h=canvas._h;
  player.y += player.dir*cfg.verticalSpeed*dt;
  if(player.y-player.size/2<0 || player.y+player.size/2>h){lose();return}
  distance += cfg.speed*dt;
  if(distance>=nextWallAt){addWall();nextWallAt += cfg.spacing}
  for(const w of walls) w.x -= cfg.speed*dt;
  walls=walls.filter(w=>w.x+w.w>-30);
  const px=player.x, py=player.y, r=player.size*.36;
  for(const w of walls){
    const hitX=px+r>w.x && px-r<w.x+w.w;
    if(hitX && (py-r<w.top || py+r>w.bottom)){lose();return}
  }
  const p=Math.min(100,distance/cfg.goal*100);progressBar.style.width=p+'%';
  if(distance>=cfg.goal) win();
}

function drawBackground(){
  const w=canvas._w,h=canvas._h;
  if(bgImg.complete){
    const s=Math.max(w/bgImg.width,h/bgImg.height),dw=bgImg.width*s,dh=bgImg.height*s;
    ctx.drawImage(bgImg,(w-dw)/2,(h-dh)/2,dw,dh);
    ctx.fillStyle='rgba(0,0,0,.12)';ctx.fillRect(0,0,w,h);
  } else {ctx.fillStyle='#000';ctx.fillRect(0,0,w,h)}
}
function drawWalls(){
  const h=canvas._h;
  for(const w of walls){
    ctx.save();
    ctx.fillStyle='rgba(8,8,20,.93)';ctx.strokeStyle='#fff';ctx.lineWidth=3;ctx.shadowColor='#fff';ctx.shadowBlur=14;
    ctx.fillRect(w.x,0,w.w,w.top);ctx.strokeRect(w.x,0,w.w,w.top);
    ctx.fillRect(w.x,w.bottom,w.w,h-w.bottom);ctx.strokeRect(w.x,w.bottom,w.w,h-w.bottom);
    // small spikes toward the gap
    ctx.beginPath();ctx.moveTo(w.x,w.top);ctx.lineTo(w.x+w.w/2,w.top+22);ctx.lineTo(w.x+w.w,w.top);ctx.closePath();ctx.fillStyle='#fff';ctx.fill();
    ctx.beginPath();ctx.moveTo(w.x,w.bottom);ctx.lineTo(w.x+w.w/2,w.bottom-22);ctx.lineTo(w.x+w.w,w.bottom);ctx.closePath();ctx.fill();
    ctx.restore();
  }
}
function drawPlayer(){
  const s=player.size, x=player.x-s/2,y=player.y-s/2;
  // crop rectangles from the original uploaded character sheet; source image is not edited.
  const crops=[
    [0,40,560,660],
    [560,40,592,660],
    [0,700,560,720],
    [560,720,592,650]
  ];
  const c=crops[selectedChar];
  ctx.save();
  ctx.shadowColor='#fff';ctx.shadowBlur=12;
  ctx.drawImage(charImg,c[0],c[1],c[2],c[3],x,y,s,s);
  ctx.restore();
}
function drawFinish(){
  const cfg=levelCfg();
  if(cfg.goal-distance<canvas._w){
    const x=canvas._w-(cfg.goal-distance);
    ctx.save();ctx.strokeStyle='#fff';ctx.lineWidth=5;ctx.setLineDash([12,10]);ctx.shadowColor='#fff';ctx.shadowBlur=12;ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,canvas._h);ctx.stroke();ctx.restore();
  }
}
function draw(){drawBackground();drawWalls();drawFinish();drawPlayer()}
function loop(t){
  if(!running)return;
  const dt=Math.min(.03,(t-last)/1000);last=t;update(dt);draw();
  if(running)raf=requestAnimationFrame(loop);
}

function lose(){
  if(!running)return;running=false;cancelAnimationFrame(raf);stopMusic();loseOverlay.classList.remove('hidden');
  playFailSound();
}
function win(){
  if(!running)return;running=false;cancelAnimationFrame(raf);stopMusic();
  aura++;localStorage.setItem('soTaiBaKhiAura',aura);auraText.textContent=`Bá khí: ${aura}`;
  winOverlay.classList.remove('hidden');playWinSound();startFireworks();
  document.getElementById('nextBtn').textContent=selectedLevel<10?'CẤP TIẾP THEO':'CHƠI LẠI CẤP 10';
}

function beep(freq,start,dur,gain=.06){
  const ac = beep.ac || (beep.ac=new (window.AudioContext||window.webkitAudioContext)());
  const o=ac.createOscillator(),g=ac.createGain();o.frequency.value=freq;g.gain.value=gain;o.connect(g);g.connect(ac.destination);o.start(ac.currentTime+start);o.stop(ac.currentTime+start+dur);
}
function playWinSound(){[523,659,784,1047].forEach((f,i)=>beep(f,i*.13,.22,.07))}
function playFailSound(){beep(180,0,.18,.05);beep(120,.16,.25,.04)}

// Fireworks
const fcanvas=document.getElementById('fireworksCanvas'),fctx=fcanvas.getContext('2d');let particles=[],fireRaf=0,fireUntil=0;
function fitFire(){const dpr=Math.max(1,devicePixelRatio||1);fcanvas.width=innerWidth*dpr;fcanvas.height=innerHeight*dpr;fctx.setTransform(dpr,0,0,dpr,0,0);fcanvas._w=innerWidth;fcanvas._h=innerHeight}
function burst(){const x=Math.random()*fcanvas._w,y=80+Math.random()*fcanvas._h*.55;for(let i=0;i<55;i++){const a=Math.random()*Math.PI*2,sp=60+Math.random()*220;particles.push({x,y,vx:Math.cos(a)*sp,vy:Math.sin(a)*sp,life:1,h:Math.random()*360})}}
function startFireworks(){fitFire();particles=[];fireUntil=performance.now()+5000;burst();cancelAnimationFrame(fireRaf);fireRaf=requestAnimationFrame(fireLoop)}
function fireLoop(t){fctx.clearRect(0,0,fcanvas._w,fcanvas._h);if(Math.random()<.08&&t<fireUntil)burst();const dt=.016;for(const p of particles){p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=85*dt;p.life-=.014;fctx.fillStyle=`hsla(${p.h},100%,70%,${Math.max(0,p.life)})`;fctx.beginPath();fctx.arc(p.x,p.y,3,0,Math.PI*2);fctx.fill()}particles=particles.filter(p=>p.life>0);if(t<fireUntil||particles.length)fireRaf=requestAnimationFrame(fireLoop)}
window.addEventListener('resize',()=>{if(!winOverlay.classList.contains('hidden'))fitFire()});

function backToMenu(){running=false;cancelAnimationFrame(raf);stopMusic();loseOverlay.classList.add('hidden');winOverlay.classList.add('hidden');gameWrap.classList.add('hidden');menu.classList.remove('hidden')}

document.getElementById('startBtn').onclick=startGame;
document.getElementById('retryBtn').onclick=startGame;
document.getElementById('quitBtn').onclick=backToMenu;
document.getElementById('menuBtn1').onclick=backToMenu;
document.getElementById('menuBtn2').onclick=backToMenu;
document.getElementById('nextBtn').onclick=()=>{if(selectedLevel<10){selectedLevel++;document.querySelectorAll('.level-btn').forEach((b,i)=>b.classList.toggle('active',i===selectedLevel-1));levelText.textContent=`Cấp ${selectedLevel}`}startGame()};
