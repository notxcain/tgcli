import { TelegramClient } from "telegram";
import { Api } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { Logger, LogLevel } from "telegram/extensions/Logger.js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";

const CONFIG_DIR = join(homedir(), ".tgcli");
const SESSION_PATH = join(CONFIG_DIR, "session");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");

export interface TgConfig {
  apiId: number;
  apiHash: string;
}

export async function ensureConfigDir(): Promise<void> {
  if (!existsSync(CONFIG_DIR)) {
    await mkdir(CONFIG_DIR, { recursive: true });
  }
}

export async function saveConfig(config: TgConfig): Promise<void> {
  await ensureConfigDir();
  await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}

export async function loadConfig(): Promise<TgConfig> {
  if (!existsSync(CONFIG_PATH)) {
    throw new Error("Not authenticated. Run `tgcli auth` first.");
  }
  return JSON.parse(await readFile(CONFIG_PATH, "utf-8"));
}

export async function saveSession(session: string): Promise<void> {
  await ensureConfigDir();
  await writeFile(SESSION_PATH, session, { mode: 0o600 });
}

export async function loadSession(): Promise<string> {
  if (!existsSync(SESSION_PATH)) {
    throw new Error("Not authenticated. Run `tgcli auth` first.");
  }
  return (await readFile(SESSION_PATH, "utf-8")).trim();
}

export async function createClient(): Promise<TelegramClient> {
  const config = await loadConfig();
  const sessionStr = await loadSession();
  const client = new TelegramClient(
    new StringSession(sessionStr),
    config.apiId,
    config.apiHash,
    { connectionRetries: 5, baseLogger: new Logger(LogLevel.NONE) }
  );
  await client.connect();
  return client;
}

/**
 * Resolve a chat entity by ID with fallback to iterating dialogs.
 *
 * GramJS `getEntity()` requires the peer to already be cached in the
 * StringSession. For DM chats that were never accessed through this
 * client instance, the cache entry is missing and getEntity throws.
 * This helper catches that error and falls back to scanning dialogs
 * (which always fetches fresh data from the API).
 */
export async function resolveEntity(
  client: TelegramClient,
  chatId: string,
): Promise<Api.User | Api.Chat | Api.Channel> {
  try {
    return await client.getEntity(chatId) as Api.User | Api.Chat | Api.Channel;
  } catch {
    // Entity not in session cache — fall back to iterating dialogs
    const targetId = chatId.toString();
    for await (const dialog of client.iterDialogs({})) {
      if (dialog.id?.toString() === targetId) {
        return dialog.entity as Api.User | Api.Chat | Api.Channel;
      }
    }
    throw new Error(
      `Could not find chat ${chatId} via getEntity or dialogs. ` +
      `Make sure the chat exists and is accessible.`
    );
  }
}
