import { useEffect } from 'react';
import type { FlightResult } from '../game/types';

interface Props {
  result: FlightResult;
  bestDistance: number;
  onShop: () => void;
  onAgain: () => void;
  onHangar: () => void;
}

export function ResultCard({
  result,
  bestDistance,
  onShop,
  onAgain,
  onHangar,
}: Props) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.code === 'KeyR' && !e.ctrlKey && !e.metaKey) {
        e.preventDefault();
        onAgain();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onAgain]);

  const bits: string[] = [];
  if (result.perfectLaunch) bits.push('Perfect launch');
  if (result.boosts > 0) bits.push(`${result.boosts} ring${result.boosts === 1 ? '' : 's'}`);
  if (result.airTime > 0) bits.push(`${result.airTime}s air`);
  if (result.blocked > 0) bits.push(`${result.blocked} blocked`);

  return (
    <div className="result-overlay" role="dialog" aria-labelledby="result-title">
      <div className="result-panel">
        <p className="result-kicker">
          {result.crashed ? 'Hard landing' : 'Touchdown'}
          {result.isRecord ? ' · New best!' : ''}
        </p>
        <h2 id="result-title">{result.distance.toLocaleString()} m</h2>
        <p className="result-earn">
          +${result.earnings.toLocaleString()}
          {result.mode === 'record' ? ' record bonus' : ''}
        </p>
        {bits.length > 0 && <p className="result-bits">{bits.join(' · ')}</p>}
        <p className="result-best">Personal best {bestDistance.toLocaleString()} m</p>
        <div className="result-actions">
          <button type="button" className="ctl-btn ctl-primary" onClick={onAgain}>
            Restart
          </button>
          <button type="button" className="ctl-btn" onClick={onShop}>
            Upgrades
          </button>
          <button type="button" className="text-btn" onClick={onHangar}>
            Hangar
          </button>
        </div>
        <p className="result-keys">Press R to restart</p>
      </div>
    </div>
  );
}
