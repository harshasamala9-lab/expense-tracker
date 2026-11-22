const STORAGE_CURRENCY = 'expense-tracker-currency';
const STORAGE_LOCALE = 'expense-tracker-locale';

export const CURRENCIES = Object.freeze([
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'GBP', label: 'British Pound (£)' },
  { code: 'INR', label: 'Indian Rupee (₹)' },
  { code: 'JPY', label: 'Japanese Yen (¥)' },
  { code: 'CNY', label: 'Chinese Yuan (¥)' },
  { code: 'AED', label: 'UAE Dirham' },
  { code: 'SAR', label: 'Saudi Riyal' },
  { code: 'AUD', label: 'Australian Dollar' },
  { code: 'CAD', label: 'Canadian Dollar' },
  { code: 'SGD', label: 'Singapore Dollar' },
  { code: 'PKR', label: 'Pakistani Rupee' },
  { code: 'BDT', label: 'Bangladeshi Taka' },
  { code: 'NGN', label: 'Nigerian Naira' },
  { code: 'KES', label: 'Kenyan Shilling' },
  { code: 'ZAR', label: 'South African Rand' },
  { code: 'BRL', label: 'Brazilian Real' },
  { code: 'MXN', label: 'Mexican Peso' },
]);

export const LOCALES = Object.freeze([
  { code: 'en-US', label: 'English (United States)' },
  { code: 'en-GB', label: 'English (United Kingdom)' },
  { code: 'en-IN', label: 'English (India)' },
  { code: 'en-AE', label: 'English (UAE)' },
  { code: 'en-SG', label: 'English (Singapore)' },
  { code: 'en-AU', label: 'English (Australia)' },
  { code: 'en-CA', label: 'English (Canada)' },
  { code: 'ja-JP', label: '日本語 (Japan)' },
  { code: 'zh-CN', label: '中文 (China)' },
  { code: 'fr-FR', label: 'Français (France)' },
  { code: 'de-DE', label: 'Deutsch (Germany)' },
  { code: 'es-ES', label: 'Español (Spain)' },
  { code: 'pt-BR', label: 'Português (Brazil)' },
  { code: 'ar-SA', label: 'العربية (Saudi Arabia)' },
]);

function read(key, fallback) {
  try {
    const value = window.localStorage.getItem(key);
    return value || fallback;
  } catch {
    return fallback;
  }
}

let currency = read(STORAGE_CURRENCY, import.meta.env.VITE_CURRENCY || 'USD');
let locale = read(STORAGE_LOCALE, 'en-US');

export function getCurrencyCode() {
  return currency;
}

export function getLocaleCode() {
  return locale;
}

export function setCurrencySettings(nextCurrency, nextLocale) {
  currency = nextCurrency;
  locale = nextLocale;

  try {
    window.localStorage.setItem(STORAGE_CURRENCY, nextCurrency);
    window.localStorage.setItem(STORAGE_LOCALE, nextLocale);
  } catch {
    // Storage may be disabled; settings still apply to this session.
  }
}

function formatterOptions() {
  const zeroDecimal = ['JPY', 'KRW', 'VND', 'CLP'].includes(currency);
  return {
    style: 'currency',
    currency,
    minimumFractionDigits: zeroDecimal ? 0 : 2,
    maximumFractionDigits: zeroDecimal ? 0 : 2,
  };
}

export function formatCurrency(value) {
  const amount = Number(value);
  return new Intl.NumberFormat(locale, formatterOptions()).format(
    Number.isFinite(amount) ? amount : 0,
  );
}

export function formatCompactCurrency(value) {
  const amount = Number(value);
  return new Intl.NumberFormat(locale, {
    ...formatterOptions(),
    notation: 'compact',
    maximumFractionDigits: 1,
    minimumFractionDigits: 0,
  }).format(Number.isFinite(amount) ? amount : 0);
}

export function getCurrencySymbol() {
  return (
    new Intl.NumberFormat(locale, formatterOptions())
      .formatToParts(0)
      .find((part) => part.type === 'currency')?.value ?? currency
  );
}

export function formatDate(isoDate) {
  if (!isoDate) {
    return '—';
  }

  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function formatShortDate(isoDate) {
  if (!isoDate) {
    return '—';
  }

  const date = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(date.getTime())) {
    return isoDate;
  }

  return date.toLocaleDateString(locale, {
    month: 'short',
    day: 'numeric',
  });
}

export function todayISO() {
  const now = new Date();
  const local = new Date(now.getTime() - now.getTimezoneOffset() * 60_000);
  return local.toISOString().slice(0, 10);
}

export function percentage(part, total) {
  if (!total) {
    return 0;
  }
  return Math.round((part / total) * 100);
}
