import { UPGRADES, upgradeCost } from '../game/upgrades';
import type { UpgradeId } from '../game/types';

interface Props {
  money: number;
  levels: Record<UpgradeId, number>;
  onBuy: (id: UpgradeId) => void;
  onBack: () => void;
}

export function Shop({ money, levels, onBuy, onBack }: Props) {
  return (
    <section className="shop-panel" aria-labelledby="shop-title">
      <div className="shop-head">
        <button type="button" className="ctl-btn" onClick={onBack}>
          Back to hangar
        </button>
        <h2 id="shop-title">Upgrade bay</h2>
        <p className="shop-cash">
          Bank <strong>${money.toLocaleString()}</strong>
        </p>
      </div>

      <ul className="upgrade-list">
        {UPGRADES.map((def) => {
          const level = levels[def.id] ?? 0;
          const maxed = level >= def.maxLevel;
          const cost = upgradeCost(def, level);
          const canBuy = !maxed && money >= cost;

          return (
            <li key={def.id} className="upgrade-row">
              <div className="upgrade-copy">
                <div className="upgrade-title-row">
                  <h3>{def.name}</h3>
                  <span className="level-pip">
                    {level}/{def.maxLevel}
                  </span>
                </div>
                <p>{def.blurb}</p>
                <div className="level-bars" aria-hidden="true">
                  {Array.from({ length: def.maxLevel }).map((_, i) => (
                    <span key={i} className={i < level ? 'on' : ''} />
                  ))}
                </div>
              </div>
              <button
                type="button"
                className="buy-btn"
                disabled={!canBuy}
                onClick={() => onBuy(def.id)}
              >
                {maxed ? 'Maxed' : `Buy $${cost}`}
              </button>
            </li>
          );
        })}
      </ul>
    </section>
  );
}
