const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlayTitle');
const overlayText = document.getElementById('overlayText');
const paintValue = document.getElementById('paintValue');
const timeValue = document.getElementById('timeValue');
const livesValue = document.getElementById('livesValue');
const startButton = document.getElementById('startButton');

const WIDTH = canvas.width;
const HEIGHT = canvas.height;
const FLOOR_Y = 460;
const PLAYER_W = 42;
const PLAYER_H = 54;
const GRAVITY = 0.56;
const MOVE_SPEED = 4.2;
const JUMP_FORCE = -11.5;
const TOTAL_PAINT = 6;
const ROUND_TIME = 60;

const state = {
  started: false,
  running: false,
  won: false,
  gameOver: false,
  timeLeft: ROUND_TIME,
  paintCollected: 0,
  lives: 3,
  lastTime: 0,
  spawnTimer: 0,
  enemies: [],
  pickups: [],
  particles: [],
  keys: {
    left: false,
    right: false,
    jump: false,
  },
};

const player = {
  x: 110,
  y: FLOOR_Y - PLAYER_H,
  width: PLAYER_W,
  height: PLAYER_H,
  vx: 0,
  vy: 0,
  onGround: true,
  facing: 1,
};

function resetGame() {
  state.started = true;
  state.running = true;
  state.won = false;
  state.gameOver = false;
  state.timeLeft = ROUND_TIME;
  state.paintCollected = 0;
  state.lives = 3;
  state.spawnTimer = 0;
  state.enemies = [];
  state.pickups = [];
  state.particles = [];
  player.x = 110;
  player.y = FLOOR_Y - PLAYER_H;
  player.vx = 0;
  player.vy = 0;
  player.onGround = true;
  player.facing = 1;
  createPaintPickupField();
  paintValue.textContent = `${state.paintCollected}/${TOTAL_PAINT}`;
  timeValue.textContent = String(Math.ceil(state.timeLeft));
  livesValue.textContent = String(state.lives);
  overlay.classList.remove('visible');
}

function showOverlay(title, text, buttonLabel = 'Start Run') {
  overlay.classList.add('visible');
  overlayTitle.textContent = title;
  overlayText.textContent = text;
  startButton.textContent = buttonLabel;
}

function createPaintPickupField() {
  state.pickups = [];
  const palette = [
    { color: '#ff7ac6', name: 'pink' },
    { color: '#7ad8ff', name: 'cyan' },
    { color: '#ffe47b', name: 'gold' },
    { color: '#7ef2a6', name: 'green' },
    { color: '#ff9c73', name: 'orange' },
    { color: '#d09aff', name: 'violet' },
  ];

  for (let i = 0; i < TOTAL_PAINT; i += 1) {
    const px = 130 + (i * 130) + (i % 2) * 34;
    const heights = [372, 334, 356, 326, 374, 342];
    const py = heights[i];
    state.pickups.push({
      x: px,
      y: py,
      r: 12,
      color: palette[i].color,
      pulse: Math.random() * Math.PI * 2,
      collected: false,
      name: palette[i].name,
    });
  }
}

function spawnEnemy() {
  const size = 18 + Math.random() * 18;
  const side = Math.random() > 0.5 ? -1 : 1;
  state.enemies.push({
    x: side < 0 ? -30 : WIDTH + 30,
    y: FLOOR_Y - size,
    w: size,
    h: size,
    vx: (2.1 + Math.random() * 1.5) * side,
    colors: ['#2b2d44', '#8e8fa3', '#f2f2f7'],
  });
}

function emitBurst(x, y, color, amount = 12) {
  for (let i = 0; i < amount; i += 1) {
    state.particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 4,
      vy: (Math.random() - 0.5) * 4,
      life: 25 + Math.random() * 26,
      color,
      size: 2 + Math.random() * 3,
    });
  }
}

function handleInput() {
  if (state.keys.left) player.vx = -MOVE_SPEED;
  else if (state.keys.right) player.vx = MOVE_SPEED;
  else player.vx *= 0.75;

  if (Math.abs(player.vx) < 0.2) player.vx = 0;

  if (state.keys.jump && player.onGround) {
    player.vy = JUMP_FORCE;
    player.onGround = false;
    emitBurst(player.x + player.width / 2, FLOOR_Y, '#f8d37b', 9);
  }
}

function updatePlayer() {
  player.vy += GRAVITY;
  player.x += player.vx;
  player.y += player.vy;

  if (player.x < 0) player.x = 0;
  if (player.x + player.width > WIDTH) player.x = WIDTH - player.width;

  if (player.y + player.height >= FLOOR_Y) {
    player.y = FLOOR_Y - player.height;
    player.vy = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }

  if (player.vx < 0) player.facing = -1;
  if (player.vx > 0) player.facing = 1;
}

function updatePickups() {
  for (const pickup of state.pickups) {
    if (pickup.collected) continue;
    pickup.pulse += 0.08;

    const dx = player.x + player.width / 2 - pickup.x;
    const dy = player.y + player.height / 2 - pickup.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 26) {
      pickup.collected = true;
      state.paintCollected += 1;
      emitBurst(pickup.x, pickup.y, pickup.color, 20);
      paintValue.textContent = `${state.paintCollected}/${TOTAL_PAINT}`;
    }
  }
}

function updateEnemies() {
  for (const enemy of state.enemies) {
    enemy.x += enemy.vx;
    if (enemy.x < -40 || enemy.x > WIDTH + 40) {
      enemy.dead = true;
    }

    const playerRect = {
      x: player.x,
      y: player.y,
      width: player.width,
      height: player.height,
    };
    const enemyRect = {
      x: enemy.x,
      y: enemy.y,
      width: enemy.w,
      height: enemy.h,
    };

    if (rectsOverlap(playerRect, enemyRect)) {
      enemy.dead = true;
      state.lives -= 1;
      livesValue.textContent = String(state.lives);
      emitBurst(player.x + player.width / 2, player.y + player.height / 2, '#ff6b6b', 24);
      player.x = 110; player.y = FLOOR_Y - PLAYER_H; player.vx = 0; player.vy = 0;
      if (state.lives <= 0) {
        endGame(false, 'The studio went dark. Try another run.');
        return;
      }
    }
  }

  state.enemies = state.enemies.filter((enemy) => !enemy.dead);
}

function updateParticles() {
  for (const particle of state.particles) {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.life -= 1;
  }
  state.particles = state.particles.filter((particle) => particle.life > 0);
}

function rectsOverlap(a, b) {
  return a.x < b.x + b.width && a.x + a.width > b.x && a.y < b.y + b.height && a.y + a.height > b.y;
}

function endGame(won, message) {
  state.running = false;
  state.won = won;
  state.gameOver = true;
  if (won) {
    overlayTitle.textContent = 'The mural is alive!';
    overlayText.textContent = 'You restored all six colors and saved the studio from the eraser storm.';
    startButton.textContent = 'Play Again';
  } else {
    overlayTitle.textContent = 'Studio lost';
    overlayText.textContent = message;
    startButton.textContent = 'Retry';
  }
  overlay.classList.add('visible');
}

function update(delta) {
  if (!state.running) return;

  state.timeLeft -= delta;
  if (state.timeLeft <= 0) {
    state.timeLeft = 0;
    timeValue.textContent = '0';
    endGame(false, 'Time ran out before the final color was found.');
    return;
  }
  timeValue.textContent = String(Math.ceil(state.timeLeft));

  handleInput();
  updatePlayer();
  updatePickups();

  if (state.paintCollected >= TOTAL_PAINT) {
    endGame(true, '');
    return;
  }

  state.spawnTimer -= delta;
  if (state.spawnTimer <= 0) {
    spawnEnemy();
    state.spawnTimer = 1.3 + Math.random() * 1.4;
  }

  updateEnemies();
  updateParticles();
}

function drawBackground() {
  const sky = ctx.createLinearGradient(0, 0, 0, HEIGHT);
  sky.addColorStop(0, '#6ee3ff');
  sky.addColorStop(0.5, '#b5f0ff');
  sky.addColorStop(0.8, '#f8d4a9');
  sky.addColorStop(1, '#f4b35a');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, WIDTH, HEIGHT);

  ctx.fillStyle = 'rgba(255,255,255,0.65)';
  for (let i = 0; i < 8; i += 1) {
    const x = 100 + i * 116;
    const y = 70 + (i % 2) * 45;
    ctx.beginPath();
    ctx.arc(x, y, 28, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.fillStyle = '#7a4a2d';
  ctx.fillRect(0, FLOOR_Y, WIDTH, HEIGHT - FLOOR_Y);

  ctx.fillStyle = '#9c6b44';
  ctx.fillRect(0, FLOOR_Y - 28, WIDTH, 22);

  ctx.fillStyle = 'rgba(255,255,255,0.12)';
  for (let i = 0; i < 9; i += 1) {
    ctx.fillRect(i * 120, FLOOR_Y - 6, 90, 6);
  }
}

function drawPlayer() {
  const bodyX = player.x;
  const bodyY = player.y;

  ctx.save();
  ctx.translate(bodyX + player.width / 2, bodyY + player.height / 2);
  ctx.scale(player.facing, 1);

  ctx.fillStyle = '#0f0f19';
  ctx.fillRect(-14, -24, 28, 18);

  ctx.fillStyle = '#ffcf6b';
  ctx.fillRect(-14, -10, 28, 26);

  ctx.fillStyle = '#ef7db5';
  ctx.fillRect(-11, -12, 22, 18);

  ctx.fillStyle = '#fefefe';
  ctx.fillRect(-8, -17, 6, 6);
  ctx.fillRect(2, -17, 6, 6);

  ctx.fillStyle = '#111';
  ctx.fillRect(-5, -1, 4, 4);
  ctx.fillRect(1, -1, 4, 4);

  ctx.fillStyle = '#ffe7a3';
  ctx.fillRect(-10, 16, 8, 14);
  ctx.fillRect(2, 16, 8, 14);

  ctx.restore();
}

function drawPickups() {
  for (const pickup of state.pickups) {
    if (pickup.collected) continue;
    const radius = pickup.r + Math.sin(pickup.pulse) * 2;
    ctx.beginPath();
    ctx.fillStyle = pickup.color;
    ctx.shadowBlur = 18;
    ctx.shadowColor = pickup.color;
    ctx.arc(pickup.x, pickup.y, radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    ctx.beginPath();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.arc(pickup.x - 4, pickup.y - 4, radius * 0.32, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawEnemies() {
  for (const enemy of state.enemies) {
    ctx.fillStyle = enemy.colors[0];
    ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
    ctx.fillStyle = enemy.colors[1];
    ctx.fillRect(enemy.x + 4, enemy.y + 5, enemy.w - 8, enemy.h - 10);
    ctx.fillStyle = '#111';
    ctx.fillRect(enemy.x + 5, enemy.y + 7, enemy.w - 10, 5);
    ctx.fillStyle = '#fff';
    ctx.fillRect(enemy.x + 7, enemy.y + 16, 3, 3);
    ctx.fillRect(enemy.x + enemy.w - 10, enemy.y + 16, 3, 3);
  }
}

function drawParticles() {
  for (const particle of state.particles) {
    ctx.fillStyle = particle.color;
    ctx.globalAlpha = Math.max(particle.life / 40, 0.1);
    ctx.fillRect(particle.x, particle.y, particle.size, particle.size);
  }
  ctx.globalAlpha = 1;
}

function draw() {
  drawBackground();
  drawPickups();
  drawEnemies();
  drawParticles();
  drawPlayer();
}

function gameLoop(timestamp) {
  const delta = Math.min((timestamp - state.lastTime) / 1000 || 0.016, 0.033);
  state.lastTime = timestamp;
  update(delta);
  draw();
  requestAnimationFrame(gameLoop);
}

function bindEvents() {
  document.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') state.keys.left = true;
    if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') state.keys.right = true;
    if (event.key === 'ArrowUp' || event.key === ' ' || event.key.toLowerCase() === 'w') {
      state.keys.jump = true;
      event.preventDefault();
    }
  });

  document.addEventListener('keyup', (event) => {
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') state.keys.left = false;
    if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') state.keys.right = false;
    if (event.key === 'ArrowUp' || event.key === ' ' || event.key.toLowerCase() === 'w') state.keys.jump = false;
  });

  startButton.addEventListener('click', () => {
    resetGame();
  });

  document.querySelectorAll('[data-control]').forEach((button) => {
    const action = button.dataset.control;
    const press = (down) => {
      if (action === 'left') state.keys.left = down;
      if (action === 'right') state.keys.right = down;
      if (action === 'jump' && down) state.keys.jump = true;
    };

    button.addEventListener('pointerdown', () => press(true));
    button.addEventListener('pointerup', () => press(false));
    button.addEventListener('pointerleave', () => press(false));
    button.addEventListener('pointercancel', () => press(false));
  });
}

showOverlay('Ready to paint the sky?', 'Collect the six glowing color shards, dodge the eraser drifters, and save the studio before time runs out.');
paintValue.textContent = `0/${TOTAL_PAINT}`;
timeValue.textContent = String(ROUND_TIME);
livesValue.textContent = String(state.lives);

bindEvents();
requestAnimationFrame(gameLoop);
