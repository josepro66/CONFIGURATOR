// Central PayU config and currency helpers for the configurators (sandbox by default)

// IMPORTANT: Replace these with your real production values when deploying.
export const PAYU_CONFIG = {
  // Public sandbox values from PayU docs. Do NOT use in production.
  API_KEY: "4Vj8eK4rloUd272L48hsrarnUA",
  MERCHANT_ID: "508029",

  // App flags and callback URLs
  TEST_MODE: true,
  CONFIRMATION_URL: "https://example.com/payu/confirmation", // backend webhook (change in prod)
  RESPONSE_URL: "https://example.com/payu/response", // user landing after payment (change in prod)
};

// Common sandbox checkout URL
const PAYU_SANDBOX_URL = "https://sandbox.checkout.payulatam.com/ppp-web-gateway-payu/";

// Currency helpers return the correct account, amount and formatting per product
export function getMixoCurrencyConfig(currency) {
  const map = {
    USD: { accountId: "512321", amount: "200.00", symbol: "$", language: "en", url: PAYU_SANDBOX_URL },
    COP: { accountId: "512322", amount: "800000", symbol: "$", language: "es", url: PAYU_SANDBOX_URL },
  };
  return map[currency] || map.USD;
}

export function getKnoboCurrencyConfig(currency) {
  const map = {
    USD: { accountId: "512321", amount: "100.00", symbol: "$", language: "en", url: PAYU_SANDBOX_URL },
    COP: { accountId: "512322", amount: "400000", symbol: "$", language: "es", url: PAYU_SANDBOX_URL },
  };
  return map[currency] || map.USD;
}

// Optionally provided for older components that might still reference Loopo helper
export function getLoopoCurrencyConfig(currency) {
  const map = {
    USD: { accountId: "512321", amount: "150.00", symbol: "$", language: "en", url: PAYU_SANDBOX_URL },
    COP: { accountId: "512322", amount: "600000", symbol: "$", language: "es", url: PAYU_SANDBOX_URL },
  };
  return map[currency] || map.USD;
}


