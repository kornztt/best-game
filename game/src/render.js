// All canvas drawing. One clear job: turn a world state into a frame —
// arena, entities, particles, HUD, and every screen (title, upgrade,
// pause, game over). Nothing here changes the world.

import { ARENA, PALETTE, PLAYER } from './config.js';
import { SCREEN_TITLE, SCREEN_UPGRADE, SCREEN_OVER, SCREEN_PAUSED } from './world.js';

function glow(ctx, color, blur) {
  ctx.shadowColor = color;
  ctx.shadowBlur = blur;
}

function noGlow(ctx) {
  ctx.shadowBlur = 0;
}

function drawPolygon(ctx, x, y, radius, sides, rotation) {
  ctx.beginPath();
  for (let i = 0; i < sides; i += 1) {
    const a = rotation + (i / sides) * Math.PI * 2;
    const px = x + Math.cos(a) * radius;
    const py = y + Math.sin(a) * radius;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

function drawBackground(ctx, world) {
  ctx.fillStyle = PALETTE.background;
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);

  // Twinkling stars.
  for (const s of world.stars) {
    const a = 0.25 + 0.55 * Math.abs(Math.sin(s.twinkle));
    ctx.globalAlpha = a;
    ctx.fillStyle = '#cfe8ff';
    ctx.fillRect(s.x, s.y, s.size, s.size);
  }
  ctx.globalAlpha = 1;

  // Neon grid.
  ctx.strokeStyle = PALETTE.grid;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 0; x <= ARENA.width; x += 64) {
    ctx.moveTo(x, 0);
    ctx.lineTo(x, ARENA.height);
  }
  for (let y = 0; y <= ARENA.height; y += 64) {
    ctx.moveTo(0, y);
    ctx.lineTo(ARENA.width, y);
  }
  ctx.stroke();

  // Arena border.
  ctx.strokeStyle = PALETTE.border;
  ctx.lineWidth = 2;
  glow(ctx, PALETTE.border, 14);
  ctx.strokeRect(6, 6, ARENA.width - 12, ARENA.height - 12);
  noGlow(ctx);
}

function drawPlayer(ctx, world) {
  const p = world.player;
  if (!p.alive) return;
  if (p.invulnerable > 0 && Math.floor(world.time * 14) % 2 === 0) return; // blink
  ctx.save();
  ctx.translate(p.x, p.y);
  ctx.rotate(p.angle);
  glow(ctx, PALETTE.player, 18);
  ctx.fillStyle = PALETTE.player;
  ctx.beginPath();
  ctx.moveTo(20, 0);
  ctx.lineTo(-12, -12);
  ctx.lineTo(-6, 0);
  ctx.lineTo(-12, 12);
  ctx.closePath();
  ctx.fill();
  noGlow(ctx);
  ctx.fillStyle = PALETTE.playerCore;
  ctx.beginPath();
  ctx.arc(2, 0, 4, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  // Aim reticle at the mouse is drawn by the caller (needs input); here we
  // draw a small direction tick instead.
  ctx.save();
  ctx.strokeStyle = PALETTE.player;
  ctx.globalAlpha = 0.5;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(p.x + Math.cos(p.angle) * 24, p.y + Math.sin(p.angle) * 24);
  ctx.lineTo(p.x + Math.cos(p.angle) * 32, p.y + Math.sin(p.angle) * 32);
  ctx.stroke();
  ctx.restore();
}

function drawEnemy(ctx, e) {
  ctx.save();
  ctx.translate(e.x, e.y);
  glow(ctx, e.color, 16);
  ctx.fillStyle = e.color;
  const rotation = e.kind === 'shooter' ? e.spin * 0.6 : e.angle;
  drawPolygon(ctx, 0, 0, e.radius, e.sides, rotation);
  ctx.fill();
  noGlow(ctx);
  // Dark core + hp arc for tougher enemies.
  ctx.fillStyle = 'rgba(5,6,15,0.85)';
  ctx.beginPath();
  ctx.arc(0, 0, e.radius * 0.45, 0, Math.PI * 2);
  ctx.fill();
  if (e.maxHp && e.hp < e.maxHp) {
    ctx.strokeStyle = '#ffffff';
    ctx.globalAlpha = 0.8;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.arc(0, 0, e.radius + 5, -Math.PI / 2, -Math.PI / 2 + (e.hp / e.maxHp) * Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
  ctx.restore();
}

function drawBullets(ctx, world) {
  for (const b of world.bullets) {
    glow(ctx, PALETTE.bullet, 10);
    ctx.fillStyle = PALETTE.bullet;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  for (const b of world.enemyBullets) {
    glow(ctx, PALETTE.enemyBullet, 10);
    ctx.fillStyle = PALETTE.enemyBullet;
    ctx.beginPath();
    ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
    ctx.fill();
  }
  noGlow(ctx);
}

function drawParticles(ctx, world) {
  for (const pt of world.particles) {
    ctx.globalAlpha = Math.max(0, pt.life / pt.maxLife);
    ctx.fillStyle = pt.color;
    ctx.fillRect(pt.x - pt.size / 2, pt.y - pt.size / 2, pt.size, pt.size);
  }
  ctx.globalAlpha = 1;
}

function drawFloatTexts(ctx, world) {
  ctx.textAlign = 'center';
  for (const t of world.texts) {
    ctx.globalAlpha = Math.max(0, t.life / t.maxLife);
    ctx.font = `bold ${t.size}px "Segoe UI", system-ui, sans-serif`;
    ctx.fillStyle = t.color;
    glow(ctx, t.color, 8);
    ctx.fillText(t.text, t.x, t.y);
  }
  ctx.globalAlpha = 1;
  noGlow(ctx);
}

function bar(ctx, x, y, w, h, frac, color, bg = 'rgba(255,255,255,0.12)') {
  ctx.fillStyle = bg;
  ctx.fillRect(x, y, w, h);
  ctx.fillStyle = color;
  ctx.fillRect(x, y, w * Math.max(0, Math.min(1, frac)), h);
}

function drawHud(ctx, world) {
  const p = world.player;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'alphabetic';

  // Health.
  ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('HULL', 24, 34);
  const hpColor = p.health / p.maxHealth > 0.5 ? '#39ff6a' : p.health / p.maxHealth > 0.25 ? '#ffb52e' : PALETTE.danger;
  glow(ctx, hpColor, 8);
  bar(ctx, 24, 42, 220, 12, p.health / p.maxHealth, hpColor);
  noGlow(ctx);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 16px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`${Math.ceil(p.health)} / ${p.maxHealth}`, 252, 54);

  // Heat.
  ctx.font = 'bold 13px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(p.overheated ? 'OVERHEATED!' : 'HEAT', 24, 78);
  const heatColor = p.overheated ? PALETTE.danger : '#ff9f1c';
  bar(ctx, 24, 84, 220, 8, p.heat / PLAYER.overheatAt, heatColor);

  // Score, combo, wave — top right.
  ctx.textAlign = 'right';
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 30px "Segoe UI", system-ui, sans-serif';
  glow(ctx, PALETTE.bullet, 10);
  ctx.fillText(String(world.score).padStart(6, '0'), ARENA.width - 24, 52);
  noGlow(ctx);
  ctx.font = 'bold 15px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = world.combo > 1 ? '#ffe95e' : PALETTE.muted;
  ctx.fillText(world.combo > 1 ? `COMBO x${(1 + Math.min(world.combo, 20) * 0.1).toFixed(1)}  (${world.combo})` : 'NO COMBO', ARENA.width - 24, 76);
  ctx.fillStyle = PALETTE.text;
  ctx.font = 'bold 20px "Segoe UI", system-ui, sans-serif';
  ctx.fillText(`WAVE ${world.wave}`, ARENA.width - 24, 106);
  ctx.font = '13px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = PALETTE.muted;
  const left = world.spawnQueue.length + world.enemies.length;
  ctx.fillText(left > 0 ? `${left} HOSTILES LEFT` : 'WAVE CLEAR', ARENA.width - 24, 126);

  // Bottom-left: projectiles / firepower readout.
  ctx.textAlign = 'left';
  ctx.font = '13px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(`DMG ${Math.round(p.bulletDamage)}   SHOTS x${p.projectiles}   BEST ${world.best}`, 24, ARENA.height - 20);

  // Wave banner.
  if (world.waveBanner > 0) {
    const a = Math.min(1, world.waveBanner);
    ctx.globalAlpha = a;
    ctx.textAlign = 'center';
    ctx.font = 'bold 54px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = PALETTE.border;
    glow(ctx, PALETTE.border, 24);
    ctx.fillText(world.waveBannerText, ARENA.width / 2, ARENA.height / 2 - 40);
    noGlow(ctx);
    ctx.globalAlpha = 1;
  }
}

/** The three upgrade cards' rectangles, shared by drawing and click hits. */
export function upgradeCardRects() {
  const cardW = 300;
  const cardH = 240;
  const gap = 36;
  const totalW = cardW * 3 + gap * 2;
  const startX = (ARENA.width - totalW) / 2;
  const y = 230;
  return [0, 1, 2].map((i) => ({ x: startX + i * (cardW + gap), y, w: cardW, h: cardH }));
}

function panel(ctx, x, y, w, h) {
  ctx.fillStyle = 'rgba(5, 8, 24, 0.82)';
  ctx.fillRect(x, y, w, h);
  ctx.strokeStyle = PALETTE.upgradeBorder;
  ctx.lineWidth = 2;
  glow(ctx, PALETTE.upgradeBorder, 12);
  ctx.strokeRect(x, y, w, h);
  noGlow(ctx);
}

function drawTitle(ctx, world) {
  ctx.fillStyle = 'rgba(5, 6, 15, 0.55)';
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  ctx.textAlign = 'center';

  ctx.font = 'bold 92px "Segoe UI", system-ui, sans-serif';
  glow(ctx, PALETTE.player, 30);
  ctx.fillStyle = '#00f0ff';
  ctx.fillText('NEON', ARENA.width / 2, 240);
  ctx.fillStyle = '#ff2d78';
  glow(ctx, PALETTE.chaser, 30);
  ctx.fillText('SURGE', ARENA.width / 2, 330);
  noGlow(ctx);

  ctx.font = '20px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = PALETTE.text;
  ctx.fillText('Survive the waves. Chain the combo. Pick your power.', ARENA.width / 2, 380);

  ctx.font = '17px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('WASD / ARROWS — move      MOUSE — aim      HOLD CLICK — fire', ARENA.width / 2, 440);
  ctx.fillText('Clear a wave to choose 1 upgrade. Overheat locks your gun — let it cool.', ARENA.width / 2, 470);
  ctx.fillText('P — pause      M — mute', ARENA.width / 2, 500);

  ctx.font = 'bold 26px "Segoe UI", system-ui, sans-serif';
  const pulse = 0.65 + 0.35 * Math.sin(world.time * 4);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#ffe95e';
  glow(ctx, '#ffe95e', 16);
  ctx.fillText('— CLICK TO START —', ARENA.width / 2, 570);
  noGlow(ctx);
  ctx.globalAlpha = 1;

  if (world.best > 0) {
    ctx.font = '18px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(`BEST SCORE  ${world.best}`, ARENA.width / 2, 620);
  }
}

function drawUpgrade(ctx, world) {
  ctx.fillStyle = 'rgba(5, 6, 15, 0.6)';
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  ctx.textAlign = 'center';

  ctx.font = 'bold 44px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#ffe95e';
  glow(ctx, '#ffe95e', 18);
  ctx.fillText(`WAVE ${world.wave} CLEAR`, ARENA.width / 2, 130);
  noGlow(ctx);
  ctx.font = '20px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = PALETTE.text;
  ctx.fillText('Choose one upgrade — press 1, 2 or 3, or click a card', ARENA.width / 2, 170);

  const cardW = 300;
  const cardH = 240;
  const gap = 36;
  const totalW = cardW * 3 + gap * 2;
  const startX = (ARENA.width - totalW) / 2;
  const y = 230;
  world.offered.forEach((up, i) => {
    const x = startX + i * (cardW + gap);
    panel(ctx, x, y, cardW, cardH);
    ctx.font = '44px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = PALETTE.player;
    glow(ctx, PALETTE.player, 14);
    ctx.fillText(up.icon, x + cardW / 2, y + 78);
    noGlow(ctx);
    ctx.font = 'bold 22px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = PALETTE.text;
    ctx.fillText(up.name, x + cardW / 2, y + 128);
    ctx.font = '17px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = PALETTE.muted;
    ctx.fillText(up.blurb, x + cardW / 2, y + 164);
    ctx.font = 'bold 18px "Segoe UI", system-ui, sans-serif';
    ctx.fillStyle = '#ffe95e';
    ctx.fillText(`[ ${i + 1} ]`, x + cardW / 2, y + 205);
  });

  ctx.font = '16px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText(`SCORE ${world.score}    •    NEXT: WAVE ${world.wave + 1}`, ARENA.width / 2, 540);
}

function drawGameOver(ctx, world) {
  ctx.fillStyle = 'rgba(5, 6, 15, 0.62)';
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  ctx.textAlign = 'center';

  ctx.font = 'bold 72px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = PALETTE.danger;
  glow(ctx, PALETTE.danger, 26);
  ctx.fillText('SIGNAL LOST', ARENA.width / 2, 250);
  noGlow(ctx);

  ctx.font = '22px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = PALETTE.text;
  ctx.fillText(`You fell on WAVE ${world.wave}  •  ${world.kills} kills  •  best combo x${(1 + Math.min(world.comboBest, 20) * 0.1).toFixed(1)}`, ARENA.width / 2, 310);

  ctx.font = 'bold 40px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = '#ffe95e';
  glow(ctx, '#ffe95e', 16);
  ctx.fillText(`SCORE  ${world.score}`, ARENA.width / 2, 380);
  noGlow(ctx);

  ctx.font = '18px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = world.score >= world.best && world.score > 0 ? '#39ff6a' : PALETTE.muted;
  ctx.fillText(world.score >= world.best && world.score > 0 ? '★ NEW BEST SCORE ★' : `BEST  ${world.best}`, ARENA.width / 2, 420);

  ctx.font = 'bold 24px "Segoe UI", system-ui, sans-serif';
  const pulse = 0.65 + 0.35 * Math.sin(world.time * 4);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = PALETTE.player;
  glow(ctx, PALETTE.player, 14);
  ctx.fillText('— PRESS R OR CLICK TO RESTART —', ARENA.width / 2, 500);
  noGlow(ctx);
  ctx.globalAlpha = 1;
}

function drawPaused(ctx) {
  ctx.fillStyle = 'rgba(5, 6, 15, 0.6)';
  ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  ctx.textAlign = 'center';
  ctx.font = 'bold 56px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = PALETTE.text;
  glow(ctx, PALETTE.player, 20);
  ctx.fillText('PAUSED', ARENA.width / 2, ARENA.height / 2 - 10);
  noGlow(ctx);
  ctx.font = '18px "Segoe UI", system-ui, sans-serif';
  ctx.fillStyle = PALETTE.muted;
  ctx.fillText('P or Esc to resume  •  R to restart the run', ARENA.width / 2, ARENA.height / 2 + 40);
}

/** Draw one frame. `input` is only used for the aim reticle. */
export function render(ctx, world, input) {
  ctx.save();
  if (world.shake > 0) {
    ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
  }
  drawBackground(ctx, world);
  for (const e of world.enemies) drawEnemy(ctx, e);
  drawBullets(ctx, world);
  drawPlayer(ctx, world);
  drawParticles(ctx, world);
  drawFloatTexts(ctx, world);
  ctx.restore();

  // Damage flash.
  if (world.flash > 0) {
    ctx.fillStyle = `rgba(255, 59, 92, ${world.flash * 0.9})`;
    ctx.fillRect(0, 0, ARENA.width, ARENA.height);
  }

  if (world.screen === SCREEN_TITLE) {
    drawTitle(ctx, world);
  } else if (world.screen === SCREEN_UPGRADE) {
    drawHud(ctx, world);
    drawUpgrade(ctx, world);
  } else if (world.screen === SCREEN_OVER) {
    drawHud(ctx, world);
    drawGameOver(ctx, world);
  } else if (world.screen === SCREEN_PAUSED) {
    drawHud(ctx, world);
    drawPaused(ctx);
  } else {
    drawHud(ctx, world);
    // Aim reticle.
    if (input) {
      ctx.strokeStyle = 'rgba(0, 240, 255, 0.9)';
      ctx.lineWidth = 2;
      const r = 12;
      ctx.beginPath();
      ctx.arc(input.mouseX, input.mouseY, r, 0, Math.PI * 2);
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(input.mouseX - r - 5, input.mouseY);
      ctx.lineTo(input.mouseX - r + 3, input.mouseY);
      ctx.moveTo(input.mouseX + r - 3, input.mouseY);
      ctx.lineTo(input.mouseX + r + 5, input.mouseY);
      ctx.moveTo(input.mouseX, input.mouseY - r - 5);
      ctx.lineTo(input.mouseX, input.mouseY - r + 3);
      ctx.moveTo(input.mouseX, input.mouseY + r - 3);
      ctx.lineTo(input.mouseX, input.mouseY + r + 5);
      ctx.stroke();
    }
  }
}
