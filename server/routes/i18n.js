import express from "express";
import { getContentMap, TARGET_LANGS } from "../utils/translate.js";

const router = express.Router();

// GET /api/i18n/:lang -> { englishText: translatedText, ... }
// Public. The client merges this map into its content dictionary so dynamic DB
// content (shop/product names & descriptions) renders in the active language,
// including items added after the app was built. English needs no map.
router.get("/:lang", async (req, res, next) => {
  try {
    const lang = String(req.params.lang || "").toLowerCase();
    if (!TARGET_LANGS.includes(lang)) return res.json({});
    const map = await getContentMap(lang);
    res.json(map);
  } catch (err) {
    next(err);
  }
});

export default router;
