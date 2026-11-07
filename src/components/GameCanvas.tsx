import { useEffect, useRef, useState } from 'react';
import {
  createEngine,
  drawScene,
  releaseLaunch,
  startCharge,
  tick,
  type EngineCheats,
  type EngineInput,
  type EngineState,
} from '../game/engine';
import type { FlightMode, FlightResult, UpgradeId } from '../game/types';

const MILESTONES = [250, 500, 1000, 2000, 5000, 10000];

interface Props {
  mode: FlightMode;
  upgrades: Record<UpgradeId, number>;
  cheats?: EngineCheats;
  onFinished: (result: FlightResult) => void;
  onExit: () => void;
  onRestart: () => void;
}

export function GameCanvas({
  mode,
  upgrades,
  cheats,
  onFinished,
  onExit,
  onRestart,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<EngineState | null>(null);
  const inputRef = useRef<EngineInput>({ up: false, down: false, block: false });
  const chargingRef = useRef(false);
  const endedRef = useRef(false);
  const pausedRef = useRef(false);
  const upgradesRef = useRef(upgrades);
  const cheatsRef = useRef<EngineCheats>(cheats ?? {});
  const onFinishedRef = useRef(onFinished);
  const onExitRef = useRef(onExit);
  const onRestartRef = useRef(onRestart);
  upgradesRef.current = upgrades;
  cheatsRef.current = cheats ?? {};
  onFinishedRef.current = onFinished;
  onExitRef.current = onExit;
  onRestartRef.current = onRestart;

  const [hud, setHud] = useState({
    distance: 0,
    fuel: 1,
    blocks: 0,
    boosts: 0,
    boosting: false,
    phase: 'ready' as EngineState['phase'],
  });
  const [paused, setPaused] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const toastTimer = useRef(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      const parent = canvas.parentElement;
      const w = parent?.clientWidth ?? window.innerWidth;
      const h = Math.min(window.innerHeight * 0.72, 560);
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas.width = Math.floor(w * dpr);
      canvas.height = Math.floor(h * dpr);
      canvas.style.width = `${w}px`;
      canvas.style.height = `${h}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      if (!stateRef.current) {
        stateRef.current = createEngine(upgradesRef.current, mode, h);
      } else {
        stateRef.current.groundY = h * 0.82;
      }
    };

    resize();
    endedRef.current = false;
    pausedRef.current = false;
    const cssH = canvas.clientHeight || Math.min(window.innerHeight * 0.72, 560);
    stateRef.current = createEngine(upgradesRef.current, mode, cssH);

    let raf = 0;
    let last = performance.now();
    let hudAcc = 0;

    const showToast = (msg: string) => {
      setToast(msg);
      toastTimer.current = 2.2;
    };

    const loop = (now: number) => {
      const dt = Math.min(0.033, (now - last) / 1000);
      last = now;
      const state = stateRef.current;
      if (!state) return;

      const cssW = canvas.clientWidth;
      const loopH = canvas.clientHeight;

      if (!endedRef.current && state.phase !== 'ended' && !pausedRef.current) {
        const result = tick(
          state,
          upgradesRef.current,
          inputRef.current,
          dt,
          cssW,
          loopH,
          cheatsRef.current,
        );

        for (const m of MILESTONES) {
          if (state.distance >= m && state.lastMilestone < m) {
            state.lastMilestone = m;
            showToast(`${m.toLocaleString()} m!`);
          }
        }

        if (result) {
          endedRef.current = true;
          result.isRecord = false;
          onFinishedRef.current(result);
        }
      }

      if (toastTimer.current > 0) {
        toastTimer.current -= dt;
        if (toastTimer.current <= 0) setToast(null);
      }

      drawScene(ctx, state, cssW, loopH, chargingRef.current);

      hudAcc += dt;
      if (hudAcc > 0.08) {
        hudAcc = 0;
        setHud({
          distance: Math.floor(state.distance),
          fuel: state.fuelMax > 0 ? state.fuel / state.fuelMax : 0,
          blocks: state.blocksLeft,
          boosts: state.boosts,
          boosting: state.boostTimer > 0,
          phase: state.phase,
        });
      }

      raf = requestAnimationFrame(loop);
    };

    raf = requestAnimationFrame(loop);
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [mode]);

  useEffect(() => {
    const typingTarget = (t: EventTarget | null) =>
      t instanceof HTMLElement &&
      Boolean(t.closest('input, textarea, select, [contenteditable=true], [role=dialog]'));

    const onKeyDown = (e: KeyboardEvent) => {
      if (typingTarget(e.target)) return;
      const state = stateRef.current;
      if (!state) return;

      if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onRestartRef.current();
        return;
      }
      if (e.code === 'KeyP') {
        e.preventDefault();
        if (state.phase === 'flying' || state.phase === 'charging') {
          pausedRef.current = !pausedRef.current;
          setPaused(pausedRef.current);
          if (pausedRef.current) {
            inputRef.current = { up: false, down: false, block: false };
            chargingRef.current = false;
          }
        }
        return;
      }
      if (pausedRef.current) return;

      if (e.code === 'ArrowUp' || e.code === 'KeyW') {
        e.preventDefault();
        inputRef.current.up = true;
      }
      if (e.code === 'ArrowDown' || e.code === 'KeyS') {
        e.preventDefault();
        inputRef.current.down = true;
      }
      if (e.code === 'Space') {
        e.preventDefault();
        if (state.phase === 'ready') {
          chargingRef.current = true;
          startCharge(state);
        } else if (state.phase === 'flying') {
          inputRef.current.block = true;
        }
      }
      if (e.code === 'Escape') onExitRef.current();
    };

    const onKeyUp = (e: KeyboardEvent) => {
      if (typingTarget(e.target)) return;
      if (pausedRef.current) return;
      const state = stateRef.current;
      if (!state) return;
      if (e.code === 'ArrowUp' || e.code === 'KeyW') inputRef.current.up = false;
      if (e.code === 'ArrowDown' || e.code === 'KeyS') inputRef.current.down = false;
      if (e.code === 'Space') {
        inputRef.current.block = false;
        if (state.phase === 'charging' && chargingRef.current) {
          chargingRef.current = false;
          releaseLaunch(state, upgradesRef.current);
          if (state.perfectLaunch) {
            setToast('Perfect launch!');
            toastTimer.current = 2;
          }
        }
      }
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
    };
  }, []);

  const beginCharge = () => {
    if (pausedRef.current) return;
    const state = stateRef.current;
    if (!state || state.phase !== 'ready') return;
    chargingRef.current = true;
    startCharge(state);
  };

  const endCharge = () => {
    if (pausedRef.current) return;
    const state = stateRef.current;
    if (!state) return;
    if (state.phase === 'charging' && chargingRef.current) {
      chargingRef.current = false;
      releaseLaunch(state, upgrades);
      if (state.perfectLaunch) {
        setToast('Perfect launch!');
        toastTimer.current = 2;
      }
    }
  };

  const togglePause = () => {
    const state = stateRef.current;
    if (!state) return;
    if (state.phase !== 'flying' && state.phase !== 'charging') return;
    pausedRef.current = !pausedRef.current;
    setPaused(pausedRef.current);
    if (pausedRef.current) {
      inputRef.current = { up: false, down: false, block: false };
      chargingRef.current = false;
    }
  };

  const phaseHint =
    paused
      ? 'Paused — press P to resume'
      : hud.phase === 'ready'
        ? 'Hold launch to charge, release to fly — fill the bar for a perfect launch'
        : hud.phase === 'charging'
          ? 'Release to launch!'
          : hud.phase === 'flying'
            ? mode === 'record'
              ? 'Steer · Block hits · Fly through gold rings for boost'
              : 'Steer · Grab gold rings for fuel & speed'
            : 'Flight complete';

  return (
    <div className="game-shell">
      <div className="game-topbar">
        <button type="button" className="text-btn" onClick={onExit}>
          ← Hangar
        </button>
        <div className="game-top-actions">
          <button type="button" className="text-btn" onClick={togglePause}>
            {paused ? 'Resume' : 'Pause'}
          </button>
          <button type="button" className="text-btn" onClick={onRestart}>
            Restart
          </button>
          <div className="game-mode-tag">{mode === 'record' ? 'Record run' : 'Casual hop'}</div>
        </div>
      </div>

      <div className={`game-stage${paused ? ' is-paused' : ''}`}>
        <canvas
          ref={canvasRef}
          className="game-canvas"
          onPointerDown={(e) => {
            if (pausedRef.current) return;
            if (hud.phase === 'ready') {
              (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
              beginCharge();
            } else if (hud.phase === 'flying') {
              const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
              const y = e.clientY - rect.top;
              if (y < rect.height * 0.45) inputRef.current.up = true;
              else inputRef.current.down = true;
            }
          }}
          onPointerUp={(e) => {
            endCharge();
            inputRef.current.up = false;
            inputRef.current.down = false;
            inputRef.current.block = false;
            try {
              (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
            } catch {
              /* ignore */
            }
          }}
          onPointerMove={(e) => {
            if (pausedRef.current) return;
            if (hud.phase !== 'flying' || e.buttons === 0) return;
            const rect = (e.target as HTMLCanvasElement).getBoundingClientRect();
            const y = e.clientY - rect.top;
            inputRef.current.up = y < rect.height * 0.45;
            inputRef.current.down = y >= rect.height * 0.45;
          }}
        />

        <div className="game-hud" aria-live="polite">
          <div className="hud-stat">
            <span className="hud-label">Distance</span>
            <span className="hud-value">{hud.distance} m</span>
          </div>
          <div className="hud-stat hud-fuel">
            <span className="hud-label">Fuel</span>
            <div className="fuel-track">
              <div className="fuel-fill" style={{ width: `${Math.max(0, hud.fuel) * 100}%` }} />
            </div>
          </div>
          {hud.boosts > 0 && (
            <div className="hud-stat">
              <span className="hud-label">Rings</span>
              <span className="hud-value">{hud.boosts}</span>
            </div>
          )}
          {mode === 'record' && (
            <div className="hud-stat">
              <span className="hud-label">Blocks</span>
              <span className="hud-value">{hud.blocks}</span>
            </div>
          )}
          {hud.boosting && <div className="hud-boost-flag">BOOST</div>}
        </div>

        {toast && (
          <div className="game-toast" role="status">
            {toast}
          </div>
        )}
        {paused && (
          <div className="game-pause-veil" role="status">
            <p>Paused</p>
            <span>P to resume · R to restart</span>
          </div>
        )}
      </div>

      <div className="game-controls">
        <p className="control-hint">{phaseHint}</p>
        <div className="control-row">
          {hud.phase === 'ready' || hud.phase === 'charging' ? (
            <button
              type="button"
              className="ctl-btn ctl-primary"
              disabled={paused}
              onPointerDown={beginCharge}
              onPointerUp={endCharge}
              onPointerLeave={endCharge}
            >
              Hold to launch
            </button>
          ) : (
            <>
              <button
                type="button"
                className="ctl-btn"
                disabled={paused}
                onPointerDown={() => {
                  inputRef.current.up = true;
                }}
                onPointerUp={() => {
                  inputRef.current.up = false;
                }}
                onPointerLeave={() => {
                  inputRef.current.up = false;
                }}
              >
                Climb
              </button>
              <button
                type="button"
                className="ctl-btn"
                disabled={paused}
                onPointerDown={() => {
                  inputRef.current.down = true;
                }}
                onPointerUp={() => {
                  inputRef.current.down = false;
                }}
                onPointerLeave={() => {
                  inputRef.current.down = false;
                }}
              >
                Dive
              </button>
              {mode === 'record' && (
                <button
                  type="button"
                  className="ctl-btn ctl-accent"
                  disabled={paused || hud.blocks <= 0}
                  onPointerDown={() => {
                    inputRef.current.block = true;
                  }}
                  onPointerUp={() => {
                    inputRef.current.block = false;
                  }}
                  onPointerLeave={() => {
                    inputRef.current.block = false;
                  }}
                >
                  Block ({hud.blocks})
                </button>
              )}
            </>
          )}
          <button type="button" className="ctl-btn" onClick={onRestart}>
            Restart
          </button>
        </div>
        <p className="control-keys">
          Space launch / block · W/S or ↑/↓ steer · R restart · P pause · Esc hangar
        </p>
      </div>
    </div>
  );
}
