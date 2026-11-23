import { describe, expect, it } from 'vitest';
import { apiBaseUrl, buildRequest, formatApiError, initialForm } from './predictionForm.js';

describe('apiBaseUrl', () => {
  it.each([undefined, '', '   '])('falls back to the default for %j', (raw) => {
    expect(apiBaseUrl(raw)).toBe('http://127.0.0.1:8000');
  });

  it('uses the configured address', () => {
    expect(apiBaseUrl('http://192.168.1.20:8000')).toBe('http://192.168.1.20:8000');
  });

  it('drops trailing slashes so the path does not become //predict', () => {
    expect(apiBaseUrl('http://example.test:8000//')).toBe('http://example.test:8000');
  });
});

const valid = {
  ...initialForm,
  age: '40', balance: '1500', job: 'admin.', marital: 'divorced', housing: 'no',
};

const errorsFor = (form) => {
  const result = buildRequest(form);
  expect(result.ok).toBe(false);
  return result.errors;
};

describe('buildRequest', () => {
  it('a valid form with no earlier campaign builds the API body', () => {
    expect(buildRequest(valid)).toEqual({
      ok: true,
      payload: {
        age: 40, job: 'admin.', marital: 'divorced', balance: 1500, housing: 'no',
        campaign: 1, pdays: -1, previous: 0, poutcome: 'unknown',
      },
    });
  });

  it('an earlier campaign sends previous, pdays and the outcome', () => {
    const { payload } = buildRequest({ ...valid, earlier: 'success', previous: '2', pdays: '90' });
    expect(payload).toMatchObject({ previous: 2, pdays: 90, poutcome: 'success' });
  });

  it('the payload has exactly the nine API fields', () => {
    const { payload } = buildRequest(valid);
    expect(Object.keys(payload).sort()).toEqual(
      ['age', 'balance', 'campaign', 'housing', 'job', 'marital', 'pdays', 'poutcome', 'previous'],
    );
  });

  it('a negative or decimal balance is accepted', () => {
    expect(buildRequest({ ...valid, balance: '-250.5' }).payload.balance).toBe(-250.5);
  });

  it.each([
    ['age', ''], ['age', '   '], ['balance', ''],
  ])('an empty or blank %s %j is an error, not zero', (field, value) => {
    expect(errorsFor({ ...valid, [field]: value })).toHaveProperty(field);
  });

  it.each([
    ['balance', '-'], ['age', 'abc'],
  ])('%s %j is not a number', (field, value) => {
    expect(errorsFor({ ...valid, [field]: value })).toHaveProperty(field);
  });

  it('a number that overflows to Infinity is an error', () => {
    expect(errorsFor({ ...valid, balance: '1e999' })).toHaveProperty('balance');
  });

  it.each([
    ['age', '40.5'], ['campaign', '1.5'],
  ])('%s %j must be a whole number', (field, value) => {
    expect(errorsFor({ ...valid, [field]: value })).toHaveProperty(field);
  });

  it.each([
    ['age', '17'], ['age', '121'],
    ['balance', '10000001'], ['balance', '-10000001'],
    ['campaign', '0'], ['campaign', '51'],
  ])('%s %s is outside the API limit', (field, value) => {
    expect(errorsFor({ ...valid, [field]: value })).toHaveProperty(field);
  });

  it.each([
    ['age', '18'], ['age', '120'],
    ['balance', '10000000'], ['balance', '-10000000'],
    ['campaign', '1'], ['campaign', '50'],
  ])('%s %s is on the API limit and accepted', (field, value) => {
    expect(buildRequest({ ...valid, [field]: value }).ok).toBe(true);
  });

  it.each(['job', 'marital', 'housing'])('%s must be chosen', (field) => {
    expect(errorsFor({ ...valid, [field]: '' })).toHaveProperty(field);
  });

  it.each([
    ['previous', ''], ['previous', '0'], ['previous', '51'],
    ['pdays', ''], ['pdays', '-1'], ['pdays', '1000'],
  ])('an earlier campaign with %s %j is an error', (field, value) => {
    const form = { ...valid, earlier: 'failure', previous: '1', pdays: '30', [field]: value };
    expect(errorsFor(form)).toHaveProperty(field);
  });

  it('previous and pdays are ignored when there was no earlier campaign', () => {
    const { payload } = buildRequest({ ...valid, earlier: 'none', previous: '9', pdays: '5' });
    expect(payload).toMatchObject({ previous: 0, pdays: -1, poutcome: 'unknown' });
  });

  it('all problems are reported together', () => {
    expect(Object.keys(errorsFor(initialForm)).sort()).toEqual(
      ['age', 'balance', 'housing', 'job', 'marital'],
    );
  });
});

describe('formatApiError', () => {
  const body = (detail) => JSON.stringify({ detail });

  it('turns a validator 422 into its sentence', () => {
    const text = formatApiError(422, body([{
      loc: ['body'],
      msg: "Value error, poutcome 'success' needs an earlier contact (previous >= 1)",
      type: 'value_error',
    }]));
    expect(text).toContain("poutcome 'success' needs an earlier contact");
    expect(text).not.toContain('Value error,');
  });

  it('names the field of a field error', () => {
    const text = formatApiError(422, body([{
      loc: ['body', 'age'], msg: 'Input should be greater than or equal to 18', type: 'greater_than_equal',
    }]));
    expect(text).toContain('age');
    expect(text).toContain('Input should be greater than or equal to 18');
  });

  it('joins several errors', () => {
    const text = formatApiError(422, body([
      { loc: ['body', 'age'], msg: 'first problem', type: 'x' },
      { loc: ['body', 'balance'], msg: 'second problem', type: 'x' },
    ]));
    expect(text).toContain('first problem');
    expect(text).toContain('second problem');
  });

  it('handles a plain 500', () => {
    const text = formatApiError(500, body('Internal server error. Please try again later.'));
    expect(text).toContain('Internal server error. Please try again later.');
  });

  it('survives a non JSON body', () => {
    const text = formatApiError(502, '<html>Bad gateway</html>');
    expect(text).toContain('502');
  });
});
