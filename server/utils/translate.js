import Translation from "../models/Translation.js";

// Target languages we auto-translate dynamic content into. English is the source
// (base) language, so it is never translated.
export const TARGET_LANGS = ["ta", "hi"];

const MYMEMORY_URL = "https://api.mymemory.translated.net/get";

// Call the free MyMemory API to translate one English string into `lang`.
// Returns the translated text, or null on any failure/empty result so callers
// can gracefully fall back to the original English.
async function fetchTranslation(text, lang) {
  try {
    const params = new URLSearchParams({ q: text, langpair: `en|${lang}` });
    // A contact email (optional) raises MyMemory's anonymous daily quota.
    if (process.env.MYMEMORY_EMAIL) params.set("de", process.env.MYMEMORY_EMAIL);

    const res = await fetch(`${MYMEMORY_URL}?${params.toString()}`);
    if (!res.ok) return null;
    const data = await res.json();
    const out = data?.responseData?.translatedText;
    if (!out || typeof out !== "string") return null;
    // MyMemory returns warning strings in this field when it fails/limits.
    if (/MYMEMORY WARNING|QUERY LENGTH LIMIT|INVALID/i.test(out)) return null;
    // If it just echoes the input back, treat as "no translation".
    if (out.trim().toLowerCase() === text.trim().toLowerCase()) return null;
    return out;
  } catch {
    return null;
  }
}

// Ensure translations exist (cached in the DB) for every (text × lang) pair.
// Skips anything already cached, translates the rest via MyMemory one-at-a-time
// (the free tier is rate-limited), and upserts each result. Resilient: a failed
// item is simply skipped and can be retried on a later run. Returns the count of
// newly cached translations.
export async function ensureTranslations(texts, langs = TARGET_LANGS) {
  const clean = [...new Set((texts || []).map((t) => String(t || "").trim()).filter(Boolean))];
  if (clean.length === 0) return 0;

  let added = 0;
  for (const lang of langs) {
    // Find which of these strings are already cached for this language.
    const existing = await Translation.find({ lang, text: { $in: clean } }).select("text");
    const have = new Set(existing.map((e) => e.text));
    const missing = clean.filter((t) => !have.has(t));

    for (const text of missing) {
      const translated = await fetchTranslation(text, lang);
      if (!translated) continue;
      await Translation.updateOne(
        { text, lang },
        { $set: { text, lang, translated } },
        { upsert: true }
      );
      added++;
      // Be gentle with the free API to avoid tripping rate limits.
      await new Promise((r) => setTimeout(r, 200));
    }
  }
  return added;
}

// Fire-and-forget helper for request handlers: translate content in the
// background without blocking (or failing) the API response.
export function queueTranslations(texts, langs = TARGET_LANGS) {
  ensureTranslations(texts, langs).catch((err) =>
    console.error("Background translation failed:", err.message)
  );
}

// Build the { englishText: translatedText } map the client merges into its
// content dictionary for a given language.
export async function getContentMap(lang) {
  const rows = await Translation.find({ lang }).select("text translated");
  const map = {};
  for (const r of rows) map[r.text] = r.translated;
  return map;
}
