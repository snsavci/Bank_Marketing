import { useState } from 'react';
import {
  FaBriefcase, FaCoins, FaHeart, FaHistory, FaHome, FaPhoneAlt, FaUserTie,
} from 'react-icons/fa';
import {
  EARLIER, HOUSING, JOBS, LIMITS, MARITAL, apiBaseUrl, buildRequest, formatApiError, initialForm,
} from './predictionForm.js';

const API_URL = apiBaseUrl(import.meta.env.VITE_API_URL);

const capitalize = (text) => text.charAt(0).toUpperCase() + text.slice(1);
const EARLIER_LABELS = {
  none: 'Not contacted before', failure: 'Failure', other: 'Other', success: 'Success',
};

function FieldRow({ id, icon: Icon, label, error, children }) {
  return (
    <div className="field">
      <label htmlFor={id}>
        <Icon className="icon" aria-hidden="true" />
        {label}
      </label>
      {children}
      {error && <p className="field-error" role="alert">{error}</p>}
    </div>
  );
}

function SelectInput({ id, value, onChange, placeholder, options, labelOf }) {
  return (
    <select id={id} value={value} onChange={onChange}>
      {placeholder && <option value="">{placeholder}</option>}
      {options.map((option) => (
        <option key={option} value={option}>{labelOf(option)}</option>
      ))}
    </select>
  );
}

export default function PredictionScreen() {
  const [form, setForm] = useState(initialForm);
  const [errors, setErrors] = useState({});
  const [apiError, setApiError] = useState('');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);

  const update = (name) => (event) => {
    setForm((current) => ({ ...current, [name]: event.target.value }));
    // The details of an earlier campaign hang on the outcome select, so changing it resets their messages too.
    const stale = name === 'earlier' ? ['earlier', 'previous', 'pdays'] : [name];
    setErrors((current) => ({ ...current, ...Object.fromEntries(stale.map((key) => [key, undefined])) }));
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (loading) return;

    const built = buildRequest(form);
    setErrors(built.ok ? {} : built.errors);
    setApiError('');
    setResult(null);
    if (!built.ok) return;

    setLoading(true);
    let response;
    let text;
    try {
      response = await fetch(`${API_URL}/predict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(built.payload),
      });
      text = await response.text();
    } catch {
      setApiError(
        `Could not reach the API at ${API_URL}. Check that it is running `
        + '(uvicorn api:app --port 8000) and that this page is served from http://localhost:5173.',
      );
      setLoading(false);
      return;
    }
    setLoading(false);

    if (!response.ok) {
      setApiError(formatApiError(response.status, text));
      return;
    }
    try {
      const body = JSON.parse(text);
      if (typeof body.subscription_predicted !== 'string' || !Number.isFinite(body.probability_of_yes)) {
        throw new Error('missing fields');
      }
      setResult(body);
    } catch {
      setApiError(`The server at ${API_URL} answered, but not with a prediction. Is this the right API address?`);
    }
  };

  const showEarlierDetails = form.earlier !== 'none';
  const subscribes = result?.subscription_predicted === 'Yes';

  return (
    <main className="page">
      <form className="card" onSubmit={handleSubmit} noValidate>
        <header className="card-header">
          <h1>Customer Subscription Prediction</h1>
          <p>Term Deposit Offer Analysis</p>
        </header>

        <FieldRow id="age" icon={FaUserTie} label="Age" error={errors.age}>
          <input id="age" type="number" step="1" placeholder="ex: 40"
            min={LIMITS.age[0]} max={LIMITS.age[1]} value={form.age} onChange={update('age')} />
        </FieldRow>

        <FieldRow id="balance" icon={FaCoins} label="Balance (€)" error={errors.balance}>
          <input id="balance" type="number" step="any" placeholder="ex: 1000"
            value={form.balance} onChange={update('balance')} />
        </FieldRow>

        <FieldRow id="job" icon={FaBriefcase} label="Job" error={errors.job}>
          <SelectInput id="job" value={form.job} onChange={update('job')} placeholder="Select job"
            options={JOBS} labelOf={(job) => capitalize(job.replace('.', ''))} />
        </FieldRow>

        <FieldRow id="marital" icon={FaHeart} label="Marital status" error={errors.marital}>
          <SelectInput id="marital" value={form.marital} onChange={update('marital')}
            placeholder="Select marital status" options={MARITAL} labelOf={capitalize} />
        </FieldRow>

        <FieldRow id="housing" icon={FaHome} label="Housing loan" error={errors.housing}>
          <SelectInput id="housing" value={form.housing} onChange={update('housing')}
            placeholder="Select housing loan" options={HOUSING} labelOf={capitalize} />
        </FieldRow>

        <FieldRow id="campaign" icon={FaPhoneAlt} label="Contacts in this campaign" error={errors.campaign}>
          <input id="campaign" type="number" step="1"
            min={LIMITS.campaign[0]} max={LIMITS.campaign[1]} value={form.campaign} onChange={update('campaign')} />
        </FieldRow>

        <FieldRow id="earlier" icon={FaHistory} label="Previous campaign" error={errors.earlier}>
          <SelectInput id="earlier" value={form.earlier} onChange={update('earlier')}
            options={EARLIER} labelOf={(option) => EARLIER_LABELS[option]} />
        </FieldRow>

        {showEarlierDetails && (
          <>
            <FieldRow id="previous" icon={FaPhoneAlt} label="Number of earlier contacts" error={errors.previous}>
              <input id="previous" type="number" step="1" placeholder="ex: 2"
                min={LIMITS.previous[0]} max={LIMITS.previous[1]} value={form.previous} onChange={update('previous')} />
            </FieldRow>
            <FieldRow id="pdays" icon={FaHistory} label="Days since the last contact" error={errors.pdays}>
              <input id="pdays" type="number" step="1" placeholder="ex: 90"
                min={LIMITS.pdays[0]} max={LIMITS.pdays[1]} value={form.pdays} onChange={update('pdays')} />
            </FieldRow>
          </>
        )}

        <button type="submit" className="submit" disabled={loading}>
          {loading ? 'Predicting...' : 'PREDICT SUBSCRIPTION'}
        </button>

        {apiError && <p className="banner-error" role="alert">{apiError}</p>}

        {result && (
          <section className="result" aria-live="polite">
            <h2>Prediction analysis</h2>
            <p>
              Subscription status:{' '}
              <strong className={subscribes ? 'yes' : 'no'}>{result.subscription_predicted}</strong>
            </p>
            <p>Probability: {(result.probability_of_yes * 100).toFixed(2)}%</p>
          </section>
        )}
      </form>
    </main>
  );
}
