import { statsFromUpgrades } from './upgrades';
import type { FlightMode, FlightResult, Obstacle, UpgradeId } from './types';

export interface EngineInput {
  up: boolean;
  down: boolean;
  block: boolean;
}

export interface EngineState {
  phase: 'ready' | 'charging' | 'flying' | 'ended';
  charge: number;
  planeX: number;
  planeY: number;
  vx: number;
  vy: number;
  fuel: number;
  fuelMax: number;
  distance: number;
  worldScroll: number;
  blocksLeft: number;
  blockedCount: number;
  invuln: number;
  hillY: number;
  groundY: number;
  obstacles: Obstacle[];
  mode: FlightMode;
  crashed: boolean;
  time: number;
  trail: { x: number; y: number }[];
}

let nextObstacleId = 1;

export function createEngine(
  upgrades: Record<UpgradeId, number>,
  mode: FlightMode,
  canvasH: number,
): EngineState {
  const stats = statsFromUpgrades(upgrades);
  const groundY = canvasH * 0.82;
  const hillY = groundY - 90;

  return {
    phase: 'ready',
    charge: 0,
    planeX: 110,
    planeY: hillY - 18,
    vx: 0,
    vy: 0,
    fuel: stats.fuelMax,
    fuelMax: stats.fuelMax,
    distance: 0,
    worldScroll: 0,
    blocksLeft: stats.blockCharges,
    blockedCount: 0,
    invuln: 0,
    hillY,
    groundY,
    obstacles: [],
    mode,
    crashed: false,
    time: 0,
    trail: [],
  };
}

export function startCharge(state: EngineState): void {
  if (state.phase === 'ready') {
    state.phase = 'charging';
    state.charge = 0.15;
  }
}

export function releaseLaunch(
  state: EngineState,
  upgrades: Record<UpgradeId, number>,
): void {
  if (state.phase !== 'charging') return;
  const stats = statsFromUpgrades(upgrades);
  const power = 0.45 + state.charge * 0.55;
  const angle = -0.55 - state.charge * 0.25;
  state.vx = Math.cos(angle) * stats.thrust * 2.8 * power;
  state.vy = Math.sin(angle) * stats.thrust * 2.8 * power;
  state.phase = 'flying';
}

function spawnObstacle(state: EngineState, canvasW: number): void {
  if (state.mode !== 'record') return;
  if (state.distance < 80) return;

  const kinds: Obstacle['kind'][] = ['bird', 'balloon', 'cloud'];
  const kind = kinds[Math.floor(Math.random() * kinds.length)];
  const sizes = {
    bird: { w: 36, h: 22 },
    balloon: { w: 28, h: 44 },
    cloud: { w: 70, h: 36 },
  };
  const size = sizes[kind];
  const minY = 40;
  const maxY = state.groundY - 80;

  state.obstacles.push({
    id: nextObstacleId++,
    x: canvasW + 40 + Math.random() * 80,
    y: minY + Math.random() * (maxY - minY),
    w: size.w,
    h: size.h,
    kind,
    vy: kind === 'bird' ? (Math.random() - 0.5) * 1.4 : kind === 'balloon' ? -0.35 : 0,
    hit: false,
  });
}

function rectsOverlap(
  ax: number,
  ay: number,
  aw: number,
  ah: number,
  bx: number,
  by: number,
  bw: number,
  bh: number,
): boolean {
  return ax < bx + bw && ax + aw > bx && ay < by + bh && ay + ah > by;
}

export function tick(
  state: EngineState,
  upgrades: Record<UpgradeId, number>,
  input: EngineInput,
  dt: number,
  canvasW: number,
  canvasH: number,
): FlightResult | null {
  const stats = statsFromUpgrades(upgrades);
  state.groundY = canvasH * 0.82;
  state.time += dt;

  if (state.phase === 'charging') {
    state.charge = Math.min(1, state.charge + dt * 0.7);
    return null;
  }

  if (state.phase !== 'flying') return null;

  // Steering
  if (input.up) state.vy -= stats.climbRate * 18 * dt;
  if (input.down) state.vy += stats.climbRate * 18 * dt;

  // Thrust while fuel remains
  if (state.fuel > 0) {
    state.fuel = Math.max(0, state.fuel - dt);
    state.vx += stats.thrust * 0.35 * dt;
  } else {
    state.vx *= 1 - 0.08 * dt;
    state.vy += 28 * dt; // gravity when out of fuel
  }

  // Mild gravity always
  state.vy += 9 * dt;
  state.vx = Math.min(stats.maxSpeed, Math.max(1.2, state.vx));
  state.vy = Math.max(-5.5, Math.min(6.5, state.vy));

  // Move plane mostly fixed in X; scroll world
  const scroll = state.vx * 55 * dt;
  state.worldScroll += scroll;
  state.distance = state.worldScroll / 8;
  state.planeY += state.vy * 55 * dt;

  // Clamp top
  if (state.planeY < 28) {
    state.planeY = 28;
    state.vy = Math.max(0, state.vy);
  }

  state.trail.push({ x: state.planeX - 8, y: state.planeY });
  if (state.trail.length > 18) state.trail.shift();
  for (const p of state.trail) p.x -= scroll * 0.85;

  // Obstacles
  if (state.mode === 'record') {
    const spawnChance = 0.012 + Math.min(0.03, state.distance / 8000);
    if (Math.random() < spawnChance * (dt * 60)) {
      spawnObstacle(state, canvasW);
    }
  }

  for (const o of state.obstacles) {
    o.x -= scroll;
    o.y += o.vy * 55 * dt;
    if (o.kind === 'balloon' && o.y < 20) o.vy = Math.abs(o.vy);
    if (o.kind === 'bird') {
      if (o.y < 30 || o.y > state.groundY - 60) o.vy *= -1;
    }
  }
  state.obstacles = state.obstacles.filter((o) => o.x > -100 && !o.hit);

  state.invuln = Math.max(0, state.invuln - dt);

  const pw = 44;
  const ph = 22;
  const px = state.planeX - pw * 0.35;
  const py = state.planeY - ph * 0.5;

  let blockedThisFrame = false;
  if (input.block && state.blocksLeft > 0 && state.invuln <= 0) {
    blockedThisFrame = true;
  }

  for (const o of state.obstacles) {
    if (o.hit) continue;
    if (!rectsOverlap(px, py, pw, ph, o.x, o.y, o.w, o.h)) continue;

    if (blockedThisFrame || state.invuln > 0) {
      o.hit = true;
      if (blockedThisFrame && state.blocksLeft > 0) {
        state.blocksLeft -= 1;
        state.blockedCount += 1;
        state.invuln = 0.55;
        blockedThisFrame = false;
      }
      continue;
    }

    // Hit without block
    state.crashed = true;
    state.phase = 'ended';
    return finish(state, upgrades);
  }

  // Landing / crash on ground
  if (state.planeY + ph * 0.4 >= state.groundY) {
    state.planeY = state.groundY - ph * 0.4;
    const hardHit = state.vy > 4.2;
    if (hardHit) {
      state.crashed = true;
      state.phase = 'ended';
      return finish(state, upgrades);
    }
    // Skid / soft touchdown
    state.vy = Math.min(0, state.vy);
    state.vx *= 0.9;
    if (state.vx < 1.6 || state.fuel <= 0) {
      state.phase = 'ended';
      state.crashed = false;
      return finish(state, upgrades);
    }
  }

  // Safety end if somehow stuck
  if (state.distance > 50000) {
    state.phase = 'ended';
    return finish(state, upgrades);
  }

  return null;
}

function finish(
  state: EngineState,
  upgrades: Record<UpgradeId, number>,
): FlightResult {
  const stats = statsFromUpgrades(upgrades);
  const dist = Math.floor(state.distance);
  const base = dist * 0.35;
  const modeBonus = state.mode === 'record' ? 1.45 : 1;
  const crashPenalty = state.crashed ? 0.65 : 1;
  const earnings = Math.floor(base * stats.moneyMult * modeBonus * crashPenalty);

  return {
    distance: dist,
    earnings: Math.max(0, earnings),
    mode: state.mode,
    isRecord: false,
    crashed: state.crashed,
    blocked: state.blockedCount,
  };
}

export function drawScene(
  ctx: CanvasRenderingContext2D,
  state: EngineState,
  w: number,
  h: number,
  chargeHeld: boolean,
): void {
  // Sky gradient
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#063642');
  sky.addColorStop(0.45, '#1A6B7C');
  sky.addColorStop(0.78, '#7EB8C4');
  sky.addColorStop(1, '#D4A574');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  // Sun
  const sunX = w * 0.78;
  const sunY = h * 0.22;
  const sunGrad = ctx.createRadialGradient(sunX, sunY, 4, sunX, sunY, 90);
  sunGrad.addColorStop(0, 'rgba(255, 214, 120, 0.95)');
  sunGrad.addColorStop(0.4, 'rgba(240, 180, 80, 0.35)');
  sunGrad.addColorStop(1, 'rgba(240, 180, 80, 0)');
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(sunX, sunY, 90, 0, Math.PI * 2);
  ctx.fill();

  // Distant hills parallax
  drawHills(ctx, w, state.groundY, state.worldScroll * 0.15, '#0E4A52', 0.35);
  drawHills(ctx, w, state.groundY, state.worldScroll * 0.35, '#0A3A44', 0.55);

  // Ground
  ctx.fillStyle = '#1F5C3A';
  ctx.fillRect(0, state.groundY, w, h - state.groundY);
  ctx.fillStyle = '#2E7A4A';
  ctx.fillRect(0, state.groundY, w, 8);

  // Launch hill (only early)
  if (state.worldScroll < 400) {
    const hillOffset = -state.worldScroll;
    ctx.fillStyle = '#245C32';
    ctx.beginPath();
    ctx.moveTo(hillOffset - 40, state.groundY + 4);
    ctx.quadraticCurveTo(
      hillOffset + 70,
      state.hillY - 20,
      hillOffset + 160,
      state.groundY + 4,
    );
    ctx.lineTo(hillOffset - 40, state.groundY + 4);
    ctx.fill();

    // Pilot marker on hill when ready
    if (state.phase === 'ready' || state.phase === 'charging') {
      const px = 110 + hillOffset * 0.05;
      drawPilot(ctx, px - 28, state.hillY - 8);
    }
  }

  // Soft clouds background
  ctx.globalAlpha = 0.25;
  for (let i = 0; i < 5; i++) {
    const cx =
      ((i * 220 - state.worldScroll * 0.2) % (w + 200) + w + 200) % (w + 200) -
      100;
    const cy = 50 + ((i * 67) % 120);
    drawCloudShape(ctx, cx, cy, 50 + (i % 3) * 12, '#E8F4F6');
  }
  ctx.globalAlpha = 1;

  // Trail
  if (state.trail.length > 1) {
    ctx.strokeStyle = 'rgba(240, 180, 41, 0.35)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    state.trail.forEach((p, i) => {
      if (i === 0) ctx.moveTo(p.x, p.y);
      else ctx.lineTo(p.x, p.y);
    });
    ctx.stroke();
  }

  // Obstacles
  for (const o of state.obstacles) {
    if (o.hit) continue;
    drawObstacle(ctx, o);
  }

  // Plane
  if (state.phase !== 'ended' || state.time % 0.2 < 0.1) {
    drawPlane(ctx, state.planeX, state.planeY, state.vy, state.invuln > 0);
  }

  // Charge meter
  if (state.phase === 'charging' || (state.phase === 'ready' && chargeHeld)) {
    const barW = 120;
    const barH = 10;
    const bx = state.planeX - barW / 2;
    const by = state.planeY - 42;
    ctx.fillStyle = 'rgba(0,0,0,0.35)';
    ctx.fillRect(bx, by, barW, barH);
    ctx.fillStyle = '#F0B429';
    ctx.fillRect(bx, by, barW * state.charge, barH);
    ctx.strokeStyle = 'rgba(255,255,255,0.5)';
    ctx.strokeRect(bx, by, barW, barH);
  }

  // Block flash
  if (state.invuln > 0.3) {
    ctx.strokeStyle = `rgba(240, 180, 41, ${state.invuln})`;
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(state.planeX, state.planeY, 34, 0, Math.PI * 2);
    ctx.stroke();
  }
}

function drawHills(
  ctx: CanvasRenderingContext2D,
  w: number,
  groundY: number,
  scroll: number,
  color: string,
  heightFactor: number,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(0, groundY);
  for (let x = 0; x <= w; x += 20) {
    const n =
      Math.sin((x + scroll) * 0.01) * 40 * heightFactor +
      Math.sin((x + scroll) * 0.023) * 22 * heightFactor;
    ctx.lineTo(x, groundY - 60 * heightFactor - n);
  }
  ctx.lineTo(w, groundY + 2);
  ctx.closePath();
  ctx.fill();
}

function drawCloudShape(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  r: number,
  color: string,
): void {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, r * 0.55, 0, Math.PI * 2);
  ctx.arc(x + r * 0.45, y + 4, r * 0.4, 0, Math.PI * 2);
  ctx.arc(x - r * 0.4, y + 6, r * 0.35, 0, Math.PI * 2);
  ctx.fill();
}

function drawPilot(ctx: CanvasRenderingContext2D, x: number, y: number): void {
  ctx.fillStyle = '#1A2A30';
  ctx.fillRect(x - 4, y - 18, 8, 16);
  ctx.beginPath();
  ctx.arc(x, y - 22, 6, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#F0B429';
  ctx.fillRect(x - 6, y - 14, 12, 4);
}

function drawPlane(
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  vy: number,
  shielded: boolean,
): void {
  const angle = Math.atan2(vy, 4) * 0.65;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(angle);

  // Fuselage
  ctx.fillStyle = shielded ? '#FFE08A' : '#E8F4F6';
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 8, 0, 0, Math.PI * 2);
  ctx.fill();

  // Nose
  ctx.fillStyle = '#F0B429';
  ctx.beginPath();
  ctx.moveTo(18, -5);
  ctx.lineTo(32, 0);
  ctx.lineTo(18, 5);
  ctx.closePath();
  ctx.fill();

  // Wing
  ctx.fillStyle = '#1A6B7C';
  ctx.beginPath();
  ctx.moveTo(-4, 0);
  ctx.lineTo(8, 0);
  ctx.lineTo(-2, 16);
  ctx.lineTo(-10, 16);
  ctx.closePath();
  ctx.fill();

  // Tail
  ctx.fillStyle = '#0A3A44';
  ctx.beginPath();
  ctx.moveTo(-22, 0);
  ctx.lineTo(-30, -14);
  ctx.lineTo(-16, -2);
  ctx.closePath();
  ctx.fill();

  // Cockpit
  ctx.fillStyle = '#063642';
  ctx.beginPath();
  ctx.ellipse(8, -3, 7, 4, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawObstacle(ctx: CanvasRenderingContext2D, o: Obstacle): void {
  if (o.kind === 'bird') {
    ctx.strokeStyle = '#1A2A30';
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(o.x, o.y + o.h / 2);
    ctx.quadraticCurveTo(o.x + o.w * 0.35, o.y, o.x + o.w * 0.5, o.y + o.h * 0.4);
    ctx.quadraticCurveTo(
      o.x + o.w * 0.65,
      o.y,
      o.x + o.w,
      o.y + o.h / 2,
    );
    ctx.stroke();
    ctx.fillStyle = '#2A3A40';
    ctx.beginPath();
    ctx.arc(o.x + o.w * 0.5, o.y + o.h * 0.45, 4, 0, Math.PI * 2);
    ctx.fill();
  } else if (o.kind === 'balloon') {
    ctx.fillStyle = '#C45C4A';
    ctx.beginPath();
    ctx.ellipse(o.x + o.w / 2, o.y + o.h * 0.35, o.w * 0.45, o.h * 0.35, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = '#1A2A30';
    ctx.beginPath();
    ctx.moveTo(o.x + o.w / 2, o.y + o.h * 0.7);
    ctx.lineTo(o.x + o.w / 2, o.y + o.h);
    ctx.stroke();
    ctx.fillStyle = '#D4A574';
    ctx.fillRect(o.x + o.w / 2 - 5, o.y + o.h - 6, 10, 6);
  } else {
    ctx.fillStyle = 'rgba(40, 55, 70, 0.85)';
    drawCloudShape(ctx, o.x + o.w / 2, o.y + o.h / 2, o.w * 0.55, 'rgba(40, 55, 70, 0.9)');
    // lightning hint
    ctx.strokeStyle = '#F0B429';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(o.x + o.w * 0.45, o.y + o.h * 0.4);
    ctx.lineTo(o.x + o.w * 0.55, o.y + o.h * 0.55);
    ctx.lineTo(o.x + o.w * 0.48, o.y + o.h * 0.55);
    ctx.lineTo(o.x + o.w * 0.58, o.y + o.h * 0.75);
    ctx.stroke();
  }
}
