import mongoose from "mongoose";

// Cache of machine translations for dynamic DB content (shop/product names and
// descriptions). Keyed by the exact English source string + target language, so
// each unique string is only fetched from the translation API once and then
// served from here forever. Populated lazily on content create/update and by a
// startup backfill.
const translationSchema = new mongoose.Schema(
  {
    text: { type: String, required: true }, // source English string
    lang: { type: String, required: true }, // target language code (ta, hi, …)
    translated: { type: String, required: true },
  },
  { timestamps: true }
);

// One cached translation per (source text, target language).
translationSchema.index({ text: 1, lang: 1 }, { unique: true });

export default mongoose.model("Translation", translationSchema);
