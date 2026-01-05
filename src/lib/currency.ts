// Currency formatting utilities - ISO 4217 codes

export const CURRENCY_SYMBOLS: Record<string, string> = {
  // Americas
  USD: "$",
  CAD: "CA$",
  // Europe
  EUR: "€",
  GBP: "£",
  CHF: "CHF",
  SEK: "kr",
  NOK: "kr",
  DKK: "kr",
  PLN: "zł",
  CZK: "Kč",
  HUF: "Ft",
  RON: "lei",
  ISK: "kr",
  // Asia-Pacific
  JPY: "¥",
  AUD: "A$",
  NZD: "NZ$",
  // Africa
  ZAR: "R",
  EGP: "E£",
  MAD: "د.م.",
  // Middle East / Arabic
  AED: "د.إ",
  SAR: "﷼",
  QAR: "﷼",
  KWD: "د.ك",
  BHD: "د.ب",
  OMR: "﷼",
  JOD: "د.ا",
};

// Currencies that don't use decimal places
const NO_DECIMAL_CURRENCIES = ["JPY", "KRW", "HUF", "ISK"];

export const formatCurrency = (amount: number, currencyCode: string = "USD"): string => {
  const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode;
  
  if (NO_DECIMAL_CURRENCIES.includes(currencyCode)) {
    return `${symbol}${Math.round(amount).toLocaleString()}`;
  }
  
  return `${symbol}${amount.toFixed(2)}`;
};

export const getCurrencySymbol = (currencyCode: string = "USD"): string => {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode;
};
