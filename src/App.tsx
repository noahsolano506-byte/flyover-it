import { useCallback, useEffect, useState } from 'react';
import { AdvertiseModal } from './components/AdvertiseModal';
import { GameCanvas } from './components/GameCanvas';
import { Landing } from './components/Landing';
import { ResultCard } from './components/ResultCard';
import { Shop } from './components/Shop';
import { defaultSave, loadSave, writeSave } from './game/storage';
import { UPGRADES, upgradeCost } from './game/upgrades';
import type { FlightMode, FlightResult, SaveData, Screen, UpgradeId } from './game/types';

export default function App() {
  const [save, setSave] = useState<SaveData>(() => defaultSave());
  const [hydrated, setHydrated] = useState(false);
  const [screen, setScreen] = useState<Screen>('landing');
  const [mode, setMode] = useState<FlightMode>('casual');
  const [result, setResult] = useState<FlightResult | null>(null);
  const [flightKey, setFlightKey] = useState(0);
  const [advertiseOpen, setAdvertiseOpen] = useState(false);

  useEffect(() => {
    setSave(loadSave());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    writeSave(save);
  }, [save, hydrated]);

  const applyResult = useCallback((r: FlightResult) => {
    setSave((prev) => {
      const isRecord = r.distance > prev.bestDistance;
      queueMicrotask(() => setResult({ ...r, isRecord }));
      return {
        ...prev,
        money: prev.money + r.earnings,
        bestDistance: Math.max(prev.bestDistance, r.distance),
        totalFlights: prev.totalFlights + 1,
      };
    });
    setScreen('result');
  }, []);

  const buyUpgrade = (id: UpgradeId) => {
    setSave((prev) => {
      const def = UPGRADES.find((u) => u.id === id);
      if (!def) return prev;
      const level = prev.upgrades[id] ?? 0;
      if (level >= def.maxLevel) return prev;
      const cost = upgradeCost(def, level);
      if (prev.money < cost) return prev;
      return {
        ...prev,
        money: prev.money - cost,
        upgrades: { ...prev.upgrades, [id]: level + 1 },
      };
    });
  };

  const startFlight = (nextMode: FlightMode) => {
    setMode(nextMode);
    setResult(null);
    setFlightKey((k) => k + 1);
    setScreen('play');
  };

  return (
    <div className="app">
      {screen === 'landing' && (
        <>
          <Landing
            bestDistance={save.bestDistance}
            money={save.money}
            onPlay={() => {
              document.getElementById('hangar')?.scrollIntoView({ behavior: 'smooth' });
            }}
          />
          <section className="hangar" id="hangar" aria-labelledby="hangar-title">
            <div className="hangar-inner">
              <h2 id="hangar-title">Hangar</h2>
              <p className="hangar-lead">
                Casual hops build your bank. Record runs pay more — and throw obstacles
                you must dodge or block.
              </p>
              <div className="hangar-stats">
                <div>
                  <span>Bank</span>
                  <strong>${save.money.toLocaleString()}</strong>
                </div>
                <div>
                  <span>Best</span>
                  <strong>{save.bestDistance.toLocaleString()} m</strong>
                </div>
                <div>
                  <span>Flights</span>
                  <strong>{save.totalFlights}</strong>
                </div>
              </div>
              <div className="hangar-actions">
                <button
                  type="button"
                  className="ctl-btn ctl-primary"
                  onClick={() => startFlight('casual')}
                >
                  Casual hop
                </button>
                <button
                  type="button"
                  className="ctl-btn ctl-accent"
                  onClick={() => startFlight('record')}
                >
                  Record run
                </button>
                <button type="button" className="ctl-btn" onClick={() => setScreen('shop')}>
                  Upgrades
                </button>
              </div>
            </div>
          </section>
          <footer className="site-foot">
            <span>FlyOverIt.io</span>
            <span>Progress saves in this browser</span>
          </footer>
          <button
            type="button"
            className="advertise-fab"
            onClick={() => setAdvertiseOpen(true)}
          >
            Advertise
          </button>
          <AdvertiseModal open={advertiseOpen} onClose={() => setAdvertiseOpen(false)} />
        </>
      )}

      {screen === 'shop' && (
        <main className="page-wrap">
          <Shop
            money={save.money}
            levels={save.upgrades}
            onBuy={buyUpgrade}
            onBack={() => setScreen('landing')}
          />
        </main>
      )}

      {(screen === 'play' || screen === 'result') && (
        <main className="page-wrap play-wrap">
          <GameCanvas
            key={flightKey}
            mode={mode}
            upgrades={save.upgrades}
            onFinished={applyResult}
            onExit={() => {
              setResult(null);
              setScreen('landing');
            }}
          />
          {screen === 'result' && result && (
            <ResultCard
              result={result}
              bestDistance={save.bestDistance}
              onShop={() => setScreen('shop')}
              onAgain={() => startFlight(mode)}
              onHangar={() => {
                setResult(null);
                setScreen('landing');
              }}
            />
          )}
        </main>
      )}
    </div>
  );
}
