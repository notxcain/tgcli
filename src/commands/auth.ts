import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import prompt from "input";
import { saveConfig, saveSession, ensureConfigDir } from "../client.js";

export async function authCommand(): Promise<void> {
  await ensureConfigDir();

  console.log("Telegram API credentials (from https://my.telegram.org/auth):\n");
  const apiIdStr = await prompt("  API ID: ");
  const apiHash = await prompt("  API Hash: ");

  const apiId = parseInt(apiIdStr, 10);
  if (isNaN(apiId)) {
    console.error("Error: API ID must be a number.");
    process.exit(1);
  }

  await saveConfig({ apiId, apiHash });

  const client = new TelegramClient(
    new StringSession(""),
    apiId,
    apiHash,
    { connectionRetries: 5 }
  );

  await client.start({
    phoneNumber: async () => await prompt("\nPhone number (with country code): "),
    phoneCode: async () => {
      console.log("Code sent to your Telegram app.");
      return await prompt("  Code: ");
    },
    password: async (hint) => {
      const hintMsg = hint ? ` (hint: ${hint})` : "";
      return await prompt(`  2FA Password${hintMsg}: `);
    },
    onError: (err) => {
      console.error("Auth error:", err.message);
    },
  });

  const sessionStr = client.session.save() as unknown as string;
  await saveSession(sessionStr);
  await client.disconnect();

  console.log("\n✓ Authenticated. Session saved to ~/.tgcli/session");
}
