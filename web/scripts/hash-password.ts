import { hashPassword } from "../lib/password";

const pw = process.argv[2];
if (!pw) {
  console.error("Usage: npm run hash-password -- <password>");
  process.exit(1);
}
if (pw.length < 8) console.error("Warning: use at least 8 characters.");
const hash = hashPassword(pw);
console.log("# .env.local (Next expands $, so it is escaped):");
console.log(`SCOUT_OWNER_PASSWORD_HASH=${hash.replaceAll("$", "\\$")}`);
console.log("# raw value for Vercel / hosting dashboards:");
console.log(hash);
