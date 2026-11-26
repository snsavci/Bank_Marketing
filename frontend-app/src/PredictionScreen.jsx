import { useEffect, useState } from 'react';
import {
  FaBriefcase, FaCoins, FaHeart, FaHistory, FaHome, FaPhoneAlt, FaUserTie,
} from 'react-icons/fa';
import ResultPanel from './ResultPanel.jsx';
import { predict } from './predictApi.js';
import {
  EARLIER, HOUSING, JOBS, LIMITS, MARITAL, apiBaseUrl, buildRequest, initialForm,
} from './predictionForm.js';
import { parseThreshold } from './resultView.js';

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
  const [threshold, setThreshold] = useState(null);

  // The decision threshold is shown next to the result. It is optional: any failure leaves it null,
  // and the next successful prediction asks again (the API may have been started after the page).
  async function loadThreshold(isCurrent = () => true) {
    try {
      const response = await fetch(`${API_URL}/health`);
      const value = parseThreshold(await response.text());
      if (value !== null && isCurrent()) setThreshold(value);
    } catch {
      // no threshold, the prediction still works
    }
  }

  useEffect(() => {
    let current = true; // ignores a stale answer after unmount (StrictMode runs this effect twice)
    loadThreshold(() => current);
    return () => { current = false; };
  }, []);

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
    let answer;
    try {
      answer = await predict(API_URL, built.payload);
    } finally {
      setLoading(false);
    }

    if (!answer.ok) {
      setApiError(answer.message);
      return;
    }
    setResult(answer.body);
    if (threshold === null) loadThreshold();
  };

  const showEarlierDetails = form.earlier !== 'none';

  return (
    <>
      <header className="hero">
        <h1>Customer Subscription Prediction</h1>
        <p>Term deposit offer analysis</p>
      </header>

      <main className="layout">
        <form className="card" onSubmit={handleSubmit} noValidate>
          <fieldset className="group">
            <legend>Customer profile</legend>
            <div className="grid2">
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
                  min={LIMITS.campaign[0]} max={LIMITS.campaign[1]} value={form.campaign}
                  onChange={update('campaign')} />
              </FieldRow>
            </div>
          </fieldset>

          <fieldset className="group">
            <legend>Previous campaign</legend>
            <FieldRow id="earlier" icon={FaHistory} label="Outcome" error={errors.earlier}>
              <SelectInput id="earlier" value={form.earlier} onChange={update('earlier')}
                options={EARLIER} labelOf={(option) => EARLIER_LABELS[option]} />
            </FieldRow>

            {showEarlierDetails && (
              <div className="grid2">
                <FieldRow id="previous" icon={FaPhoneAlt} label="Number of earlier contacts" error={errors.previous}>
                  <input id="previous" type="number" step="1" placeholder="ex: 2"
                    min={LIMITS.previous[0]} max={LIMITS.previous[1]} value={form.previous}
                    onChange={update('previous')} />
                </FieldRow>
                <FieldRow id="pdays" icon={FaHistory} label="Days since the last contact" error={errors.pdays}>
                  <input id="pdays" type="number" step="1" placeholder="ex: 90"
                    min={LIMITS.pdays[0]} max={LIMITS.pdays[1]} value={form.pdays} onChange={update('pdays')} />
                </FieldRow>
              </div>
            )}
          </fieldset>

          <button type="submit" className="submit" disabled={loading}>
            {loading ? 'Predicting...' : 'Predict subscription'}
          </button>

          {apiError && <p className="banner-error" role="alert">{apiError}</p>}
        </form>

        <ResultPanel loading={loading} result={result} threshold={threshold} />
      </main>
    </>
  );
}
