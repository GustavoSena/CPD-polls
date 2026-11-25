// Runs during `npm run build`: applies Prisma migrations and, on Vercel
// preview deployments, fills the preview database with test data.
//
// Preview deployments must never touch the production database. With Neon
// branching on (see README, "Base de dados das pré-visualizações"), each
// preview gets its own database branch. This script checks that before
// doing anything: it compares a fingerprint of the database host against
// PRODUCTION_DB_FINGERPRINT (a Preview-only Vercel variable).
//
// - Production / local: migrate as before. Never seeds.
// - Preview, fingerprint differs from production: migrate, then seed.
// - Preview, fingerprint equals production: stop the build with an error.
// - Preview, PRODUCTION_DB_FINGERPRINT not set: cannot tell, so do nothing
//   to the database (no migrations, no seed) and print the fingerprint.

import { createHash } from "node:crypto";
import { execSync } from "node:child_process";

const vercelEnv = process.env.VERCEL_ENV; // production | preview | development | undefined

// Hash of host + database name, so build logs never show the real host.
// The "-pooler" suffix is dropped, so pooled and direct URLs of the same
// database give the same fingerprint.
function fingerprint(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const host = u.hostname.replace(/^([^.]+)-pooler\./, "$1.");
    const db = u.pathname.replace(/^\//, "");
    return createHash("sha256").update(`${host}/${db}`).digest("hex").slice(0, 16);
  } catch {
    return null;
  }
}

function run(cmd) {
  execSync(cmd, { stdio: "inherit" });
}

const runtimeFp = fingerprint(process.env.POSTGRES_PRISMA_URL);
const migrateFp = fingerprint(process.env.POSTGRES_URL_NON_POOLING);
console.log(
  `[db-deploy] VERCEL_ENV=${vercelEnv ?? "(none)"} · database fingerprint: ` +
    `app=${runtimeFp ?? "?"} migrations=${migrateFp ?? "?"}`
);

if (vercelEnv !== "preview") {
  run("npx prisma migrate deploy");
  process.exit(0);
}

const prodFp = process.env.PRODUCTION_DB_FINGERPRINT?.trim();
if (!prodFp) {
  console.warn(
    "[db-deploy] PRODUCTION_DB_FINGERPRINT is not set for Preview, so this build " +
      "cannot tell whether it points at the production database. Skipping " +
      "migrations and seed data to be safe."
  );
  process.exit(0);
}

if (runtimeFp === prodFp || migrateFp === prodFp || !runtimeFp || !migrateFp) {
  console.error(
    "[db-deploy] This preview is connected to the PRODUCTION database. Stopping " +
      "the build so nothing is changed there. Turn on Neon branching for Preview " +
      "deployments (Vercel → Storage → the Neon database → Projects → Update " +
      "Project Connection → Create database branch for deployment: Preview)."
  );
  process.exit(1);
}

run("npx prisma migrate deploy");
run("node prisma/seed.mjs");
