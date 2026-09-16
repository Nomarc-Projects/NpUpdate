// Country dialing data for PhoneInput / country selects. Factual reference data.
// flag emoji is derived from the ISO2 code at render time.
export type Country = { name: string; iso2: string; dial: string };

export function flagEmoji(iso2: string) {
  return iso2.toUpperCase().replace(/./g, (c) => String.fromCodePoint(127397 + c.charCodeAt(0)));
}

// Nigeria first (primary market), then broad coverage (all of Africa + majors).
export const COUNTRIES: Country[] = [
  { name: "Nigeria", iso2: "NG", dial: "+234" },
  { name: "Ghana", iso2: "GH", dial: "+233" },
  { name: "Kenya", iso2: "KE", dial: "+254" },
  { name: "South Africa", iso2: "ZA", dial: "+27" },
  { name: "Egypt", iso2: "EG", dial: "+20" },
  { name: "Benin", iso2: "BJ", dial: "+229" },
  { name: "Cameroon", iso2: "CM", dial: "+237" },
  { name: "Côte d'Ivoire", iso2: "CI", dial: "+225" },
  { name: "Ethiopia", iso2: "ET", dial: "+251" },
  { name: "Senegal", iso2: "SN", dial: "+221" },
  { name: "Tanzania", iso2: "TZ", dial: "+255" },
  { name: "Uganda", iso2: "UG", dial: "+256" },
  { name: "Rwanda", iso2: "RW", dial: "+250" },
  { name: "Morocco", iso2: "MA", dial: "+212" },
  { name: "Algeria", iso2: "DZ", dial: "+213" },
  { name: "Tunisia", iso2: "TN", dial: "+216" },
  { name: "Zambia", iso2: "ZM", dial: "+260" },
  { name: "Zimbabwe", iso2: "ZW", dial: "+263" },
  { name: "Angola", iso2: "AO", dial: "+244" },
  { name: "Togo", iso2: "TG", dial: "+228" },
  { name: "Niger", iso2: "NE", dial: "+227" },
  { name: "Mali", iso2: "ML", dial: "+223" },
  { name: "Burkina Faso", iso2: "BF", dial: "+226" },
  { name: "Sierra Leone", iso2: "SL", dial: "+232" },
  { name: "Liberia", iso2: "LR", dial: "+231" },
  { name: "United States", iso2: "US", dial: "+1" },
  { name: "United Kingdom", iso2: "GB", dial: "+44" },
  { name: "Canada", iso2: "CA", dial: "+1" },
  { name: "Germany", iso2: "DE", dial: "+49" },
  { name: "France", iso2: "FR", dial: "+33" },
  { name: "Netherlands", iso2: "NL", dial: "+31" },
  { name: "Spain", iso2: "ES", dial: "+34" },
  { name: "Italy", iso2: "IT", dial: "+39" },
  { name: "Ireland", iso2: "IE", dial: "+353" },
  { name: "United Arab Emirates", iso2: "AE", dial: "+971" },
  { name: "Saudi Arabia", iso2: "SA", dial: "+966" },
  { name: "Qatar", iso2: "QA", dial: "+974" },
  { name: "India", iso2: "IN", dial: "+91" },
  { name: "China", iso2: "CN", dial: "+86" },
  { name: "Japan", iso2: "JP", dial: "+81" },
  { name: "Singapore", iso2: "SG", dial: "+65" },
  { name: "Australia", iso2: "AU", dial: "+61" },
  { name: "Brazil", iso2: "BR", dial: "+55" },
  { name: "Turkey", iso2: "TR", dial: "+90" },
];
