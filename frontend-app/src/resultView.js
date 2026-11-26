// Pure helpers for the result panel: ring geometry, percent text and the /health answer.

// Share of subscribers in the training data (45,211 rows).
export const BASE_RATE = 0.117;

const RADIUS = 54;
export const RING = {
  size: 130,
  center: 65,
  radius: RADIUS,
  stroke: 12,
  circumference: 2 * Math.PI * RADIUS,
};

export function clamp01(value) {
  if (typeof value !== 'number' || !Number.isFinite(value)) return 0;
  return Math.min(1, Math.max(0, value));
}

// Length of the filled part of the ring (the stroke-dasharray value).
export function ringArc(probability) {
  return clamp01(probability) * RING.circumference;
}

// Degrees clockwise from 12 o'clock.
export function thresholdAngle(threshold) {
  return clamp01(threshold) * 360;
}

export function formatPercent(fraction) {
  return `${(fraction * 100).toFixed(1)}%`;
}

// The API decides yes or no; the number is only shown, never turned into a decision here.
export function describeResult(result) {
  const yes = result.subscription_predicted === 'Yes';
  return yes
    ? { tone: 'yes', headline: 'Yes · likely to subscribe' }
    : { tone: 'no', headline: 'No · unlikely to subscribe' };
}

// Reads the decision threshold from the body of GET /health, or null when it is unusable.
export function parseThreshold(bodyText) {
  try {
    const threshold = JSON.parse(bodyText)?.threshold;
    return typeof threshold === 'number' && threshold > 0 && threshold < 1 ? threshold : null;
  } catch {
    return null;
  }
}
