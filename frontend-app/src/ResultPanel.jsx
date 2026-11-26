import {
  BASE_RATE, RING, describeResult, formatPercent, ringArc, thresholdAngle,
} from './resultView.js';

function Ring({ result, threshold }) {
  const arc = result ? ringArc(result.probability_of_yes) : 0;
  const label = result
    ? `Probability of yes ${(result.probability_of_yes * 100).toFixed(1)} percent`
      + (threshold === null ? '' : `, decision threshold ${(threshold * 100).toFixed(1)} percent`)
    : undefined;

  return (
    <svg className={`ring${result ? ` ${describeResult(result).tone}` : ''}`} viewBox={`0 0 ${RING.size} ${RING.size}`}
      role={result ? 'img' : undefined} aria-label={label} aria-hidden={result ? undefined : 'true'}>
      <circle className="ring-track" cx={RING.center} cy={RING.center} r={RING.radius}
        fill="none" strokeWidth={RING.stroke} />
      {result && arc > 0 && (
        <circle className="ring-progress" cx={RING.center} cy={RING.center} r={RING.radius}
          fill="none" strokeWidth={RING.stroke}
          strokeDasharray={`${arc} ${RING.circumference}`}
          transform={`rotate(-90 ${RING.center} ${RING.center})`} />
      )}
      {result && threshold !== null && (
        <g transform={`rotate(${thresholdAngle(threshold)} ${RING.center} ${RING.center})`}>
          {/* y1 = 3, not 1: the halo and round caps must stay inside the viewBox at 0, 90, 180 and 270 degrees. */}
          <line className="ring-tick-halo" x1="65" y1="3" x2="65" y2="21" />
          <line className="ring-tick" x1="65" y1="3" x2="65" y2="21" />
        </g>
      )}
      {result && (
        <>
          <text className="ring-value" x={RING.center} y="68" textAnchor="middle">
            {formatPercent(result.probability_of_yes)}
          </text>
          <text className="ring-caption" x={RING.center} y="84" textAnchor="middle">
            probability of yes
          </text>
        </>
      )}
    </svg>
  );
}

export default function ResultPanel({ loading, result, threshold }) {
  const verdict = result ? describeResult(result) : null;

  return (
    <section className="card panel" aria-live="polite">
      <h2>Prediction</h2>

      {!result && (
        <div className="panel-empty">
          <Ring result={null} threshold={threshold} />
          <p>{loading ? 'Predicting...' : 'Fill in the form and press Predict subscription to see the result here.'}</p>
        </div>
      )}

      {result && (
        <>
          <Ring result={result} threshold={threshold} />
          <p className={`badge ${verdict.tone}`}>{verdict.headline}</p>
          <dl className="rows">
            {threshold !== null && (
              <div><dt>Decision threshold</dt><dd>{formatPercent(threshold)}</dd></div>
            )}
            <div><dt>Average customer</dt><dd>{formatPercent(BASE_RATE)}</dd></div>
          </dl>
        </>
      )}
    </section>
  );
}
