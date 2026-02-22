import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { existsSync } from "node:fs";
import { homedir } from "node:os";
import { join } from "node:path";
const CONFIG_DIR = join(homedir(), ".tgcli");
const SESSION_PATH = join(CONFIG_DIR, "session");
const CONFIG_PATH = join(CONFIG_DIR, "config.json");
export async function ensureConfigDir() {
    if (!existsSync(CONFIG_DIR)) {
        await mkdir(CONFIG_DIR, { recursive: true });
    }
}
export async function saveConfig(config) {
    await ensureConfigDir();
    await writeFile(CONFIG_PATH, JSON.stringify(config, null, 2));
}
export async function loadConfig() {
    if (!existsSync(CONFIG_PATH)) {
        throw new Error("Not authenticated. Run `tgcli auth` first.");
    }
    return JSON.parse(await readFile(CONFIG_PATH, "utf-8"));
}
export async function saveSession(session) {
    await ensureConfigDir();
    await writeFile(SESSION_PATH, session, { mode: 0o600 });
}
export async function loadSession() {
    if (!existsSync(SESSION_PATH)) {
        throw new Error("Not authenticated. Run `tgcli auth` first.");
    }
    return (await readFile(SESSION_PATH, "utf-8")).trim();
}
export async function createClient() {
    const config = await loadConfig();
    const sessionStr = await loadSession();
    const client = new TelegramClient(new StringSession(sessionStr), config.apiId, config.apiHash, { connectionRetries: 5 });
    await client.connect();
    return client;
}
