type Bank = { code: string; name: string };

const WEIGHTS = [3, 7, 3, 3, 7, 3, 3, 7, 3];

/**
 * Known account-number prefixes for Nigerian fintech/mobile-money operators.
 * These accounts are NUBAN-formatted but their sort codes (5-6 digits) aren't
 * the first 3 digits, so we use a dedicated prefix map.
 */
const FINTECH_PREFIX: Record<string, string> = {
  // OPay Digital Services — 999992
  "700": "999992", "701": "999992", "702": "999992", "703": "999992",
  "704": "999992", "705": "999992", "706": "999992", "707": "999992",
  "708": "999992", "900": "999992", "901": "999992", "902": "999992",
  "903": "999992", "904": "999992", "905": "999992", "906": "999992",
  // PalmPay — 999991
  "800": "999991", "801": "999991", "803": "999991", "807": "999991",
  // Kuda MFB — 50211
  "227": "50211",
  // Moniepoint MFB — 50515
  "814": "50515", "070": "50515",
};

/**
 * Given a 10-digit NUBAN account number, return the bank(s) whose sort code
 * produces a valid check digit.
 *
 * Algorithm (CBN NUBAN spec):
 *   account = [serial₀..₅][check]   (positions 3-8 are serial, position 9 is check)
 *   combined = [code₀, code₁, code₂, serial₀..₅]   (9 digits)
 *   sum      = Σ combined[i] × WEIGHTS[i]
 *   calc     = 10 − (sum mod 10);  if 10 → 0
 *   valid    = calc === check
 */
export function guessBanks(accountNumber: string, bankList: Bank[]): Bank[] {
  if (accountNumber.length !== 10) return [];

  const prefix3  = accountNumber.substring(0, 3);
  const serial6  = accountNumber.substring(3, 9);   // 6 digits
  const check    = Number(accountNumber[9]);

  // Fintech accounts — prefix lookup (no NUBAN checksum applies)
  const fintechCode = FINTECH_PREFIX[prefix3];
  if (fintechCode) {
    const bank = bankList.find((b) => b.code === fintechCode);
    return bank ? [bank] : [];
  }

  // Traditional banks — try every 3-digit sort code
  const matched: Bank[] = [];
  for (const bank of bankList) {
    if (bank.code.length > 3) continue; // fintechs already handled above

    const code3    = bank.code.padStart(3, "0");
    const combined = [...code3.split("").map(Number), ...serial6.split("").map(Number)];

    let sum = 0;
    for (let i = 0; i < 9; i++) sum += combined[i] * WEIGHTS[i];

    let calc = 10 - (sum % 10);
    if (calc === 10) calc = 0;

    if (calc === check) matched.push(bank);
  }

  return matched;
}
