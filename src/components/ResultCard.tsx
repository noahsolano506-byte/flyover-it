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
          {result.blocked > 0 ? ` · ${result.blocked} blocked` : ''}
        </p>
        <p className="result-best">Personal best {bestDistance.toLocaleString()} m</p>
        <div className="result-actions">
          <button type="button" className="ctl-btn ctl-primary" onClick={onAgain}>
            Fly again
          </button>
          <button type="button" className="ctl-btn" onClick={onShop}>
            Upgrades
          </button>
          <button type="button" className="text-btn" onClick={onHangar}>
            Hangar
          </button>
        </div>
      </div>
    </div>
  );
}
