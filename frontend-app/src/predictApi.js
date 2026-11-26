import { formatApiError } from './predictionForm.js';

/**
 * Sends the request body to POST /predict. Never throws: the answer is { ok: true, body } or
 * { ok: false, message } with text that can be shown as it is. fetchFn is a parameter so tests can fake it.
 */
export async function predict(apiUrl, payload, fetchFn = fetch) {
  let response;
  let text;
  try {
    response = await fetchFn(`${apiUrl}/predict`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    text = await response.text();
  } catch {
    return {
      ok: false,
      message: `Could not reach the API at ${apiUrl}. Check that it is running `
        + '(uvicorn api:app --port 8000) and that this page is served from http://localhost:5173.',
    };
  }

  if (!response.ok) return { ok: false, message: formatApiError(response.status, text) };

  try {
    const body = JSON.parse(text);
    if (typeof body.subscription_predicted !== 'string' || !Number.isFinite(body.probability_of_yes)) {
      throw new Error('missing fields');
    }
    return { ok: true, body };
  } catch {
    return {
      ok: false,
      message: `The server at ${apiUrl} answered, but not with a prediction. Is this the right API address?`,
    };
  }
}
