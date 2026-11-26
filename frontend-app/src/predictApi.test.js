import { describe, expect, it, vi } from 'vitest';
import { predict } from './predictApi.js';

const API = 'http://127.0.0.1:8000';
const payload = { age: 40, job: 'admin.', marital: 'divorced', balance: 1500, housing: 'no', campaign: 1,
  pdays: -1, previous: 0, poutcome: 'unknown' };

// A stand-in for fetch that answers with the given status and body text.
const answering = (status, bodyText) => vi.fn(async () => ({
  ok: status >= 200 && status < 300,
  status,
  text: async () => bodyText,
}));

describe('predict', () => {
  it('posts the payload as JSON to /predict and returns the body of a valid answer', async () => {
    const reply = { subscription_predicted: 'Yes', probability_of_yes: 0.62 };
    const fetchFn = answering(200, JSON.stringify(reply));

    const answer = await predict(API, payload, fetchFn);

    expect(answer).toEqual({ ok: true, body: reply });
    expect(fetchFn).toHaveBeenCalledWith(`${API}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
  });

  it('names the address when the API cannot be reached', async () => {
    const fetchFn = vi.fn().mockRejectedValue(new TypeError('Failed to fetch'));

    const answer = await predict(API, payload, fetchFn);

    expect(answer.ok).toBe(false);
    expect(answer.message).toContain(`Could not reach the API at ${API}.`);
    expect(answer.message).toContain('uvicorn api:app --port 8000');
  });

  it('treats a body that cannot be read as an unreachable API', async () => {
    const fetchFn = vi.fn(async () => ({
      ok: true,
      status: 200,
      text: async () => { throw new TypeError('network error'); },
    }));

    const answer = await predict(API, payload, fetchFn);

    expect(answer.ok).toBe(false);
    expect(answer.message).toContain('Could not reach the API');
  });

  it('shows the field message of a 422', async () => {
    const body = JSON.stringify({
      detail: [{ loc: ['body', 'age'], msg: 'Input should be greater than or equal to 18' }],
    });

    const answer = await predict(API, payload, answering(422, body));

    expect(answer).toEqual({ ok: false, message: 'age: Input should be greater than or equal to 18' });
  });

  it('falls back to the status for a 500 whose body is not JSON', async () => {
    const answer = await predict(API, payload, answering(500, 'Internal Server Error'));

    expect(answer).toEqual({ ok: false, message: 'The server answered 500.' });
  });

  it.each([
    ['not JSON', '<html>hello</html>'],
    ['an empty object', '{}'],
    ['a probability that is not a number', '{"subscription_predicted":"Yes","probability_of_yes":"0.6"}'],
    ['a missing decision', '{"probability_of_yes":0.6}'],
    ['null', 'null'],
  ])('rejects a 200 answer that is %s', async (_name, bodyText) => {
    const answer = await predict(API, payload, answering(200, bodyText));

    expect(answer.ok).toBe(false);
    expect(answer.message).toBe(`The server at ${API} answered, but not with a prediction. Is this the right API address?`);
  });
});
