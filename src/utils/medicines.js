import { sql } from "drizzle-orm";

import { medicines } from "../../drizzle/schema.js";

/**
 * Doctors type medicine names freehand — there is no picker in the app. This
 * resolves that text to a `medicines` row so the item can be stock-checked and
 * dispensed later; when nothing matches, the caller falls back to storing
 * `prescription_items.medicine_name_freetext` and the pharmacist links it by hand.
 *
 * Three passes, most specific first:
 *   1. exact (case-insensitive, whitespace-collapsed) name
 *   2. name starts with what was typed  — "Paracetamol 650" -> "Paracetamol 650mg"
 *   3. name contains the leading word   — "Paracetamol tabs" -> "Paracetamol 650mg"
 *
 * Returns the medicine id, or null when the text is too vague to place.
 */
export const resolveMedicineId = async (runner, rawName) => {
  const typed = normalize(rawName);
  if (!typed) return null;

  // "650 mg" and "650mg" should reach the same row.
  const compact = typed.replace(/(\d)\s+(mg|ml|mcg|g|iu)\b/gi, "$1$2");
  const normalizedName = sql`lower(regexp_replace(${medicines.name}, '\\s+', ' ', 'g'))`;

  const exact = await runner
    .select({ id: medicines.id })
    .from(medicines)
    .where(sql`${normalizedName} in (${typed}, ${compact})`)
    .limit(1);
  if (exact.length) return exact[0].id;

  const prefix = await runner
    .select({ id: medicines.id })
    .from(medicines)
    .where(sql`${normalizedName} like ${compact + "%"}`)
    .orderBy(medicines.name)
    .limit(1);
  if (prefix.length) return prefix[0].id;

  // Last resort: the leading word is usually the salt or brand. Guard against
  // one- and two-letter fragments matching half the catalogue.
  const leadWord = compact.split(" ")[0];
  if (leadWord.length < 4) return null;

  const partial = await runner
    .select({ id: medicines.id })
    .from(medicines)
    .where(sql`${normalizedName} like ${"%" + leadWord + "%"}`)
    .orderBy(medicines.name)
    .limit(1);

  return partial.length ? partial[0].id : null;
};

/**
 * Works out how many units to dispense, because the prescribing screen has no
 * quantity field but `prescription_items.quantity` is NOT NULL and the pharmacy
 * side needs a number to decrement stock by.
 *
 * Reads doses/day out of the "1-0-1" pattern doctors use and multiplies by the
 * day count in the duration ("5 days"). Falls back to 1 when neither parses.
 */
export const inferQuantity = (frequency, duration) => {
  const perDay = dosesPerDay(frequency);
  const days = durationInDays(duration);

  if (!perDay || !days) return 1;
  return Math.min(perDay * days, 1000);
};

const normalize = (value) =>
  typeof value === "string" ? value.toLowerCase().replace(/\s+/g, " ").trim() : "";

const dosesPerDay = (frequency) => {
  const text = normalize(frequency);
  if (!text) return 0;

  // "1-0-1", "1-1-1 (after food)" — sum the slots.
  const pattern = text.match(/\d+(?:\s*-\s*\d+)+/);
  if (pattern) {
    return pattern[0]
      .split("-")
      .reduce((total, slot) => total + Number(slot.trim()), 0);
  }

  if (/\bonce\b/.test(text)) return 1;
  if (/\btwice\b|\bbd\b/.test(text)) return 2;
  if (/\bthrice\b|\btds\b|\btid\b/.test(text)) return 3;

  return 0;
};

const durationInDays = (duration) => {
  const text = normalize(duration);
  const amount = Number(text.match(/\d+/)?.[0] ?? 0);
  if (!amount) return 0;

  if (/week/.test(text)) return amount * 7;
  if (/month/.test(text)) return amount * 30;
  return amount; // bare numbers and "5 days" alike
};
