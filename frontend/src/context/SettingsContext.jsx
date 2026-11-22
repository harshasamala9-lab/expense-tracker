import { createContext, useCallback, useContext, useState } from 'react';
import {
  getCurrencyCode,
  getLocaleCode,
  setCurrencySettings,
} from '../utils/format.js';

const SettingsContext = createContext(null);

export function SettingsProvider({ children }) {
  const [currency, setCurrency] = useState(() => getCurrencyCode());
  const [locale, setLocale] = useState(() => getLocaleCode());

  const save = useCallback((nextCurrency, nextLocale) => {
    setCurrencySettings(nextCurrency, nextLocale);
    setCurrency(nextCurrency);
    setLocale(nextLocale);
  }, []);

  return (
    <SettingsContext.Provider value={{ currency, locale, save }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings() {
  const context = useContext(SettingsContext);
  if (!context) {
    throw new Error('useSettings must be used within a SettingsProvider');
  }
  return context;
}
