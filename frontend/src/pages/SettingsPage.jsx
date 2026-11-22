import { useState } from 'react';
import PageHeader from '../components/PageHeader.jsx';
import InlineAlert from '../components/InlineAlert.jsx';
import {
  CURRENCIES,
  LOCALES,
  formatCompactCurrency,
  formatCurrency,
  getCurrencySymbol,
} from '../utils/format.js';
import { useSettings } from '../context/SettingsContext.jsx';
import { usePageTitle } from '../hooks/usePageTitle.js';

export default function SettingsPage() {
  usePageTitle('Settings');
  const { currency, locale, save } = useSettings();
  const [nextCurrency, setNextCurrency] = useState(currency);
  const [nextLocale, setNextLocale] = useState(locale);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);

  const handleSubmit = (event) => {
    event.preventDefault();
    setError(null);

    if (!CURRENCIES.some((item) => item.code === nextCurrency)) {
      setError('Choose a supported currency.');
      return;
    }
    if (!LOCALES.some((item) => item.code === nextLocale)) {
      setError('Choose a supported country format.');
      return;
    }

    save(nextCurrency, nextLocale);
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2500);
  };

  return (
    <>
      <PageHeader
        eyebrow="Workspace"
        title="Settings"
        description="Choose any currency and country format for expense amounts and dates."
      />

      <div className="settings-layout">
        <section className="card" aria-labelledby="settings-form-title">
          <h2 id="settings-form-title">Regional settings</h2>
          <p className="settings-description">
            Your choice is saved in this browser and applied everywhere in the
            dashboard.
          </p>

          <form className="settings-form" onSubmit={handleSubmit}>
            {error ? <InlineAlert message={error} /> : null}

            <label htmlFor="settings-currency">Currency</label>
            <select
              id="settings-currency"
              value={nextCurrency}
              onChange={(event) => setNextCurrency(event.target.value)}
            >
              {CURRENCIES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>

            <label htmlFor="settings-locale">Country format</label>
            <select
              id="settings-locale"
              value={nextLocale}
              onChange={(event) => setNextLocale(event.target.value)}
            >
              {LOCALES.map((item) => (
                <option key={item.code} value={item.code}>
                  {item.label}
                </option>
              ))}
            </select>

            <button type="submit" className="btn btn-primary">
              Save settings
            </button>
            {saved ? (
              <p className="settings-saved" role="status">
                Settings saved.
              </p>
            ) : null}
          </form>
        </section>

        <section className="card" aria-labelledby="settings-preview-title">
          <h2 id="settings-preview-title">Preview</h2>
          <p className="settings-description">How amounts will appear.</p>
          <div className="settings-preview">
            <span>Symbol</span>
            <strong>{getCurrencySymbol()}</strong>
          </div>
          <div className="settings-preview">
            <span>Sample amount</span>
            <strong>{formatCurrency(1234.56)}</strong>
          </div>
          <div className="settings-preview">
            <span>Compact</span>
            <strong>{formatCompactCurrency(1234.56)}</strong>
          </div>
        </section>
      </div>
    </>
  );
}
