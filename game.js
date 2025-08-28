/* Maze Quest: Pixel Treasure — Shadow Edition
   - Shadow Mode (FOW) default ON, toggleable
   - Story (3 mazes) + Daily (seeded generator)
   - Minimap toggle (respects FOW)
   - Pixel scroll + wax seal
   - Timer + best times (Story + Daily)
   - SFX + mute, CRT, D-pad, sprint
   - Fully static, deploy-ready
*/

(() => {
  // Canvas
  const canvas = document.getElementById('game');
  const ctx = canvas.getContext('2d', { alpha: false });
  ctx.imageSmoothingEnabled = false;

  // HUD/UI refs
  const hudMazeStatus = document.getElementById('mazeStatus');
  const hudPlayerLabel = document.getElementById('playerLabel');
  const hudTimer = document.getElementById('timer');

  const overlayStart = document.getElementById('overlay-start');
  const overlayComplete = document.getElementById('overlay-complete');
  const overlayWin = document.getElementById('overlay-win');

  const playerNameInput = document.getElementById('player-name');
  const maleCanvas = document.getElementById('male-canvas');
  const femaleCanvas = document.getElementById('female-canvas');
  const btnPickMale = document.getElementById('pick-male');
  const btnPickFemale = document.getElementById('pick-female');

  const btnStart = document.getElementById('btn-start');
  const btnDaily = document.getElementById('btn-daily');
  const btnContinue = document.getElementById('btn-continue');
  const btnReset = document.getElementById('btn-reset');

  const fragmentText = document.getElementById('fragment-text');
  const levelTimeLabel = document.getElementById('level-time');
  const modeLabel = document.getElementById('mode-label');
  const btnNext = document.getElementById('btn-next');

  const finalMessageBox = document.getElementById('final-message');
  const btnRestart = document.getElementById('btn-restart');

  const btnMute = document.getElementById('btn-mute');
  const btnCRT = document.getElementById('btn-crt');
  const btnMap = document.getElementById('btn-map');
  const btnShadow = document.getElementById('btn-shadow');

  // Scroll refs
  const scrollEl = document.getElementById('scroll');
  const scrollPaper = document.getElementById('scroll-paper');
  const bottomRodEl = document.getElementById('scroll-rod-bottom');
  const waxGlyph = document.getElementById('wax-glyph');

  // Touch controls
  const touchControls = document.getElementById('touch-controls');

  // Confetti
  const confettiCanvas = document.getElementById('confetti');
  let confettiCtx, confettiRAF = 0, confettiParticles = [];

  // Constants
  const TILE = 32, COLS = 21, ROWS = 15;
  const WIDTH = TILE * COLS, HEIGHT = TILE * ROWS;
  const MOVE_DELAY = 110, FAST_MOVE_DELAY = 70;
  const STORAGE_KEY = 'mazeQuestShadow_v1';

  // Game state
  let state = 'start';         // 'start' | 'playing' | 'complete' | 'win'
  let MODE = 'story';          // 'story' | 'daily'
  let playerName = '';
  let selectedHero = null;     // 'male' | 'female'
  let levelIndex = 0;          // 0..(activeLevels.length-1)
  let fragmentsEarned = [];
  let completed = false;

  // Timer
  let levelStartTime = 0;
  let currentTimeMs = 0;
  let bestTimes = [null, null, null]; // story
  let bestDaily = null;                // daily best

  // Player
  const player = { col: 1, row: 1, lastMove: 0 };
  let sprinting = false;

  // Level/map
  let levelMap = null;
  let startPos = { col: 1, row: 1 };
  let chestPos = { col: COLS - 2, row: ROWS - 2 };
  let activeLevels = [];

  // Shadow/FOW + Minimap
  let shadowOn = true; // default ON
  let seen = [];       // discovered tiles
  let minimapOn = false;

  // Fragments (your custom fragments)
  const FRAGMENTS = [
    'Curious minds. Search for something, look into you. Just keep moving forward.',
    'Brave the maze. Almost there.',
    'You are the pride. Conquer it.'
  ];

  // Custom final message (supports {name})
  const FINAL_MESSAGE = "Happy Birthday Ate {name}! Keep exploring! You are our pride and joy.";

  // Story levels
  const STORY_LEVELS = [
    [
      "#####################",
      "#S....#.......#.....#",
      "###.#.#.#####.#.###.#",
      "#...#...#...#...#...#",
      "#.#####.#.#.#####.#.#",
      "#.....#.#.#.....#.#.#",
      "#####.#.#.#####.#.#.#",
      "#.....#...#...#.#...#",
      "#.#########.#.#.###.#",
      "#...#.....#.#.#...#.#",
      "###.#.###.#.#.###.#.#",
      "#...#.#...#.#...#.#.#",
      "#.###.#.###.###.#.#.#",
      "#.....#.....#...#..T#",
      "#####################"
    ],
    [
      "#####################",
      "#S..#.......#...#...#",
      "#.#.#.#####.#.#.#.#.#",
      "#.#...#...#...#...#.#",
      "#.#####.#.#########.#",
      "#.....#.#.....#.....#",
      "#####.#.#####.#.###.#",
      "#...#.#...#...#.#...#",
      "#.#.#.###.#.###.#.###",
      "#.#.#.#...#...#.#...#",
      "#.#.#.#.#####.#.###.#",
      "#...#...#...#...#...#",
      "###.#####.#.#####.#.#",
      "#.....#...#.....#..T#",
      "#####################"
    ],
    [
      "#####################",
      "#S....#.....#.......#",
      "###.###.###.#.#####.#",
      "#...#...#...#.....#.#",
      "#.#.#.###.#######.#.#",
      "#.#.#...#.....#...#.#",
      "#.#.###.#####.#.###.#",
      "#.#...#.....#.#...#.#",
      "#.###.#####.#.###.#.#",
      "#...#.....#.#...#.#.#",
      "###.#####.#.###.#.#.#",
      "#...#...#.#...#.#...#",
      "#.###.#.#.###.#.###.#",
      "#.....#.#.....#....T#",
      "#####################"
    ]
  ];

  // Colors/palette
  const COLORS = {
    floor: '#0b1020', wall: '#1b2a42', wallLight: '#2a4066', wallDark: '#0e1a2e',
    chestDark: '#7e4a1e', chest: '#b06e2e', chestLight: '#d99c4a', gold: '#f9d34a', text: '#e6f0ff'
  };

  // Audio (retro beeps)
  let audioCtx = null, masterGain = null, muted = false, audioReady = false, moveCount = 0;
  function initAudio() {
    if (audioReady) return;
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      audioCtx = new Ctx();
      masterGain = audioCtx.createGain();
      masterGain.gain.value = muted ? 0 : 0.3;
      masterGain.connect(audioCtx.destination);
      audioReady = true;
    } catch {}
  }
  function resumeAudio() { initAudio(); if (audioCtx && audioCtx.state === 'suspended') audioCtx.resume(); }
  function setMuted(m) { muted = m; if (masterGain) masterGain.gain.value = muted ? 0 : 0.3; btnMute.textContent = muted ? '🔇' : '🔊'; btnMute.setAttribute('aria-pressed', String(muted)); saveProgress(); }
  function beep(freq=440, dur=0.08, type='square', vol=0.05, t0=0) {
    if (!audioReady || muted) return;
    const now = audioCtx.currentTime + t0;
    const osc = audioCtx.createOscillator(), g = audioCtx.createGain();
    osc.type = type; osc.frequency.setValueAtTime(freq, now);
    g.gain.setValueAtTime(vol, now); g.gain.exponentialRampToValueAtTime(0.0001, now + dur);
    osc.connect(g).connect(masterGain); osc.start(now); osc.stop(now + dur + 0.02);
  }
  function sfx(name) {
    resumeAudio(); if (muted) return;
    switch(name) {
      case 'move': moveCount=(moveCount+1)%3; if (moveCount===0) beep(320,0.04,'square',0.035); break;
      case 'chest': beep(660,0.07,'square',0.05,0.00); beep(880,0.08,'square',0.05,0.08); beep(1320,0.12,'square',0.05,0.18); break;
      case 'seal': beep(1200,0.05,'square',0.06); beep(900,0.05,'square',0.05,0.05); break;
      case 'win':  beep(523,0.12,'square',0.06,0.00); beep(659,0.12,'square',0.06,0.12); beep(784,0.18,'square',0.07,0.24); break;
      case 'click': beep(300,0.03,'square',0.04); break;
      case 'toggle': beep(500,0.04,'square',0.04); break;
    }
  }

  // === Happy Birthday melody (8-bit) ===
  const NOTE = {
    C4:261.63, Cs4:277.18, D4:293.66, Ds4:311.13, E4:329.63, F4:349.23, Fs4:369.99,
    G4:392.00, Gs4:415.30, A4:440.00, As4:466.16, B4:493.88,
    C5:523.25, D5:587.33, E5:659.25, F5:698.46, G5:783.99, A5:880.00, B5:987.77
  };
  function playHappyBirthday(volume = 0.6, tempo = 1, startDelay = 0.35) {
    resumeAudio();
    if (muted) return;
    const n = NOTE;
    // [frequency, duration, gap]
    const pattern = [
      [n.G4,0.24,0.03],[n.G4,0.18,0.03],[n.A4,0.32,0.03],[n.G4,0.32,0.03],[n.C5,0.32,0.03],[n.B4,0.52,0.12],
      [n.G4,0.24,0.03],[n.G4,0.18,0.03],[n.A4,0.32,0.03],[n.G4,0.32,0.03],[n.D5,0.32,0.03],[n.C5,0.52,0.12],
      [n.G4,0.24,0.03],[n.G4,0.18,0.03],[n.E5,0.32,0.03],[n.C5,0.32,0.03],[n.B4,0.32,0.03],[n.A4,0.60,0.14],
      [n.F5,0.24,0.03],[n.F5,0.18,0.03],[n.E5,0.32,0.03],[n.C5,0.32,0.03],[n.D5,0.32,0.03],[n.C5,0.70,0.00],
    ];
    let t = startDelay;
    for (const [freq, dur, gap] of pattern) {
      beep(freq, dur * tempo, 'square', volume, t);
      t += (dur + (gap || 0)) * tempo;
    }
  }

  // Storage
  function saveProgress() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({
        playerName, character: selectedHero, levelIndex, fragments: fragmentsEarned,
        completed, bestTimes, bestDaily,
        settings: { muted, crt: document.body.classList.contains('crt'), minimap: minimapOn, shadowOn },
        ts: Date.now()
      }));
    } catch {}
  }
  function loadProgress() {
    try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : null; } catch { return null; }
  }
  function resetProgress(keepName=true) {
    const keep = keepName ? playerName : '';
    try { localStorage.removeItem(STORAGE_KEY); } catch {}
    playerName = keep; selectedHero = null; levelIndex = 0; fragmentsEarned = []; completed = false;
    bestTimes = [null, null, null]; bestDaily = null;
  }

  // Seeded PRNG + Maze generator (Daily)
  function xmur3(str) { let h=1779033703^str.length; for (let i=0;i<str.length;i++){h=Math.imul(h^str.charCodeAt(i),3432918353); h=(h<<13)|(h>>>19);} return function(){h=Math.imul(h^(h>>>16),2246822507); h=Math.imul(h^(h>>>13),3266489909); return (h^=h>>>16)>>>0}; }
  function sfc32(a,b,c,d){return function(){a>>>=0;b>>>=0;c>>>=0;d>>>=0;let t=(a+b)|0;a=b^(b>>>9);b=(c+(c<<3))|0;c=(c<<21)|(c>>>11);d=(d+1)|0;t=(t+d)|0;c=(c+t)|0;return (t>>>0)/4294967296}}
  function rngFrom(seedStr){const s=xmur3(seedStr);return sfc32(s(),s(),s(),s());}

  function generateMaze(seedStr) {
    const rng = rngFrom(seedStr);
    const w=COLS,h=ROWS; const grid=Array.from({length:h},()=>Array.from({length:w},()=> '#'));
    function shuffle(arr){for(let i=arr.length-1;i>0;i--){const j=Math.floor(rng()*(i+1));[arr[i],arr[j]]=[arr[j],arr[i]];}return arr;}
    function carve(x,y){ grid[y][x]='.'; for(const [dx,dy] of shuffle([[2,0],[-2,0],[0,2],[0,-2]])){ const nx=x+dx,ny=y+dy; if(ny<=0||ny>=h-1||nx<=0||nx>=w-1) continue; if(grid[ny][nx]==='#'){ grid[y+dy/2][x+dx/2]='.'; carve(nx,ny);} } }
    carve(1,1);
    // farthest cell
    const q=[[1,1,0]], visited=Array.from({length:h},()=>Array(w).fill(false)); visited[1][1]=true; let far={x:1,y:1,d:0};
    while(q.length){const [x,y,d]=q.shift(); if(d>far.d) far={x,y,d};
      for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=x+dx,ny=y+dy; if(nx<0||ny<0||nx>=w||ny>=h) continue; if(!visited[ny][nx]&&grid[ny][nx]==='.') {visited[ny][nx]=true;q.push([nx,ny,d+1]);}}
    }
    grid[1][1]='S'; grid[far.y][far.x]='T';
    return grid.map(r=>r.join(''));
  }
  function dailyRows() {
    const d=new Date();
    const seed = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}-MQDailySeed`;
    return generateMaze(seed);
  }

  // Helpers
  function findChar(map, ch) {
    for (let r=0;r<map.length;r++){const c=map[r].indexOf(ch); if(c!==-1) return {row:r,col:c};}
    return null;
  }

  function setActiveStory() { MODE='story'; activeLevels = STORY_LEVELS; levelIndex = 0; modeLabel.textContent = 'Mode: Story'; }
  function setActiveDaily() { MODE='daily'; activeLevels = [dailyRows()]; levelIndex = 0; modeLabel.textContent = 'Mode: Daily'; }

  function loadLevel(idx) {
    levelMap = activeLevels[idx].map(row=>row.split(''));
    startPos = findChar(levelMap, 'S') || {col:1,row:1};
    chestPos = findChar(levelMap, 'T') || {col:COLS-2,row:ROWS-2};
    player.col = startPos.col; player.row = startPos.row; player.lastMove = 0;
    levelStartTime = performance.now(); currentTimeMs = 0;

    // FOW reset
    seen = Array.from({length:ROWS},()=>Array(COLS).fill(false)); revealAroundPlayer();

    if (MODE==='story') hudMazeStatus.textContent = `Maze ${idx+1} / ${activeLevels.length}`;
    else {
      const d=new Date(); const y=d.getFullYear(),m=String(d.getMonth()+1).padStart(2,'0'),da=String(d.getDate()).padStart(2,'0');
      hudMazeStatus.textContent = `Daily Maze (${y}-${m}-${da})`;
    }
    updateHUD();
  }

  function updateHUD() { hudPlayerLabel.textContent = playerName ? `• Player: ${playerName}` : ''; }
  function formatTime(ms){ const t=Math.max(0,Math.floor(ms/1000)); const m=String(Math.floor(t/60)).padStart(2,'0'); const s=String(t%60).padStart(2,'0'); return `${m}:${s}`; }

  // Drawing
  function drawFloor(){
    ctx.fillStyle = COLORS.floor; ctx.fillRect(0,0,WIDTH,HEIGHT);
    ctx.globalAlpha=0.06; ctx.fillStyle='#8ab';
    for(let y=0;y<HEIGHT;y+=16){for(let x=0;x<WIDTH;x+=16){ctx.fillRect(x+11,y+7,1,1);}}
    ctx.globalAlpha=1;
  }
  function drawWalls(map){
    for(let r=0;r<ROWS;r++){ for(let c=0;c<COLS;c++){
      if(map[r][c]==='#'){ const x=c*TILE,y=r*TILE;
        ctx.fillStyle=COLORS.wall; ctx.fillRect(x,y,TILE,TILE);
        ctx.fillStyle=COLORS.wallLight; ctx.fillRect(x,y,TILE,4); ctx.fillRect(x,y,4,TILE);
        ctx.fillStyle=COLORS.wallDark; ctx.fillRect(x,y+TILE-4,TILE,4); ctx.fillRect(x+TILE-4,y,4,TILE);
      }
    }}
  }
  function drawChest(col,row,t){
    const x=col*TILE,y=row*TILE;
    ctx.globalAlpha=0.15; ctx.fillStyle='black'; ctx.fillRect(x+4,y+TILE-7,TILE-8,5); ctx.globalAlpha=1;
    ctx.fillStyle=COLORS.chestDark; ctx.fillRect(x+6,y+10,TILE-12,TILE-16);
    ctx.fillStyle=COLORS.chest; ctx.fillRect(x+6,y+8,TILE-12,TILE-18);
    ctx.fillStyle=COLORS.chestLight; ctx.fillRect(x+6,y+8,4,4);
    ctx.fillStyle='#8b561c'; ctx.fillRect(x+11,y+8,4,TILE-18); ctx.fillRect(x+TILE-15,y+8,4,TILE-18);
    ctx.fillStyle=COLORS.gold; ctx.fillRect(x+TILE/2-3,y+18,6,6);
    ctx.fillStyle='#5b480e'; ctx.fillRect(x+TILE/2-1,y+20,2,3);
    const phase=Math.sin(t/10), sx=(x+TILE/2+9+phase*3)|0, sy=(y+6+((phase+1)*2))|0;
    ctx.fillStyle='#fff'; ctx.fillRect(sx,sy,2,2); ctx.globalAlpha=0.6; ctx.fillRect(sx+2,sy,1,1); ctx.globalAlpha=1;
  }
  function drawHero(col,row,gender,tick){
    const x=col*TILE,y=row*TILE; const bob=(Math.sin(tick/12)>0?0:1);
    const hair=gender==='male'?'#5b3a1a':'#8e2a7b', skin='#ffd7a8', shirt=gender==='male'?'#2b6ef9':'#e255a1';
    const belt='#22252b', pants='#3a3f52', boot='#262a3a', eye='#161616', outline='#0c0c14';
    ctx.globalAlpha=0.18; ctx.fillStyle='black'; ctx.fillRect(x+8,y+28+bob,16,3); ctx.globalAlpha=1;
    ctx.fillStyle=outline; ctx.fillRect(x+7,y+4+bob,18,1); ctx.fillRect(x+7,y+5+bob,1,24); ctx.fillRect(x+24,y+5+bob,1,24); ctx.fillRect(x+7,y+29+bob,18,1);
    ctx.fillStyle=hair; ctx.fillRect(x+9,y+6+bob,14,4); ctx.fillRect(x+8,y+8+bob,4,8); ctx.fillRect(x+19,y+8+bob,4,8); if(gender==='female') ctx.fillRect(x+21,y+12+bob,5,7);
    ctx.fillStyle=skin; ctx.fillRect(x+10,y+8+bob,12,8);
    ctx.fillStyle=eye; ctx.fillRect(x+12,y+11+bob,2,2); ctx.fillRect(x+18,y+11+bob,2,2);
    ctx.fillStyle=shirt; ctx.fillRect(x+9,y+16+bob,14,8);
    ctx.fillStyle=belt; ctx.fillRect(x+9,y+23+bob,14,2);
    ctx.fillStyle=pants; ctx.fillRect(x+10,y+25+bob,5,5); ctx.fillRect(x+16,y+25+bob,5,5);
    ctx.fillStyle=boot; ctx.fillRect(x+10,y+29+bob,5,2); ctx.fillRect(x+16,y+29+bob,5,2);
  }

  // Fog of War
  function revealAroundPlayer() {
    const R=4;
    for (let dr=-R;dr<=R;dr++) for (let dc=-R;dc<=R;dc++) {
      const r=player.row+dr,c=player.col+dc; if (r<0||c<0||r>=ROWS||c>=COLS) continue;
      if (dr*dr+dc*dc <= R*R+1) seen[r][c]=true;
    }
  }
  function drawFog() {
    if (!shadowOn || !levelMap) return;
    // Undiscovered
    ctx.globalAlpha=0.75; ctx.fillStyle='#000';
    for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) if (!seen[r][c]) ctx.fillRect(c*TILE,r*TILE,TILE,TILE);
    ctx.globalAlpha=1;
    // Pixel vignette rings
    const px=4;
    for (let step=6; step>=1; step--) {
      const alpha = Math.max(0,(step-1)/6)*0.5;
      ctx.globalAlpha=alpha; const rad=step*TILE+2;
      ctx.fillStyle='#000';
      ctx.fillRect(0, Math.max(0,(player.row*TILE - rad)), WIDTH, px);
      ctx.fillRect(0, Math.min(HEIGHT-px,(player.row*TILE + rad)), WIDTH, px);
      ctx.fillRect(Math.max(0,(player.col*TILE - rad)), 0, px, HEIGHT);
      ctx.fillRect(Math.min(WIDTH-px,(player.col*TILE + rad)), 0, px, HEIGHT);
    }
    ctx.globalAlpha=1;
  }

  // Minimap (respects FOW)
  function drawMinimap() {
    if (!minimapOn || !levelMap) return;
    const scale=4, pad=8, x0=pad, y0=pad, mmW=COLS*scale, mmH=ROWS*scale;
    ctx.globalAlpha=0.65; ctx.fillStyle='#000'; ctx.fillRect(x0-2,y0-2,mmW+4,mmH+4); ctx.globalAlpha=1;
    for (let r=0;r<ROWS;r++) for (let c=0;c<COLS;c++) {
      if (shadowOn && !seen[r][c]) ctx.fillStyle='#000';
      else ctx.fillStyle=(levelMap[r][c]==='#')?COLORS.wallLight:COLORS.floor;
      ctx.fillRect(x0+c*scale,y0+r*scale,scale,scale);
    }
    ctx.fillStyle=COLORS.gold; ctx.fillRect(x0+chestPos.col*scale,y0+chestPos.row*scale,scale,scale);
    ctx.fillStyle='#fff'; ctx.fillRect(x0+player.col*scale,y0+player.row*scale,scale,scale);
  }

  // Render loop
  let tick=0;
  function render(){
    drawFloor();
    if (levelMap) drawWalls(levelMap);
    if (levelMap) drawChest(chestPos.col, chestPos.row, tick);
    if (selectedHero && state!=='start') drawHero(player.col,player.row,selectedHero,tick);
    drawFog();
    drawMinimap();
    if (state==='playing') currentTimeMs = performance.now() - levelStartTime;
    hudTimer.textContent = `⏱ ${formatTime(currentTimeMs)}`;
  }
  function loop(){ tick++; render(); requestAnimationFrame(loop); }

  // Movement
  function getMoveDelay(){ return (sprinting ? FAST_MOVE_DELAY : MOVE_DELAY); }
  function tileAt(c,r){ if (c<0||c>=COLS||r<0||r>=ROWS) return '#'; return levelMap[r][c]; }
  function isBlocked(c,r){ return tileAt(c,r)==='#'; }
  function tryMove(dx,dy){
    const now=performance.now(); if (now - player.lastMove < getMoveDelay()) return;
    const nc=player.col+dx, nr=player.row+dy;
    if (!isBlocked(nc,nr)) {
      player.col=nc; player.row=nr; player.lastMove=now;
      revealAroundPlayer();
      sfx('move');
      if (player.col===chestPos.col && player.row===chestPos.row) { sfx('chest'); onLevelComplete(); }
    }
  }

  // Input
  function onKeyDown(e){
    const k=e.key.toLowerCase();
    const suppress = ['arrowup','arrowdown','arrowleft','arrowright',' '].includes(k) || ['w','a','s','d','shift','m'].includes(k);
    if (suppress) e.preventDefault();
    if (k==='shift') { sprinting=true; return; }
    if (k==='m') { toggleMinimap(); return; }
    if (state!=='playing') return;
    if (k==='arrowup'||k==='w') tryMove(0,-1);
    else if (k==='arrowdown'||k==='s') tryMove(0,1);
    else if (k==='arrowleft'||k==='a') tryMove(-1,0);
    else if (k==='arrowright'||k==='d') tryMove(1,0);
  }
  function onKeyUp(e){ if (e.key.toLowerCase()==='shift') sprinting=false; }

  // Touch D-pad (hold to repeat)
  let holdTimer=null;
  function startHold(dir){
    clearInterval(holdTimer);
    if (dir==='sprint'){ sprinting=true; return; }
    const map={up:[0,-1],down:[0,1],left:[-1,0],right:[1,0]};
    const v=map[dir]; if(!v) return;
    holdTimer=setInterval(()=>{ if(state==='playing') tryMove(v[0],v[1]); }, 30);
  }
  function stopHold(dir){ if (dir==='sprint'){ sprinting=false; return; } clearInterval(holdTimer); holdTimer=null; }
  Array.from(touchControls.querySelectorAll('button')).forEach(btn=>{
    const dir=btn.getAttribute('data-dir');
    const start=(ev)=>{ ev.preventDefault(); startHold(dir); };
    const end=(ev)=>{ ev.preventDefault(); stopHold(dir); };
    btn.addEventListener('touchstart',start,{passive:false}); btn.addEventListener('touchend',end,{passive:false});
    btn.addEventListener('touchcancel',end,{passive:false}); btn.addEventListener('mousedown',start);
    btn.addEventListener('mouseup',end); btn.addEventListener('mouseleave',end);
  });

  // Scroll animation
  function playScrollAnimation(){
    const reduce = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const initial = (playerName && playerName.trim().charAt(0)) ? playerName.trim().charAt(0).toUpperCase() : '★';
    waxGlyph.textContent = initial;

    const px=4; scrollEl.style.setProperty('--px', `${px}px`);
    scrollPaper.style.height='auto';
    let contentH=Math.ceil(scrollPaper.scrollHeight/px)*px; contentH=Math.max(px*24,Math.min(px*90,contentH));
    scrollEl.style.setProperty('--paperH', `${contentH}px`);
    const steps=Math.max(10,Math.round(contentH/(px*2)));

    btnNext.disabled=true;
    scrollEl.classList.remove('animate'); void scrollEl.offsetWidth;
    scrollPaper.style.animationTimingFunction=`steps(${steps}, end)`;
    bottomRodEl.style.animationTimingFunction=`steps(${steps}, end)`;

    if (!reduce) {
      scrollEl.classList.add('animate'); sfx('seal');
      const onEnd = (e)=>{ if (e.animationName==='unroll'){ btnNext.disabled=false; scrollPaper.removeEventListener('animationend', onEnd); btnNext.focus(); } };
      scrollPaper.addEventListener('animationend', onEnd);
      setTimeout(()=>{ btnNext.disabled=false; }, 1300);
    } else btnNext.disabled=false;
  }

  // Confetti
  function initConfettiCanvas(){
    confettiCtx = confettiCanvas.getContext('2d');
    const dpr=Math.max(1,Math.min(2,window.devicePixelRatio||1));
    confettiCanvas.width=Math.floor(window.innerWidth*dpr); confettiCanvas.height=Math.floor(window.innerHeight*dpr);
    confettiCanvas.style.width='100%'; confettiCanvas.style.height='100%';
    confettiCtx.setTransform(dpr,0,0,dpr,0,0);
  }
  function startConfetti(){
    initConfettiCanvas(); confettiParticles=[];
    const colors=['#ffd86b','#7bdcff','#ff5b6e','#e255a1','#2b6ef9','#97c0ff','#39ff14'];
    for(let i=0;i<120;i++) confettiParticles.push({x:Math.random()*window.innerWidth,y:-10-Math.random()*80,vx:(Math.random()-0.5)*2,vy:1+Math.random()*2,size:3+Math.random()*3,color:colors[Math.random()*colors.length|0],life:180+Math.random()*180});
    cancelAnimationFrame(confettiRAF);
    const step=()=>{ const c=confettiCtx; c.clearRect(0,0,window.innerWidth,window.innerHeight);
      for(const p of confettiParticles){ p.vy+=0.02; p.x+=p.vx; p.y+=p.vy; p.life-=1; c.fillStyle=p.color; c.fillRect(p.x,p.y,p.size,p.size); }
      confettiParticles=confettiParticles.filter(p=>p.life>0 && p.y<window.innerHeight+20);
      confettiRAF=requestAnimationFrame(step);
    };
    confettiRAF=requestAnimationFrame(step);
  }
  function stopConfetti(){ cancelAnimationFrame(confettiRAF); confettiParticles=[]; if(confettiCtx) confettiCtx.clearRect(0,0,window.innerWidth,window.innerHeight); }
  window.addEventListener('resize', ()=>{ if (overlayWin.classList.contains('visible')) initConfettiCanvas(); });

  // Flow
  function onLevelComplete(){
    state='complete';
    const levelMs=Math.max(0,Math.floor(performance.now()-levelStartTime));

    if (MODE==='story') {
      const fragment = FRAGMENTS[levelIndex];
      if (!fragmentsEarned.includes(fragment)) fragmentsEarned.push(fragment);
      const prevBest = bestTimes[levelIndex];
      if (prevBest==null || levelMs<prevBest) bestTimes[levelIndex]=levelMs;
      levelIndex++;
      fragmentText.textContent = `Part ${fragmentsEarned.length}: ${fragment}`;
      btnNext.textContent = (levelIndex >= activeLevels.length) ? 'Reveal Final Message' : 'Next Maze';
      levelTimeLabel.textContent = `Time: ${formatTime(levelMs)} • Best: ${prevBest==null ? '--:--' : formatTime(Math.min(prevBest,levelMs))}`;
    } else {
      const prev=bestDaily; if (prev==null || levelMs<prev) bestDaily=levelMs;
      fragmentText.textContent = `Daily clear! ${formatTime(levelMs)} ${prev ? `(best ${formatTime(Math.min(prev,levelMs))})` : ''}`;
      btnNext.textContent = 'Back to Start';
      levelTimeLabel.textContent = `Time: ${formatTime(levelMs)} • Best: ${bestDaily==null ? '--:--' : formatTime(bestDaily)}`;
    }
    saveProgress();
    showOverlay(overlayComplete);
    requestAnimationFrame(()=>playScrollAnimation());
  }

  function startLevel(idx){ levelIndex=idx; loadLevel(levelIndex); state='playing'; hideAllOverlays(); canvas.focus(); }
  function showOverlay(el){ hideAllOverlays(); el.classList.add('visible'); }
  function hideAllOverlays(){ overlayStart.classList.remove('visible'); overlayComplete.classList.remove('visible'); overlayWin.classList.remove('visible'); }
  function toStartScreen(){ state='start'; showOverlay(overlayStart); updateStartButtons(); }

  function showWin(){
    completed=true; saveProgress();
    state='win';
    const msg = (typeof FINAL_MESSAGE === 'string' && FINAL_MESSAGE.trim())
      ? FINAL_MESSAGE.replace(/\{name\}/gi, playerName || 'Adventurer')
      : fragmentsEarned.join(' ');
    finalMessageBox.textContent = msg;
    showOverlay(overlayWin);
    sfx('win'); startConfetti(); playHappyBirthday(0.06, 1, 0.35);
  }

  // Toggles
  function toggleMinimap(){ minimapOn=!minimapOn; btnMap.setAttribute('aria-pressed',String(minimapOn)); sfx('toggle'); saveProgress(); }
  function toggleShadow(){ shadowOn=!shadowOn; btnShadow.setAttribute('aria-pressed',String(shadowOn)); sfx('toggle'); saveProgress(); }

  // UI helpers
  function isValidName(name){ return !!(name && name.trim().length>0); }
  function setCharacterButtonsEnabled(enabled){ btnPickMale.disabled=!enabled; btnPickFemale.disabled=!enabled; }
  function updateStartButtons(){
    const trimmed=playerNameInput.value.trim(); playerName=trimmed; updateHUD();
    setCharacterButtonsEnabled(isValidName(trimmed));
    btnStart.disabled = !(isValidName(trimmed) && !!selectedHero);
    const save=loadProgress();
    const hasProgress=!!(save && (save.completed || (save.levelIndex||0)>0 || (Array.isArray(save.fragments) && save.fragments.length>0)));
    btnContinue.classList.toggle('hidden', !hasProgress);
    btnReset.classList.toggle('hidden', !hasProgress);
  }

  // Events
  window.addEventListener('keydown', (e)=>{ resumeAudio(); onKeyDown(e); });
  window.addEventListener('keyup', onKeyUp);

  playerNameInput.addEventListener('input', ()=>{ updateStartButtons(); saveProgress(); });

  btnPickMale.addEventListener('click', ()=>{ if(btnPickMale.disabled) return; sfx('click'); selectedHero='male'; btnPickMale.classList.add('selected'); btnPickFemale.classList.remove('selected'); updateStartButtons(); saveProgress(); });
  btnPickFemale.addEventListener('click', ()=>{ if(btnPickFemale.disabled) return; sfx('click'); selectedHero='female'; btnPickFemale.classList.add('selected'); btnPickMale.classList.remove('selected'); updateStartButtons(); saveProgress(); });

  btnStart.addEventListener('click', ()=>{ sfx('click'); MODE='story'; setActiveStory(); playerName=playerNameInput.value.trim(); fragmentsEarned=[]; completed=false; levelIndex=0; saveProgress(); startLevel(0); });
  btnDaily.addEventListener('click', ()=>{ sfx('click'); MODE='daily'; setActiveDaily(); startLevel(0); });

  btnContinue.addEventListener('click', ()=> {
    sfx('click');
    const save=loadProgress();
    if (save) {
      playerName = save.playerName || playerName || '';
      playerNameInput.value = playerName;
      selectedHero = save.character || selectedHero || 'male';
      (selectedHero==='male'?btnPickMale:btnPickFemale).classList.add('selected');
      fragmentsEarned = Array.isArray(save.fragments)? save.fragments.slice(): [];
      completed = !!save.completed;
      bestTimes = Array.isArray(save.bestTimes)? save.bestTimes : [null,null,null];
      bestDaily = (typeof save.bestDaily==='number')? save.bestDaily : bestDaily;

      const s=save.settings||{};
      setMuted(!!s.muted);
      document.body.classList.toggle('crt', !!s.crt);
      btnCRT.setAttribute('aria-pressed', String(!!s.crt));
      minimapOn = !!s.minimap;
      shadowOn = (s.shadowOn!==undefined) ? !!s.shadowOn : true;
      btnMap.setAttribute('aria-pressed', String(minimapOn));
      btnShadow.setAttribute('aria-pressed', String(shadowOn));

      updateHUD();

      if (completed) {
        const msg = (typeof FINAL_MESSAGE === 'string' && FINAL_MESSAGE.trim())
          ? FINAL_MESSAGE.replace(/\{name\}/gi, playerName || 'Adventurer')
          : fragmentsEarned.join(' ');
        finalMessageBox.textContent = msg;
        showOverlay(overlayWin);
        sfx('win'); startConfetti(); playHappyBirthday(0.06, 1, 0.35);
      } else {
        MODE='story'; setActiveStory();
        const idx=Math.min(Math.max(save.levelIndex||0,0), activeLevels.length-1);
        startLevel(idx);
      }
    }
  });

  btnReset.addEventListener('click', ()=>{ sfx('click'); if(!confirm('Reset progress?')) return;
    resetProgress(true); playerNameInput.value=playerName;
    btnPickMale.classList.remove('selected'); btnPickFemale.classList.remove('selected'); selectedHero=null;
    updateStartButtons(); saveProgress();
  });

  btnNext.addEventListener('click', ()=>{ sfx('click');
    if (MODE==='daily') toStartScreen();
    else if (levelIndex >= activeLevels.length) showWin();
    else startLevel(levelIndex);
  });

  btnRestart.addEventListener('click', ()=>{ sfx('click'); stopConfetti(); resetProgress(true);
    btnPickMale.classList.remove('selected'); btnPickFemale.classList.remove('selected'); selectedHero=null;
    playerNameInput.value=playerName; toStartScreen(); saveProgress();
  });

  btnMute.addEventListener('click', ()=> setMuted(!muted));
  btnCRT.addEventListener('click', ()=>{ const on=!document.body.classList.contains('crt'); document.body.classList.toggle('crt',on); btnCRT.setAttribute('aria-pressed',String(on)); sfx('toggle'); saveProgress(); });
  btnMap.addEventListener('click', ()=>{ toggleMinimap(); });
  btnShadow.addEventListener('click', ()=>{ toggleShadow(); });

  canvas.addEventListener('click', ()=>{ canvas.focus(); resumeAudio(); });

  // Init
  function init(){
    canvas.width=WIDTH; canvas.height=HEIGHT;
    drawFloor(); drawHeroPreview(maleCanvas,'male'); drawHeroPreview(femaleCanvas,'female');

    // Default mode
    setActiveStory();

    const save=loadProgress();
    if (save) {
      if (save.playerName){ playerName=save.playerName; playerNameInput.value=playerName; }
      if (save.character){ selectedHero=save.character; (selectedHero==='male'?btnPickMale:btnPickFemale).classList.add('selected'); }
      bestTimes = Array.isArray(save.bestTimes)? save.bestTimes : [null,null,null];
      bestDaily = (typeof save.bestDaily==='number')? save.bestDaily : null;
      const s=save.settings||{};
      setMuted(!!s.muted);
      document.body.classList.toggle('crt', !!s.crt);
      btnCRT.setAttribute('aria-pressed', String(!!s.crt));
      minimapOn = !!s.minimap;
      shadowOn = (s.shadowOn!==undefined) ? !!s.shadowOn : true; // default ON
      btnMap.setAttribute('aria-pressed', String(minimapOn));
      btnShadow.setAttribute('aria-pressed', String(shadowOn));
    } else {
      setMuted(false);
      shadowOn = true; btnShadow.setAttribute('aria-pressed','true');
    }

    setCharacterButtonsEnabled(isValidName(playerName));
    canvas.addEventListener('click', ()=>canvas.focus());
    updateStartButtons(); updateHUD();
    requestAnimationFrame(loop);
  }

  // Hero preview
  function drawHeroPreview(canvas, gender) {
    const c=canvas.getContext('2d', { alpha:true }); c.imageSmoothingEnabled=false;
    c.clearRect(0,0,canvas.width,canvas.height);
    c.fillStyle='#0c1325'; c.fillRect(0,0,canvas.width,canvas.height);
    c.globalAlpha=0.08; c.fillStyle='#97c0ff';
    for(let y=0;y<canvas.height;y+=16){for(let x=0;x<canvas.width;x+=16){c.fillRect(x+4,y+10,1,1);}}
    c.globalAlpha=1;

    const temp=document.createElement('canvas'); temp.width=TILE; temp.height=TILE;
    const tc=temp.getContext('2d',{alpha:true}); tc.imageSmoothingEnabled=false;

    const x=0,y=0,bob=0;
    const hair=gender==='male'?'#5b3a1a':'#8e2a7b', skin='#ffd7a8', shirt=gender==='male'?'#2b6ef9':'#e255a1', belt='#22252b', pants='#3a3f52', boot='#262a3a', eye='#161616', outline='#0c0c14';
    tc.fillStyle=outline; tc.fillRect(x+7,y+4+bob,18,1); tc.fillRect(x+7,y+5+bob,1,24); tc.fillRect(x+24,y+5+bob,1,24); tc.fillRect(x+7,y+29+bob,18,1);
    tc.fillStyle=hair; tc.fillRect(x+9,y+6+bob,14,4); tc.fillRect(x+8,y+8+bob,4,8); tc.fillRect(x+19,y+8+bob,4,8); if(gender==='female') tc.fillRect(x+21,y+12+bob,5,7);
    tc.fillStyle=skin; tc.fillRect(x+10,y+8+bob,12,8);
    tc.fillStyle=eye; tc.fillRect(x+12,y+11+bob,2,2); tc.fillRect(x+18,y+11+bob,2,2);
    tc.fillStyle=shirt; tc.fillRect(x+9,y+16+bob,14,8);
    tc.fillStyle=belt; tc.fillRect(x+9,y+23+bob,14,2);
    tc.fillStyle=pants; tc.fillRect(x+10,y+25+bob,5,5); tc.fillRect(x+16,y+25+bob,5,5);
    tc.fillStyle=boot; tc.fillRect(x+10,y+29+bob,5,2); tc.fillRect(x+16,y+29+bob,5,2);

    const scale=3;
    c.drawImage(temp,(canvas.width-TILE*scale)/2,(canvas.height-TILE*scale)/2,TILE*scale,TILE*scale);
  }

  init();
})();