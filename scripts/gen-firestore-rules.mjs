#!/usr/bin/env node
/**
 * Writes `firestore.rules` from `firestore.rules.template`, substituting
 * `__ALLOWED_UID__` with VITE_ALLOWED_UID (from the environment, else from
 * `.env`). The generated file is git-ignored so the account identifier never
 * lands in the public repo — it lives only in `.env` and the GitHub Actions
 * secret.
 *
 * If no real UID is available the placeholder is left as a literal, and the
 * rules deny everyone — the safe default.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const templatePath = join(root, "firestore.rules.template");
const outPath = join(root, "firestore.rules");
const PLACEHOLDER = "__ALLOWED_UID__";

function uidFromEnvFile() {
  const envPath = join(root, ".env");
  if (!existsSync(envPath)) return null;
  for (const line of readFileSync(envPath, "utf8").split("\n")) {
    const m = line.match(/^\s*VITE_ALLOWED_UID\s*=\s*(.+?)\s*$/);
    if (m) return m[1].replace(/^["']|["']$/g, "");
  }
  return null;
}

const raw = process.env.VITE_ALLOWED_UID || uidFromEnvFile() || "";
const uid = raw && raw !== "__REPLACE_ME__" ? raw : "";

const template = readFileSync(templatePath, "utf8");
writeFileSync(outPath, template.replaceAll(PLACEHOLDER, uid || PLACEHOLDER));

if (uid) {
  console.log(`firestore.rules written, pinned to UID ${uid.slice(0, 6)}…`);
} else {
  console.warn(
    "firestore.rules written with the placeholder unsubstituted — rules DENY ALL. " +
      "Set VITE_ALLOWED_UID in .env and re-run before deploying.",
  );
}
