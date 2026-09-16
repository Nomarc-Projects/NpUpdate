/**
 * Static Nigerian bank list (code + name), alphabetical.
 *
 * Replaces a `/api/paystack/banks` fetch. That route, and the account-name
 * resolver beside it, were removed when on-platform payouts were parked — the
 * resolver returned the real name behind any account number with no auth, which
 * made it an enumeration oracle, and neither endpoint had a reachable consumer
 * left. Both now live in the standalone `paystack-bank-verify` repo.
 *
 * Codes are NIBSS/Paystack institution codes and change rarely. Anything that
 * needs a guaranteed-current list should call Paystack directly from the server,
 * behind a session check.
 */
export type Bank = { code: string; name: string };

export const NIGERIAN_BANKS: Bank[] = [
  { code: "044", name: "Access Bank" },
  { code: "090405", name: "Carbon" },
  { code: "023", name: "Citibank Nigeria" },
  { code: "063", name: "Diamond Bank" },
  { code: "050", name: "Ecobank Nigeria" },
  { code: "084", name: "Enterprise Bank" },
  { code: "070", name: "Fidelity Bank" },
  { code: "011", name: "First Bank of Nigeria" },
  { code: "214", name: "First City Monument Bank" },
  { code: "058", name: "Guaranty Trust Bank" },
  { code: "030", name: "Heritage Bank" },
  { code: "301", name: "Jaiz Bank" },
  { code: "082", name: "Keystone Bank" },
  { code: "50211", name: "Kuda Bank" },
  { code: "50515", name: "Moniepoint" },
  { code: "999992", name: "OPay" },
  { code: "999991", name: "PalmPay" },
  { code: "526", name: "Parallex Bank" },
  { code: "305", name: "PiggyVest" },
  { code: "076", name: "Polaris Bank" },
  { code: "101", name: "Providus Bank" },
  { code: "221", name: "Stanbic IBTC Bank" },
  { code: "068", name: "Standard Chartered Bank" },
  { code: "232", name: "Sterling Bank" },
  { code: "100", name: "Suntrust Bank" },
  { code: "032", name: "Union Bank of Nigeria" },
  { code: "033", name: "United Bank for Africa" },
  { code: "215", name: "Unity Bank" },
  { code: "035", name: "Wema Bank" },
  { code: "057", name: "Zenith Bank" },
];
