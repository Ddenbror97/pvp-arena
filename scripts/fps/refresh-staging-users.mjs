import fs from "node:fs";
import { assertStaging } from "./staging-lib.mjs";
assertStaging();
const file = ".env.fps-staging-users.json";
const users = JSON.parse(fs.readFileSync(file, "utf8"));
let refreshed = 0,
  signedIn = 0;
for (const user of users) {
  let grant = user.session?.refresh_token ? "refresh_token" : "password";
  for (let attempt = 0; attempt < 6; attempt++) {
    const response = await fetch(`${process.env.SUPABASE_URL}/auth/v1/token?grant_type=${grant}`, {
      method: "POST",
      headers: { apikey: process.env.SUPABASE_PUBLISHABLE_KEY, "Content-Type": "application/json" },
      body: JSON.stringify(
        grant === "refresh_token"
          ? { refresh_token: user.session.refresh_token }
          : { email: user.email, password: user.password },
      ),
    });
    const session = await response.json();
    if (response.status === 429) {
      await new Promise((resolve) => setTimeout(resolve, 60000));
      continue;
    }
    if (!response.ok && grant === "refresh_token") {
      grant = "password";
      continue;
    }
    if (!response.ok || !session.access_token)
      throw Error(`Synthetic session refresh HTTP ${response.status}`);
    user.session = session;
    user.claims = JSON.parse(Buffer.from(session.access_token.split(".")[1], "base64url"));
    if (user.claims.sub !== user.id) throw Error("Synthetic session identity mismatch");
    grant === "refresh_token" ? refreshed++ : signedIn++;
    fs.writeFileSync(file, JSON.stringify(users, null, 2));
    break;
  }
}
if (refreshed + signedIn !== users.length) throw Error("Not all synthetic sessions refreshed");
console.log(JSON.stringify({ project: process.env.SUPABASE_PROJECT_ID, refreshed, signedIn }));
