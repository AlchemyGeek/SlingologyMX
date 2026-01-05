// Currency formatting utilities

export const CURRENCY_SYMBOLS: Record<string, string> = {
  USD: "$",
  EUR: "€",
  GBP: "£",
  CAD: "CA$",
  AUD: "A$",
  JPY: "¥",
  CHF: "CHF",
  ZAR: "R",
};

export const formatCurrency = (amount: number, currencyCode: string = "USD"): string => {
  const symbol = CURRENCY_SYMBOLS[currencyCode] || currencyCode;
  
  // JPY doesn't use decimals
  if (currencyCode === "JPY") {
    return `${symbol}${Math.round(amount).toLocaleString()}`;
  }
  
  return `${symbol}${amount.toFixed(2)}`;
};

export const getCurrencySymbol = (currencyCode: string = "USD"): string => {
  return CURRENCY_SYMBOLS[currencyCode] || currencyCode;
};
