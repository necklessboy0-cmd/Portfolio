#!/usr/bin/env node
// ----------------------------------------------------------------------------
// Secure administrator-password setup.
//  • Prompts for the password WITHOUT echoing it (hidden input).
//  • Asks for a confirmation re-entry; validates strength.
//  • Stores ONLY a salted scrypt hash in .env.local (gitignored).
//  • The plaintext is never written to disk, never logged, never committed.
// Usage:  npm run set-password          (writes .env.local for local dev)
//         node scripts/set-password.js --print-hash   (prints the hash only,
//          so you can paste it into Vercel → Settings → Environment Variables)
// ----------------------------------------------------------------------------
const { randomBytes, scryptSync } = require("crypto");
const fs = require("fs");
const path = require("path");
const readline = require("readline");

function hiddenQuestion(query) {
  return new Promise((resolve) => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
    rl.question(query, (answer) => {
      rl.close();
      resolve(answer);
    });
    // Mute the typed characters.
    rl._writeToOutput = function _writeToOutput(stringToWrite) {
      if (stringToWrite.includes("\n") || stringToWrite.includes("\r")) {
        process.stdout.write(stringToWrite);
      } else {
        process.stdout.write("*");
      }
    };
  });
}

async function main() {
  const pw1 = await hiddenQuestion("Enter the new administrator password (input hidden): ");
  if (pw1.length < 10) {
    console.error("\n✗ Password must be at least 10 characters.");
    process.exit(1);
  }
  if (!/[A-Za-z]/.test(pw1) || !/[0-9]/.test(pw1)) {
    console.error("\n✗ Password must contain both letters and numbers.");
    process.exit(1);
  }
  const pw2 = await hiddenQuestion("Re-enter to confirm: ");
  if (pw1 !== pw2) {
    console.error("\n✗ The two entries do not match. Nothing was changed.");
    process.exit(1);
  }

  const salt = randomBytes(16);
  const hash = scryptSync(pw1, salt, 64, { N: 16384, r: 8, p: 1, maxmem: 64 * 1024 * 1024 });
  // Colon-separated: safe for Next.js dotenv variable expansion (no `$`).
  const encoded = `scrypt:16384:8:1:${salt.toString("base64")}:${hash.toString("base64")}`;

  if (process.argv.includes("--print-hash")) {
    // Hash only — safe to paste into Vercel env vars; still reveals no password.
    process.stdout.write(encoded + "\n");
    return;
  }

  const envPath = path.join(process.cwd(), ".env.local");
  let existing = "";
  try {
    existing = fs.readFileSync(envPath, "utf-8");
  } catch {
    /* first run */
  }
  const filtered = existing
    .split("\n")
    .filter((l) => l.trim() && !l.startsWith("ADMIN_PASSWORD_HASH="))
    .join("\n");
  const next = `${filtered ? filtered + "\n" : ""}ADMIN_PASSWORD_HASH=${encoded}\n`;
  fs.writeFileSync(envPath, next, "utf-8");
  console.log("\n✓ Password stored (hashed) in .env.local — this file is gitignored and never committed.");
  console.log("  Restart the dev server so the new password takes effect.");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
