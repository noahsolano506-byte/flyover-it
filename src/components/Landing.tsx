interface Props {
  bestDistance: number;
  money: number;
  onPlay: () => void;
}

export function Landing({ bestDistance, money, onPlay }: Props) {
  return (
    <section className="hero" aria-label="FlyOverIt.io home">
      <div className="hero-sky" aria-hidden="true">
        <div className="hero-sun" />
        <div className="hero-cloud c1" />
        <div className="hero-cloud c2" />
        <div className="hero-cloud c3" />
        <div className="hero-ridge" />
        <div className="hero-plane" />
      </div>

      <div className="hero-content">
        <p className="brand">FlyOverIt.io</p>
        <h1>Leave the hill. Own the sky.</h1>
        <p className="hero-sub">
          Launch farther, bank the meters, kit your plane — then chase records through
          birds, balloons, and storm cells.
        </p>
        <div className="hero-cta">
          <button type="button" className="ctl-btn ctl-primary hero-launch" onClick={onPlay}>
            Enter hangar
          </button>
          {(bestDistance > 0 || money > 0) && (
            <p className="hero-meta">
              Best {bestDistance.toLocaleString()} m · ${money.toLocaleString()} banked
            </p>
          )}
        </div>
      </div>
    </section>
  );
}
