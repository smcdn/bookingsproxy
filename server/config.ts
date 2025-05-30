import fs from "fs";
import crypto from "crypto";
import dotenv from "dotenv";
dotenv.config();

function ensureApiKey() {
  const envPath = ".env";
  let envContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, "utf-8") : "";
  let apiKey = process.env.API_KEY;
  if (!apiKey) {
    apiKey = crypto.randomBytes(32).toString("hex");
    console.log(`Generated API_KEY: ${apiKey}`);
    if (/^API_KEY=.*/m.test(envContent)) {
      // Replace existing API_KEY line
      envContent = envContent.replace(/^API_KEY=.*/gm, `API_KEY=${apiKey}`);
    } else {
      // Add new API_KEY line
      envContent += (envContent.endsWith("\n") ? "" : "\n") + `API_KEY=${apiKey}\n`;
    }
    fs.writeFileSync(envPath, envContent);
    process.env.API_KEY = apiKey;
  }
}

ensureApiKey();

export const config = {
  port: 8081,
  host: "127.0.0.1",
  apiKey: process.env.API_KEY,
  supabase: {
    url: process.env.SUPABASE_URL,
    key: process.env.SUPABASE_KEY,
    email: process.env.SUPABASE_EMAIL,
    password: process.env.SUPABASE_PASSWORD
  }
};
