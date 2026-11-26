import { describe, expect, it } from 'vitest';
import {
  RING, clamp01, describeResult, formatPercent, parseThreshold, ringArc, thresholdAngle,
} from './resultView.js';

describe('ringArc', () => {
  it('is 0 for 0, the full circle for 1 and proportional in between', () => {
    expect(ringArc(0)).toBe(0);
    expect(ringArc(1)).toBeCloseTo(RING.circumference);
    expect(ringArc(0.7)).toBeCloseTo(237.5, 1);
  });

  it.each([
    [-0.2, 0],
    [1.4, RING.circumference],
    [NaN, 0],
    [undefined, 0],
    ['0.5', 0],
  ])('clamps the out of range or non numeric probability %j', (probability, expected) => {
    expect(ringArc(probability)).toBeCloseTo(expected);
  });
});

describe('clamp01', () => {
  it('keeps numbers inside 0..1 and sends everything else to 0 or the ends', () => {
    expect(clamp01(0.3)).toBe(0.3);
    expect(clamp01(-1)).toBe(0);
    expect(clamp01(2)).toBe(1);
    expect(clamp01(Infinity)).toBe(0);
    expect(clamp01(null)).toBe(0);
  });
});

describe('thresholdAngle', () => {
  it('maps the threshold onto the circle', () => {
    expect(thresholdAngle(0.184)).toBeCloseTo(66.24, 2);
    expect(thresholdAngle(0.5)).toBe(180);
    expect(thresholdAngle(2)).toBe(360);
  });
});

describe('formatPercent', () => {
  it.each([
    [0.7, '70.0%'],
    [0.1839, '18.4%'],
    [0.117, '11.7%'],
    [0.0412, '4.1%'],
    [0, '0.0%'],
  ])('writes %j with one decimal', (fraction, expected) => {
    expect(formatPercent(fraction)).toBe(expected);
  });
});

describe('describeResult', () => {
  it('says yes for a Yes answer', () => {
    expect(describeResult({ subscription_predicted: 'Yes', probability_of_yes: 0.7 }))
      .toEqual({ tone: 'yes', headline: 'Yes · likely to subscribe' });
  });

  it('says no for a No answer', () => {
    expect(describeResult({ subscription_predicted: 'No', probability_of_yes: 0.1 }))
      .toEqual({ tone: 'no', headline: 'No · unlikely to subscribe' });
  });

  it('follows the API answer, not the number', () => {
    expect(describeResult({ subscription_predicted: 'No', probability_of_yes: 0.9 }).tone).toBe('no');
  });
});

describe('parseThreshold', () => {
  it('reads the threshold from the health answer', () => {
    expect(parseThreshold('{"status":"ok","threshold":0.1839}')).toBe(0.1839);
  });

  it.each([
    '',
    '<html>Bad gateway</html>',
    '{"status":"ok"}',
    '{"threshold":0}',
    '{"threshold":1}',
    '{"threshold":1.5}',
    '{"threshold":"0.18"}',
    '{"threshold":null}',
    'null',
    '[]',
  ])('returns null for the unusable answer %j', (body) => {
    expect(parseThreshold(body)).toBeNull();
  });
});
