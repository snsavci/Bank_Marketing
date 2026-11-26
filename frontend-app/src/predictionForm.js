// Pure form logic, kept out of the component so it can be tested without a browser.
// Limits and allowed values mirror CustomerInput in backend-api/api.py. The API stays the
// authority: if these ever drift, its 422 is shown by formatApiError.

export const LIMITS = {
  age: [18, 120],
  balance: [-10_000_000, 10_000_000],
  campaign: [1, 50],
  previous: [1, 50],
  pdays: [0, 999],
};

export const JOBS = [
  'management', 'technician', 'blue-collar', 'admin.', 'services', 'retired',
  'self-employed', 'unemployed', 'housemaid', 'student', 'entrepreneur', 'unknown',
];
export const MARITAL = ['married', 'single', 'divorced'];
export const HOUSING = ['yes', 'no'];
export const EARLIER = ['none', 'failure', 'other', 'success'];

export const initialForm = {
  age: '', balance: '', job: '', marital: '', housing: '',
  campaign: '1', earlier: 'none', previous: '', pdays: '',
};

/** Address of the API from VITE_API_URL: an empty value means the default, trailing slashes are dropped. */
export function apiBaseUrl(configured) {
  const url = (configured ?? '').trim() || 'http://127.0.0.1:8000';
  return url.replace(/\/+$/, '');
}

const FIELD_NAMES = {
  age: 'Age', balance: 'Balance', campaign: 'Contacts in this campaign',
  previous: 'Number of earlier contacts', pdays: 'Days since the last contact',
};

// Only plain decimal text is a number here: Number() would also take "020", "+5", "4e1", "0x28" or "1e999".
// "-" and blank text do not match either (Number("") would be 0).
const PLAIN_NUMBER = /^-?(0|[1-9]\d*)(\.\d+)?$/;
const LEADING_ZEROS = /^-?0\d/;

function parseNumber(text) {
  const trimmed = text.trim();
  if (!PLAIN_NUMBER.test(trimmed)) return null;
  const value = Number(trimmed);
  return Number.isFinite(value) ? value : null; // a very long digit string can still overflow to Infinity
}

function checkNumber(form, field, { integer }, errors) {
  const [min, max] = LIMITS[field];
  const text = form[field].trim();
  const withoutZeros = text.replace(/^(-?)0+(?=\d)/, '$1');
  if (LEADING_ZEROS.test(text) && PLAIN_NUMBER.test(withoutZeros)) {
    errors[field] = `${FIELD_NAMES[field]} must not start with a zero: write ${withoutZeros} instead of ${text}.`;
    return null;
  }
  // Text that Number() reads as a number but that is not written plainly ("4e1", "+5", ".5"):
  // a range message would read as wrong, because the value it stands for may be in range.
  if (text !== '' && !PLAIN_NUMBER.test(text) && Number.isFinite(Number(text))) {
    errors[field] = `${FIELD_NAMES[field]} must be written as a plain ${integer ? 'whole number, like 40' : 'number, like 1500.5'}.`;
    return null;
  }
  const value = parseNumber(text);
  const kind = integer ? 'a whole number' : 'a number';
  const range = `from ${min.toLocaleString('en-US')} to ${max.toLocaleString('en-US')}`;
  if (value === null || (integer && !Number.isInteger(value)) || value < min || value > max) {
    errors[field] = `${FIELD_NAMES[field]} must be ${kind} ${range}.`;
    return null;
  }
  return value;
}

function checkChoice(form, field, allowed, label, errors) {
  if (!allowed.includes(form[field])) errors[field] = `Choose ${label}.`;
  return form[field];
}

/** Turns the form state (all strings) into the API request body, or per-field error messages. */
export function buildRequest(form) {
  const errors = {};
  const age = checkNumber(form, 'age', { integer: true }, errors);
  const balance = checkNumber(form, 'balance', { integer: false }, errors);
  const campaign = checkNumber(form, 'campaign', { integer: true }, errors);
  const job = checkChoice(form, 'job', JOBS, 'a job', errors);
  const marital = checkChoice(form, 'marital', MARITAL, 'a marital status', errors);
  const housing = checkChoice(form, 'housing', HOUSING, 'yes or no', errors);

  let previous = 0;
  let pdays = -1;
  let poutcome = 'unknown';
  if (form.earlier !== 'none') {
    if (!EARLIER.includes(form.earlier)) {
      errors.earlier = 'Choose the outcome of the previous campaign.';
    }
    previous = checkNumber(form, 'previous', { integer: true }, errors);
    pdays = checkNumber(form, 'pdays', { integer: true }, errors);
    poutcome = form.earlier;
  }

  if (Object.keys(errors).length > 0) return { ok: false, errors };
  return {
    ok: true,
    payload: { age, job, marital, balance, housing, campaign, pdays, previous, poutcome },
  };
}

/** Readable text for a non-2xx answer. Never throws, whatever the body is. */
export function formatApiError(status, bodyText) {
  let detail;
  try {
    detail = JSON.parse(bodyText)?.detail;
  } catch {
    return `The server answered ${status}.`;
  }
  if (typeof detail === 'string') return detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail
      .map((item) => {
        const message = String(item?.msg ?? 'Invalid value').replace(/^Value error, /, '');
        const field = Array.isArray(item?.loc) ? item.loc[item.loc.length - 1] : undefined;
        return field && field !== 'body' ? `${field}: ${message}` : message;
      })
      .join('\n');
  }
  return `The server answered ${status}.`;
}
