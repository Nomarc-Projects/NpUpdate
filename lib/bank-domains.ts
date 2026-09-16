/**
 * Maps Paystack bank codes → website domain (for logo via clearbit)
 * and → search keywords/aliases users might type.
 */

export const BANK_LOGO_DOMAINS: Record<string, string> = {
  "044": "accessbankplc.com",       // Access Bank
  "063": "accessbankplc.com",       // Access Bank (Diamond legacy)
  "023": "citibank.com.ng",         // Citibank Nigeria
  "050": "ecobank.com",             // Ecobank Nigeria
  "011": "firstbanknigeria.com",    // First Bank of Nigeria
  "214": "fcmb.com",                // First City Monument Bank
  "070": "fidelitybank.ng",         // Fidelity Bank
  "058": "gtbank.com",              // Guaranty Trust Bank
  "030": "heritagebank.com.ng",     // Heritage Bank
  "082": "keystonebankng.com",      // Keystone Bank
  "301": "jaizbank.com",            // Jaiz Bank
  "076": "polaris-bank.com",        // Polaris Bank (formerly Skye)
  "221": "stanbicibtcbank.com",     // Stanbic IBTC Bank
  "068": "sc.com",                  // Standard Chartered
  "232": "sterlingbank.com.ng",     // Sterling Bank
  "100": "suntrust.com.ng",         // SunTrust Bank
  "033": "ubagroup.com",            // United Bank for Africa
  "032": "unionbankng.com",         // Union Bank of Nigeria
  "035": "wemabank.com",            // Wema Bank
  "057": "zenithbank.com",          // Zenith Bank
  "035A": "wemabank.com",           // ALAT by Wema
  "110": "providusbankng.com",      // Providus Bank
  "304": "stanbicibtcbank.com",     // Stanbic Mobile
  "100004": "kuda.com",             // Kuda Bank
  "999992": "opayweb.com",          // OPay
  "999991": "palmpay.com",          // PalmPay
  "100033": "moniepoint.com",       // Moniepoint MFB
  "090115": "vfd.com.ng",           // VFD Microfinance Bank
  "090267": "kuda.com",             // Kuda (alt code)
  "50515": "moniepoint.com",        // Moniepoint (alt)
  "120001": "9psb.com.ng",          // 9Payment Service Bank
  "090270": "carbon.ng",            // Carbon (One Finance)
  "100002": "paga.com",             // Paga
  "100003": "paycom.com.ng",        // Paycom (OPay old)
};

/** Aliases / nicknames people use when searching for Nigerian banks */
export const BANK_ALIASES: Record<string, string> = {
  "044": "access diamond dbng",
  "063": "access diamond dbng",
  "011": "first bank fbn fbnil firstbank",
  "058": "gtb gt bank gtbank guaranty guarantee trust gtco",
  "057": "zenith",
  "033": "uba united bank africa",
  "214": "fcmb first city monument",
  "070": "fidelity",
  "030": "heritage",
  "082": "keystone",
  "301": "jaiz islamic",
  "076": "polaris skye",
  "221": "stanbic ibtc",
  "068": "stanchart sc standard chartered",
  "232": "sterling",
  "100": "suntrust sun trust",
  "032": "union",
  "035": "wema",
  "035A": "alat wema",
  "110": "providus",
  "100004": "kuda kuda mfb",
  "999992": "opay o-pay o pay digital",
  "999991": "palmpay palm pay",
  "100033": "moniepoint monie point teamapt",
  "090115": "vfd vbank",
  "120001": "9psb 9payment nine payment",
  "090270": "carbon one finance",
  "100002": "paga",
  "050": "eco ecobank",
  "023": "citi citibank",
};

export function getBankLogoUrl(bankCode: string | null): string | null {
  if (!bankCode) return null;
  const domain = BANK_LOGO_DOMAINS[bankCode];
  if (!domain) return null;
  return `https://www.google.com/s2/favicons?domain=${domain}&sz=128`;
}

export function getBankKeywords(bankCode: string): string {
  return BANK_ALIASES[bankCode] ?? "";
}
