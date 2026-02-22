import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { createInterface } from "node:readline/promises";
import { saveConfig, saveSession, ensureConfigDir } from "../client.js";

function createRl() {
  return createInterface({ input: process.stdin, output: process.stdout });
}

export async function authCommand(): Promise<void> {
  await ensureConfigDir();

  const rl = createRl();

  console.log("Telegram API credentials (from https://my.telegram.org/auth):\n");
  const apiIdStr = await rl.question("  API ID: ");
  const apiHash = await rl.question("  API Hash: ");

  const apiId = parseInt(apiIdStr, 10);
  if (isNaN(apiId)) {
    rl.close();
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

  try {
    await client.start({
      phoneNumber: async () => {
        const phone = await rl.question("\nPhone number (with country code): ");
        return phone;
      },
      phoneCode: async () => {
        console.log("Code sent to your Telegram app.");
        const code = await rl.question("  Code: ");
        return code;
      },
      password: async (hint) => {
        const hintMsg = hint ? ` (hint: ${hint})` : "";
        const pass = await rl.question(`  2FA Password${hintMsg}: `);
        return pass;
      },
      onError: (err) => {
        console.error("Auth error:", err.message);
      },
    });

    const sessionStr = client.session.save() as unknown as string;
    await saveSession(sessionStr);
  } finally {
    rl.close();
    await client.disconnect();
  }

  console.log("\n✓ Authenticated. Session saved to ~/.tgcli/session");
}
