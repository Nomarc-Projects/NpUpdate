/**
 * Blocks common disposable/temporary email providers used for fraud.
 * Returns true when the domain is on the blocklist.
 * Keep additions at the bottom — do not sort, keep it scannable.
 */
const BLOCKED: ReadonlySet<string> = new Set([
  /* ── Mailinator family ───────────────────────────────── */
  "mailinator.com", "mailinator2.com", "mailinatormail.com",
  "trashmail.com", "trashmail.at", "trashmail.io", "trashmail.me",
  "trashmail.net", "trashmail.org", "trashmail.xyz",

  /* ── Guerrilla Mail ──────────────────────────────────── */
  "guerrillamail.com", "guerrillamail.info", "guerrillamail.net",
  "guerrillamail.org", "guerrillamail.de", "guerrillamail.biz",
  "grr.la", "spam4.me", "sharklasers.com", "guerrillamailblock.com",

  /* ── 10 Minute Mail & variants ───────────────────────── */
  "10minutemail.com", "10minutemail.net", "10minutemail.org",
  "10minutemail.de", "10minutemail.co.uk",
  "10minemail.com", "tenminutemail.com",
  "minutemail.com", "5minutemail.com", "20minutemail.com",

  /* ── Temp-Mail / throw-away services ─────────────────── */
  "tempmail.com", "tempmail.net", "temp-mail.org", "temp-mail.io",
  "tempinbox.com", "tempr.email", "tempsky.com",
  "throwam.com", "throwmail.com", "throwam.net",
  "dispostable.com", "disposal.com",
  "spamgourmet.com", "spamgourmet.net", "spamgourmet.org",
  "spamfree24.org", "spamfree.eu",

  /* ── Yopmail ─────────────────────────────────────────── */
  "yopmail.com", "yopmail.fr", "yopmail.net", "cool.fr.nf",
  "jetable.fr.nf", "nospam.ze.tc", "nomail.xl.cx",

  /* ── Maildrop ────────────────────────────────────────── */
  "maildrop.cc",

  /* ── Fake-inbox / anonymisers ────────────────────────── */
  "fakeinbox.com", "fakeinbox.net",
  "mailnull.com", "mailnull.net",
  "mailnesia.com",
  "crap.email",
  "trbvm.com",
  "binkmail.com",
  "boximail.com",
  "clrmail.com",
  "getairmail.com",
  "inoutmail.de", "inoutmail.eu",
  "jetable.com", "jetable.net", "jetable.org", "jetable.fr",
  "jourrapide.com",
  "koszmail.pl",
  "lifebyfood.com",
  "lookugly.com",
  "mailme24.com",
  "mailmetrash.com",
  "mailmoat.com",
  "mailscrap.com",
  "mailseal.de",
  "mailzilla.com",
  "moburl.com",
  "nwytg.net",
  "objectmail.com",
  "ownmail.net",
  "pecinan.com",
  "pecinan.net",
  "pecinan.org",
  "qq.com.br",
  "rcpt.at",
  "rppkn.com",
  "rtrtr.com",
  "smellfear.com",
  "spamtrap.ro",
  "tafmail.com",
  "teleworm.us",
  "tmail.com",
  "tmails.net",
  "trash-mail.at", "trash-mail.com", "trash-mail.de", "trash-mail.io",
  "trashdevil.com", "trashdevil.de",
  "trashmail2.com",
  "uggsrock.com",
  "vomoto.com",
  "wetrainbayarea.org",
  "yanet.me",
  "yy.com",
  "zoemail.net",
  "zoemail.org",

  /* ── Protonmail-lookalikes / catch-alls used for temp ── */
  "spamgob.com",
  "spamhereplease.com",
  "spamsphere.com",
  "spamspot.com",
  "spamthisplease.com",
  "supergreatmail.com",
  "suremail.info",
  "tempemail.co.za",
  "throwaway.email",
  "throwam.com",
  "burnermail.io",
  "mohmal.com",
  "e4ward.com",
  "filzmail.com",
  "emailisvalid.com",
  "nfmails.com",
  "wpmail.org",
  "mailnull.com",
  "spamdecoy.net",
  "deadaddress.com",
  "anonbox.net",
  "mailexpire.com",
]);

/**
 * Returns true if the email uses a disposable/temp provider.
 * Call this before hitting the server on signup.
 */
export function isDisposableEmail(email: string): boolean {
  const domain = email.split("@")[1]?.toLowerCase().trim();
  if (!domain) return false;
  return BLOCKED.has(domain);
}
