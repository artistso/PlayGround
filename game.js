const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');
const overlay = document.getElementById('overlay');
const startButton = document.getElementById('startButton');
const hudHealth = document.getElementById('health');
const hudShards = document.getElementById('shards');

const world = {
  width: canvas.width,
  height: canvas.height,
  gravity: 1700,
  groundY: 430,
  leaves: 12,
};

const keys = {
  left: false,
  right: false,
  jump: false,
  attack: false,
};

const game = {
  started: false,
  running: true,
  time: 0,
  finalTimer: 0,
  levelPassed: false,
  levelComplete: false,
  hurtFlash: 0,
  cameraX: 0,
  spawnX: 110,
  winPortal: { x: 840, y: 210, r: 48 },
};

const player = {
  x: 110,
  y: 246,
  w: 34,
  h: 46,
  vx: 0,
  vy: 0,
  speed: 280,
  jumpForce: 600,
  onGround: false,
  facing: 1,
  health: 5,
  invuln: 0,
  attackCooldown: 0,
  attackArc: 0,
  trail: [],
};

const particles = [];
const projectiles = [];
const enemies = [];
const shards = [];
const scenery = [];

function resetState() {
  player.x = game.spawnX;
  player.y = 246;
  player.vx = 0;
  player.vy = 0;
  player.onGround = false;
  player.facing = 1;
  player.health = 5;
  player.invuln = 0;
  player.attackCooldown = 0;
  player.attackArc = 0;
  player.trail = [];

  particles.length = 0;
  projectiles.length = 0;
  enemies.length = 0;
  shards.length = 0;
  scenery.length = 0;

  buildLevel();
  updateHud();
}

function buildLevel() {
  for (let i = 0; i < 12; i++) {
    scenery.push({
      x: 80 + i * 120,
      y: 100 + (i % 3) * 26,
      size: 20 + (i % 5) * 8,
      color: i % 2 === 0 ? '#ffd166' : '#ff7ea8',
      alpha: 0.2 + (i % 4) * 0.11,
    });
  }

  for (let i = 0; i < 5; i++) {
    shards.push({
      x: 180 + i * 150,
      y: i % 2 === 0 ? 250 : 160,
      r: 12,
      collected: false,
      pulse: Math.random() * Math.PI * 2,
    });
  }

  enemies.push(
    { x: 300, y: 330, w: 32, h: 42, vx: 90, minX: 250, maxX: 420, alive: true },
    { x: 540, y: 330, w: 32, h: 42, vx: -100, minX: 480, maxX: 640, alive: true },
    { x: 710, y: 330, w: 32, h: 42, vx: 110, minX: 660, maxX: 840, alive: true },
  );
}

function spawnBurst(x, y, color, amount = 14) {
  for (let i = 0; i < amount; i++) {
    particles.push({
      x,
      y,
      vx: (Math.random() - 0.5) * 320,
      vy: (Math.random() - 0.7) * 220,
      life: 0.8 + Math.random() * 0.8,
      color,
      radius: 3 + Math.random() * 3,
    });
  }
}

function spawnProjectile(x, y, dir) {
  projectiles.push({
    x,
    y,
    r: 8,
    vx: dir * 420,
    life: 1.2,
  });
}

function updateHud() {
  hudHealth.textContent = `${player.health} ❤️`;
  hudShards.textContent = `${shards.filter((s) => s.collected).length} / ${shards.length} ✨`;
}

function lowerHealth(amount) {
  if (player.invuln > 0 || !game.running) return;
  player.health -= amount;
  player.invuln = 1.2;
  game.hurtFlash = 0.45;
  spawnBurst(player.x, player.y, '#f05454', 18);
  if (player.health <= 0) {
    player.health = 0;
    game.running = false;
    overlay.classList.add('visible');
    overlay.querySelector('h1').textContent = 'The Valley Fades';
    overlay.querySelector('.story').textContent = 'The ink blots overtook your colors. Press start to try again.';
    overlay.querySelector('button').textContent = 'Restart Run';
    startButton.focus();
  }
  updateHud();
}

function handleInput() {
  const moveDir = (keys.right ? 1 : 0) - (keys.left ? 1 : 0);
  if (moveDir !== 0) {
    player.vx = moveDir * player.speed;
    player.facing = moveDir;
  } else {
    player.vx *= 0.82;
    if (Math.abs(player.vx) < 5) player.vx = 0;
  }

  if (keys.jump && player.onGround) {
    player.vy = -player.jumpForce;
    player.onGround = false;
    spawnBurst(player.x, player.y + player.h, '#a88cff', 12);
  }

  if (keys.attack && player.attackCooldown <= 0) {
    player.attackCooldown = 0.3;
    player.attackArc = 0.2;
    spawnProjectile(player.x + player.w / 2 + player.facing * 18, player.y + 18, player.facing);
    spawnBurst(player.x + player.w / 2 + player.facing * 16, player.y + 18, '#ffd166', 9);
  }
}

function updatePlayer(dt) {
  handleInput();
  player.vy += world.gravity * dt;
  player.x += player.vx * dt;
  player.y += player.vy * dt;

  const groundTop = world.groundY;
  if (player.y + player.h >= groundTop) {
    player.y = groundTop - player.h;
    player.vy = 0;
    player.onGround = true;
  } else {
    player.onGround = false;
  }

  player.x = Math.max(40, Math.min(world.width - 50, player.x));

  if (player.attackCooldown > 0) player.attackCooldown -= dt;
  if (player.attackArc > 0) player.attackArc -= dt;
  if (player.invuln > 0) player.invuln -= dt;

  player.trail.push({ x: player.x, y: player.y, life: 0.18 });
  player.trail = player.trail.filter((p) => {
    p.life -= dt;
    return p.life > 0;
  });
}

function updateEnemies(dt) {
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    enemy.x += enemy.vx * dt;
    if (enemy.x < enemy.minX || enemy.x > enemy.maxX) {
      enemy.vx *= -1;
      enemy.x = Math.max(enemy.minX, Math.min(enemy.maxX, enemy.x));
    }

    const overlapX = Math.abs(enemy.x - player.x) < (enemy.w + player.w) / 2;
    const overlapY = Math.abs(enemy.y - player.y) < (enemy.h + player.h) / 2;
    if (overlapX && overlapY) {
      lowerHealth(1);
      player.x = Math.max(80, player.x - 80 * player.facing);
      enemy.x += 20 * (player.x < enemy.x ? -1 : 1);
    }
  }
}

function updateProjectiles(dt) {
  for (let i = projectiles.length - 1; i >= 0; i--) {
    const p = projectiles[i];
    p.x += p.vx * dt;
    p.life -= dt;

    let hit = false;
    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      const dx = p.x - (enemy.x + enemy.w / 2);
      const dy = p.y - (enemy.y + enemy.h / 2);
      if (Math.abs(dx) < 18 && Math.abs(dy) < 20) {
        enemy.alive = false;
        spawnBurst(enemy.x + enemy.w / 2, enemy.y + enemy.h / 2, '#77d98c', 18);
        hit = true;
        break;
      }
    }

    if (hit || p.life <= 0 || p.x < 0 || p.x > world.width) {
      projectiles.splice(i, 1);
    }
  }
}

function updateShards(dt) {
  for (const shard of shards) {
    if (shard.collected) continue;
    shard.pulse += dt * 4;
    const dx = player.x + player.w / 2 - shard.x;
    const dy = player.y + player.h / 2 - shard.y;
    const dist = Math.hypot(dx, dy);

    if (dist < 30) {
      shard.collected = true;
      spawnBurst(shard.x, shard.y, '#ffd166', 22);
      updateHud();
      if (shards.every((item) => item.collected)) {
        game.levelPassed = true;
      }
    }
  }
}

function updateParticles(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 180 * dt;
    p.life -= dt;
    if (p.life <= 0) particles.splice(i, 1);
  }
}

function updatePortal() {
  const dx = player.x + player.w / 2 - game.winPortal.x;
  const dy = player.y + player.h / 2 - game.winPortal.y;
  const dist = Math.hypot(dx, dy);
  if (dist < 54 && game.levelPassed && !game.levelComplete) {
    game.levelComplete = true;
    game.running = false;
    overlay.classList.add('visible');
    overlay.querySelector('h1').textContent = 'Color Restored';
    overlay.querySelector('.story').textContent = 'The valley wakes again. You gathered every glowing shard and opened the portal.';
    overlay.querySelector('button').textContent = 'Play Again';
    startButton.focus();
  }
}

function drawBackground() {
  ctx.fillStyle = '#8ed4ff';
  ctx.fillRect(0, 0, world.width, world.height);

  ctx.fillStyle = '#ffd76d';
  ctx.beginPath();
  ctx.arc(800, 90, 46, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = '#b7ecff';
  for (const sc of scenery) {
    ctx.globalAlpha = sc.alpha;
    ctx.fillStyle = sc.color;
    ctx.beginPath();
    ctx.arc(sc.x - game.cameraX * 0.15, sc.y, sc.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = '#7ccf6e';
  ctx.fillRect(0, 390, world.width, 150);
  ctx.fillStyle = '#4d7c52';
  ctx.fillRect(0, 390, world.width, 18);

  ctx.fillStyle = '#8e7ce6';
  ctx.fillRect(760, 170, 90, 220);
  ctx.fillStyle = '#ff88b5';
  ctx.fillRect(770, 180, 18, 200);
  ctx.fillRect(820, 180, 18, 200);
}

function drawGround() {
  ctx.fillStyle = '#7ad889';
  ctx.fillRect(0, 390, world.width, 150);
  ctx.fillStyle = '#6cb972';
  for (let i = 0; i < 30; i++) {
    ctx.fillRect(i * 35, 390 + (i % 4) * 4, 18, 8);
  }
}

function drawPlayer() {
  const x = player.x;
  const y = player.y;

  if (player.trail.length > 0) {
    for (let i = 0; i < player.trail.length; i++) {
      const p = player.trail[i];
      ctx.globalAlpha = p.life / 0.18;
      ctx.fillStyle = '#f3d5b2';
      ctx.fillRect(p.x, p.y, player.w, player.h);
    }
    ctx.globalAlpha = 1;
  }

  ctx.fillStyle = player.invuln > 0 ? '#fff9da' : '#f4d6b0';
  ctx.fillRect(x, y, player.w, player.h);

  ctx.fillStyle = '#2b2125';
  ctx.fillRect(x + 8, y + 8, 6, 6);
  ctx.fillRect(x + 20, y + 8, 6, 6);

  ctx.strokeStyle = '#2b2125';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(x + 9, y + 34);
  ctx.lineTo(x + 17, y + 30);
  ctx.moveTo(x + 25, y + 34);
  ctx.lineTo(x + 17, y + 30);
  ctx.stroke();

  if (player.attackArc > 0) {
    ctx.strokeStyle = '#ffd166';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(x + player.w / 2 + player.facing * 16, y + 18, 18, -Math.PI / 3, Math.PI / 3);
    ctx.stroke();
  }
}

function drawEnemies() {
  for (const enemy of enemies) {
    if (!enemy.alive) continue;
    ctx.fillStyle = '#2f3650';
    ctx.fillRect(enemy.x, enemy.y, enemy.w, enemy.h);
    ctx.fillStyle = '#8b9ae8';
    ctx.fillRect(enemy.x + 4, enemy.y + 10, enemy.w - 8, 12);
    ctx.fillStyle = '#1d2231';
    ctx.fillRect(enemy.x + 6, enemy.y + 20, 7, 7);
    ctx.fillRect(enemy.x + 20, enemy.y + 20, 7, 7);
  }
}

function drawShards() {
  for (const shard of shards) {
    if (shard.collected) continue;
    const bob = Math.sin(shard.pulse) * 5;
    ctx.fillStyle = '#ffd166';
    ctx.beginPath();
    ctx.moveTo(shard.x, shard.y - 12 - bob);
    ctx.lineTo(shard.x + 9, shard.y - bob);
    ctx.lineTo(shard.x, shard.y + 12 - bob);
    ctx.lineTo(shard.x - 9, shard.y - bob);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = '#fff2a5';
    ctx.fillRect(shard.x - 2, shard.y - 15 - bob, 4, 28);
  }
}

function drawProjectiles() {
  for (const p of projectiles) {
    ctx.fillStyle = '#ff9f43';
    ctx.beginPath();
    ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawParticles() {
  for (const p of particles) {
    ctx.globalAlpha = Math.max(0, p.life);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.radius, p.radius);
  }
  ctx.globalAlpha = 1;
}

function drawPortal() {
  const x = game.winPortal.x;
  const y = game.winPortal.y;
  const glow = 0.5 + Math.sin(game.time * 5) * 0.5;
  ctx.fillStyle = `rgba(168, 140, 255, ${0.25 + glow * 0.5})`;
  ctx.beginPath();
  ctx.arc(x, y, 62, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = '#f2e8ff';
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(x, y, 48, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#ffd166';
  ctx.fillRect(x - 14, y - 32, 28, 64);
}

function render() {
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  drawBackground();
  drawGround();
  drawPortal();
  drawShards();
  drawEnemies();
  drawProjectiles();
  drawPlayer();
  drawParticles();

  if (game.hurtFlash > 0) {
    ctx.fillStyle = `rgba(240, 84, 84, ${game.hurtFlash})`;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }
}

function gameLoop(ts) {
  const dt = Math.min(0.033, (ts - (gameLoop.last || ts)) / 1000);
  gameLoop.last = ts;
  game.time += dt;
  game.hurtFlash = Math.max(0, game.hurtFlash - dt * 2.2);

  if (game.started && game.running) {
    updatePlayer(dt);
    updateEnemies(dt);
    updateProjectiles(dt);
    updateShards(dt);
    updatePortal();
    updateParticles(dt);
    game.cameraX = player.x - 220;
  }

  render();
  requestAnimationFrame(gameLoop);
}

function startGame() {
  resetState();
  game.started = true;
  game.running = true;
  game.levelPassed = false;
  game.levelComplete = false;
  overlay.classList.remove('visible');
}

function bindInput() {
  window.addEventListener('keydown', (event) => {
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') keys.left = true;
    if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') keys.right = true;
    if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w' || event.code === 'Space') keys.jump = true;
    if (event.key.toLowerCase() === 'j' || event.key.toLowerCase() === 'k' || event.key.toLowerCase() === 'x') keys.attack = true;
    if (event.code === 'Space') event.preventDefault();
  });

  window.addEventListener('keyup', (event) => {
    if (event.key === 'ArrowLeft' || event.key.toLowerCase() === 'a') keys.left = false;
    if (event.key === 'ArrowRight' || event.key.toLowerCase() === 'd') keys.right = false;
    if (event.key === 'ArrowUp' || event.key.toLowerCase() === 'w' || event.code === 'Space') keys.jump = false;
    if (event.key.toLowerCase() === 'j' || event.key.toLowerCase() === 'k' || event.key.toLowerCase() === 'x') keys.attack = false;
  });

  document.querySelectorAll('[data-key]').forEach((button) => {
    const key = button.dataset.key;
    const press = (active) => {
      keys[key] = active;
      if (active && key === 'jump') {
        button.style.transform = 'scale(0.96)';
      } else {
        button.style.transform = '';
      }
    };

    button.addEventListener('pointerdown', () => press(true));
    button.addEventListener('pointerup', () => press(false));
    button.addEventListener('pointerleave', () => press(false));
    button.addEventListener('pointercancel', () => press(false));
  });

  startButton.addEventListener('click', () => {
    startGame();
  });
}

bindInput();
resetState();
requestAnimationFrame(gameLoop);
