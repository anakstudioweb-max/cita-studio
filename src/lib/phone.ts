import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js";

export type UsPhoneResult =
  | { ok: true; e164: string; national: string }
  | { ok: false; error: string };

const US: CountryCode = "US";

/**
 * Parse and validate a United States (NANP) phone number.
 * Accepts (832) 362-1746, 8323621746, +18323621746, etc.
 * Returns E.164 (+1XXXXXXXXXX) on success.
 */
export function parseUsPhone(input: string): UsPhoneResult {
  const raw = (input || "").trim();
  if (!raw) {
    return { ok: false, error: "Enter a US mobile number" };
  }

  // Prefer explicit +country; otherwise default to US.
  const parsed = raw.startsWith("+")
    ? parsePhoneNumberFromString(raw)
    : parsePhoneNumberFromString(raw, US);

  if (!parsed || !parsed.isValid()) {
    return {
      ok: false,
      error: "Enter a valid US phone number (10 digits, +1)",
    };
  }

  if (parsed.country !== "US" && parsed.countryCallingCode !== "1") {
    return {
      ok: false,
      error: "Only United States (+1) numbers are accepted",
    };
  }

  // NANP national number is 10 digits.
  const national = parsed.nationalNumber;
  if (national.length !== 10) {
    return {
      ok: false,
      error: "Enter a valid US phone number (10 digits, +1)",
    };
  }

  // Reject non-US territories that share +1 if lib marked them differently;
  // require US country when available.
  if (parsed.country && parsed.country !== "US") {
    return {
      ok: false,
      error: "Only United States (+1) numbers are accepted",
    };
  }

  return {
    ok: true,
    e164: parsed.format("E.164"),
    national: parsed.formatNational(),
  };
}

/** True if string is a valid US E.164 / national number. */
export function isValidUsPhone(input: string): boolean {
  return parseUsPhone(input).ok;
}

/** Normalize to E.164 or null. */
export function toUsE164(input: string): string | null {
  const r = parseUsPhone(input);
  return r.ok ? r.e164 : null;
}
