# tgcli Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Build a read-only Telegram CLI that agents can use to search dialogs, read messages, get chat info, and download media from a personal Telegram account.

**Architecture:** TypeScript Node CLI using GramJS (MTProto user auth) with commander for subcommand routing. Session and config stored in `~/.tgcli/`. All output is JSON (default) or plain text (`--plain`).

**Tech Stack:** TypeScript (ESM), GramJS (`telegram` npm package), `commander`, `input` (for interactive prompts)

---

### Task 1: Project scaffolding

**Files:**
- Create: `package.json`
- Create: `tsconfig.json`
- Create: `src/cli.ts`

**Step 1: Initialize project**

```bash
cd /Users/notxcain/code/notxcain/tgcli
npm init -y
```

**Step 2: Install dependencies**

```bash
npm install telegram commander input
npm install -D typescript @types/node
```

**Step 3: Configure tsconfig.json**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "Node16",
    "moduleResolution": "Node16",
    "outDir": "dist",
    "rootDir": "src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "declaration": true
  },
  "include": ["src"]
}
```

**Step 4: Update package.json**

Set `"type": "module"`, add `"bin": { "tgcli": "./dist/cli.js" }`, add scripts:
```json
{
  "scripts": {
    "build": "tsc",
    "dev": "tsc --watch"
  }
}
```

**Step 5: Create minimal CLI entry point `src/cli.ts`**

```typescript
#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();

program
  .name("tgcli")
  .description("Read-only Telegram CLI for agent consumption")
  .version("0.1.0");

program.parse();
```

**Step 6: Build and verify**

```bash
npm run build
node dist/cli.js --help
```

Expected: help output showing tgcli name and version.

**Step 7: Commit**

```bash
git add package.json package-lock.json tsconfig.json src/cli.ts
git commit -m "feat: project scaffolding with commander CLI entry point"
```

---

### Task 2: Types and output formatter

**Files:**
- Create: `src/types.ts`
- Create: `src/output.ts`

**Step 1: Define output types in `src/types.ts`**

```typescript
export type ChatType = "dm" | "group" | "channel";

export interface ChatSearchResult {
  id: string;
  name: string;
  type: ChatType;
  unreadCount: number;
}

export interface ChatInfo {
  id: string;
  name: string;
  type: ChatType;
  memberCount: number;
}

export interface MediaInfo {
  type: "photo" | "video" | "document" | "sticker" | "voice" | "audio" | "other";
  filename?: string;
  size?: number;
  mimeType?: string;
  width?: number;
  height?: number;
  duration?: number;
}

export interface MessageResult {
  id: number;
  date: string;
  from: string;
  text: string;
  media: MediaInfo | null;
}

export interface DownloadResult {
  path: string;
  size: number;
  mimeType: string;
}
```

**Step 2: Create output formatter in `src/output.ts`**

```typescript
import { ChatSearchResult, ChatInfo, MessageResult, DownloadResult, MediaInfo } from "./types.js";

export function formatOutput(data: unknown, plain: boolean): string {
  if (!plain) {
    return JSON.stringify(data, null, 2);
  }
  if (Array.isArray(data) && data.length > 0 && "text" in data[0]) {
    return formatMessagesPlain(data as MessageResult[]);
  }
  if (Array.isArray(data) && data.length > 0 && "unreadCount" in data[0]) {
    return formatSearchPlain(data as ChatSearchResult[]);
  }
  if (!Array.isArray(data) && data && typeof data === "object" && "memberCount" in data) {
    return formatInfoPlain(data as ChatInfo);
  }
  if (!Array.isArray(data) && data && typeof data === "object" && "path" in data) {
    return formatDownloadPlain(data as DownloadResult);
  }
  return JSON.stringify(data, null, 2);
}

function formatSearchPlain(results: ChatSearchResult[]): string {
  return results
    .map((r) => `[${r.type}] ${r.name} (id: ${r.id}, unread: ${r.unreadCount})`)
    .join("\n");
}

function formatInfoPlain(info: ChatInfo): string {
  return `${info.name}\n  Type: ${info.type}\n  ID: ${info.id}\n  Members: ${info.memberCount}`;
}

function formatMediaTag(media: MediaInfo): string {
  const parts = [media.type];
  if (media.filename) parts.push(media.filename);
  if (media.width && media.height) parts.push(`${media.width}x${media.height}`);
  if (media.size) parts.push(formatBytes(media.size));
  if (media.duration) parts.push(`${media.duration}s`);
  return `[${parts.join(": ")}]`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes}B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)}KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

function formatMessagesPlain(messages: MessageResult[]): string {
  return messages
    .map((m) => {
      const date = new Date(m.date).toISOString().replace("T", " ").slice(0, 16);
      const mediaTag = m.media ? " " + formatMediaTag(m.media) : "";
      const text = m.text || "";
      return `[${date}] ${m.from}: ${text}${mediaTag}`;
    })
    .join("\n");
}

function formatDownloadPlain(result: DownloadResult): string {
  return `Downloaded: ${result.path} (${formatBytes(result.size)}, ${result.mimeType})`;
}
```

**Step 3: Build and verify**

```bash
npm run build
```

Expected: compiles without errors.

**Step 4: Commit**

```bash
git add src/types.ts src/output.ts
git commit -m "feat: add output types and JSON/plain formatters"
```

---

### Task 3: Client factory and session management

**Files:**
- Create: `src/client.ts`

**Step 1: Implement client factory in `src/client.ts`**

```typescript
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
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
  await writeFile(SESSION_PATH, session);
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
    { connectionRetries: 5 }
  );
  await client.connect();
  return client;
}
```

**Step 2: Build and verify**

```bash
npm run build
```

Expected: compiles without errors.

**Step 3: Commit**

```bash
git add src/client.ts
git commit -m "feat: add GramJS client factory and session management"
```

---

### Task 4: Auth command

**Files:**
- Create: `src/commands/auth.ts`
- Modify: `src/cli.ts`

**Step 1: Implement auth command in `src/commands/auth.ts`**

```typescript
import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions/index.js";
import { input as prompt } from "input";
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
```

**Step 2: Wire auth command into `src/cli.ts`**

```typescript
#!/usr/bin/env node
import { Command } from "commander";
import { authCommand } from "./commands/auth.js";

const program = new Command();

program
  .name("tgcli")
  .description("Read-only Telegram CLI for agent consumption")
  .version("0.1.0");

program
  .command("auth")
  .description("Authenticate with your Telegram account")
  .action(async () => {
    try {
      await authCommand();
    } catch (err) {
      console.error(err instanceof Error ? err.message : err);
      process.exit(1);
    }
  });

program.parse();
```

**Step 3: Build and verify**

```bash
npm run build
node dist/cli.js auth --help
```

Expected: shows auth command help text.

**Step 4: Commit**

```bash
git add src/commands/auth.ts src/cli.ts
git commit -m "feat: add interactive auth command"
```

---

### Task 5: Search command

**Files:**
- Create: `src/commands/search.ts`
- Modify: `src/cli.ts`

**Step 1: Implement search in `src/commands/search.ts`**

```typescript
import { Api } from "telegram";
import { createClient } from "../client.js";
import { ChatSearchResult, ChatType } from "../types.js";
import { formatOutput } from "../output.js";

function getChatType(dialog: { isUser: boolean; isGroup: boolean; isChannel: boolean }): ChatType {
  if (dialog.isUser) return "dm";
  if (dialog.isGroup) return "group";
  return "channel";
}

export async function searchCommand(query: string, opts: { limit: number; plain: boolean }): Promise<void> {
  const client = await createClient();

  try {
    const results: ChatSearchResult[] = [];
    const lowerQuery = query.toLowerCase();

    for await (const dialog of client.iterDialogs({})) {
      if (results.length >= opts.limit) break;
      if (dialog.name?.toLowerCase().includes(lowerQuery)) {
        results.push({
          id: dialog.id!.toString(),
          name: dialog.name || "",
          type: getChatType(dialog),
          unreadCount: dialog.unreadCount,
        });
      }
    }

    console.log(formatOutput(results, opts.plain));
  } finally {
    await client.disconnect();
  }
}
```

**Step 2: Wire search into `src/cli.ts`** — add after auth command:

```typescript
import { searchCommand } from "./commands/search.js";

program
  .command("search <query>")
  .description("Search dialogs (DMs, groups, channels) by name")
  .option("--limit <n>", "Maximum results", "20")
  .option("--plain", "Plain text output instead of JSON", false)
  .action(async (query, opts) => {
    try {
      await searchCommand(query, { limit: parseInt(opts.limit, 10), plain: opts.plain });
    } catch (err) {
      handleError(err, opts.plain);
    }
  });
```

Also add a shared error handler at the top of `src/cli.ts`:

```typescript
function handleError(err: unknown, plain: boolean): void {
  const message = err instanceof Error ? err.message : String(err);
  if (plain) {
    console.error(`Error: ${message}`);
  } else {
    console.error(JSON.stringify({ error: message }));
  }
  process.exit(1);
}
```

**Step 3: Build and verify**

```bash
npm run build
node dist/cli.js search --help
```

Expected: shows search usage with `<query>`, `--limit`, `--plain` options.

**Step 4: Commit**

```bash
git add src/commands/search.ts src/cli.ts
git commit -m "feat: add search command for dialog discovery"
```

---

### Task 6: Info command

**Files:**
- Create: `src/commands/info.ts`
- Modify: `src/cli.ts`

**Step 1: Implement info in `src/commands/info.ts`**

```typescript
import { Api } from "telegram";
import { createClient } from "../client.js";
import { ChatInfo, ChatType } from "../types.js";
import { formatOutput } from "../output.js";

function getEntityType(entity: Api.TypeEntity): ChatType {
  if (entity instanceof Api.User) return "dm";
  if (entity instanceof Api.Chat) return "group";
  if (entity instanceof Api.Channel) {
    return entity.megagroup ? "group" : "channel";
  }
  return "channel";
}

async function getMemberCount(client: any, entity: Api.TypeEntity): Promise<number> {
  try {
    if (entity instanceof Api.User) return 2; // DM is always 2 participants
    if (entity instanceof Api.Chat) return entity.participantsCount ?? 0;
    if (entity instanceof Api.Channel) {
      const full = await client.invoke(
        new Api.channels.GetFullChannel({
          channel: await client.getInputEntity(entity),
        })
      );
      return (full.fullChat as Api.ChannelFull).participantsCount ?? 0;
    }
  } catch {
    return 0;
  }
  return 0;
}

function getEntityName(entity: Api.TypeEntity): string {
  if (entity instanceof Api.User) {
    return [entity.firstName, entity.lastName].filter(Boolean).join(" ") || "Unknown";
  }
  if (entity instanceof Api.Chat || entity instanceof Api.Channel) {
    return entity.title || "Unknown";
  }
  return "Unknown";
}

export async function infoCommand(chatId: string, opts: { plain: boolean }): Promise<void> {
  const client = await createClient();

  try {
    const entity = await client.getEntity(chatId);
    const memberCount = await getMemberCount(client, entity);

    const info: ChatInfo = {
      id: chatId,
      name: getEntityName(entity),
      type: getEntityType(entity),
      memberCount,
    };

    console.log(formatOutput(info, opts.plain));
  } finally {
    await client.disconnect();
  }
}
```

**Step 2: Wire info into `src/cli.ts`**

```typescript
import { infoCommand } from "./commands/info.js";

program
  .command("info <chat-id>")
  .description("Get chat metadata (name, type, member count)")
  .option("--plain", "Plain text output instead of JSON", false)
  .action(async (chatId, opts) => {
    try {
      await infoCommand(chatId, { plain: opts.plain });
    } catch (err) {
      handleError(err, opts.plain);
    }
  });
```

**Step 3: Build and verify**

```bash
npm run build
node dist/cli.js info --help
```

Expected: shows info usage with `<chat-id>` arg and `--plain` option.

**Step 4: Commit**

```bash
git add src/commands/info.ts src/cli.ts
git commit -m "feat: add info command for chat metadata"
```

---

### Task 7: Read command

**Files:**
- Create: `src/commands/read.ts`
- Modify: `src/cli.ts`

**Step 1: Implement read in `src/commands/read.ts`**

```typescript
import { Api } from "telegram";
import { createClient } from "../client.js";
import { MessageResult, MediaInfo } from "../types.js";
import { formatOutput } from "../output.js";

function extractMedia(message: Api.Message): MediaInfo | null {
  if (!message.media) return null;

  if (message.media instanceof Api.MessageMediaPhoto) {
    const photo = message.media.photo;
    if (photo instanceof Api.Photo) {
      let width: number | undefined;
      let height: number | undefined;
      let size: number | undefined;
      for (const s of photo.sizes) {
        if (s instanceof Api.PhotoSize) {
          width = s.w;
          height = s.h;
          size = s.size;
        } else if (s instanceof Api.PhotoSizeProgressive) {
          width = s.w;
          height = s.h;
          size = s.sizes[s.sizes.length - 1];
        }
      }
      return { type: "photo", width, height, size };
    }
    return { type: "photo" };
  }

  if (message.media instanceof Api.MessageMediaDocument) {
    const doc = message.media.document;
    if (doc instanceof Api.Document) {
      const info: MediaInfo = {
        type: "document",
        mimeType: doc.mimeType,
        size: typeof doc.size === "object" && "toJSNumber" in doc.size
          ? (doc.size as any).toJSNumber()
          : Number(doc.size),
      };

      for (const attr of doc.attributes) {
        if (attr instanceof Api.DocumentAttributeFilename) {
          info.filename = attr.fileName;
        }
        if (attr instanceof Api.DocumentAttributeVideo) {
          info.type = attr.roundMessage ? "voice" : "video";
          info.width = attr.w;
          info.height = attr.h;
          info.duration = attr.duration;
        }
        if (attr instanceof Api.DocumentAttributeAudio) {
          info.type = attr.voice ? "voice" : "audio";
          info.duration = attr.duration;
        }
        if (attr instanceof Api.DocumentAttributeSticker) {
          info.type = "sticker";
        }
        if (attr instanceof Api.DocumentAttributeImageSize) {
          info.width = attr.w;
          info.height = attr.h;
        }
      }
      return info;
    }
    return { type: "other" };
  }

  return { type: "other" };
}

function getSenderName(message: Api.Message): string {
  const sender = message.sender;
  if (!sender) return "Unknown";
  if (sender instanceof Api.User) {
    return [sender.firstName, sender.lastName].filter(Boolean).join(" ") || "Unknown";
  }
  if (sender instanceof Api.Chat || sender instanceof Api.Channel) {
    return sender.title || "Unknown";
  }
  return "Unknown";
}

interface ReadOpts {
  limit: number;
  before?: string;
  after?: string;
  plain: boolean;
}

export async function readCommand(chatId: string, opts: ReadOpts): Promise<void> {
  const client = await createClient();

  try {
    const entity = await client.getEntity(chatId);

    const iterParams: any = {};
    if (opts.before) {
      iterParams.offsetDate = Math.floor(new Date(opts.before).getTime() / 1000);
    }

    const messages: MessageResult[] = [];
    const afterTs = opts.after ? Math.floor(new Date(opts.after).getTime() / 1000) : undefined;

    for await (const msg of client.iterMessages(entity, {
      limit: afterTs ? undefined : opts.limit,
      offsetDate: iterParams.offsetDate,
    })) {
      if (!(msg instanceof Api.Message)) continue;
      if (afterTs && msg.date < afterTs) break;
      if (messages.length >= opts.limit) break;

      messages.push({
        id: msg.id,
        date: new Date(msg.date * 1000).toISOString(),
        from: getSenderName(msg),
        text: msg.text || "",
        media: extractMedia(msg),
      });
    }

    console.log(formatOutput(messages, opts.plain));
  } finally {
    await client.disconnect();
  }
}
```

**Step 2: Wire read into `src/cli.ts`**

```typescript
import { readCommand } from "./commands/read.js";

program
  .command("read <chat-id>")
  .description("Read messages from a chat")
  .option("--limit <n>", "Maximum messages to return", "50")
  .option("--before <date>", "Messages before this ISO date (e.g. 2026-02-20)")
  .option("--after <date>", "Messages after this ISO date")
  .option("--plain", "Plain text output instead of JSON", false)
  .action(async (chatId, opts) => {
    try {
      await readCommand(chatId, {
        limit: parseInt(opts.limit, 10),
        before: opts.before,
        after: opts.after,
        plain: opts.plain,
      });
    } catch (err) {
      handleError(err, opts.plain);
    }
  });
```

**Step 3: Build and verify**

```bash
npm run build
node dist/cli.js read --help
```

Expected: shows read usage with `<chat-id>`, `--limit`, `--before`, `--after`, `--plain`.

**Step 4: Commit**

```bash
git add src/commands/read.ts src/cli.ts
git commit -m "feat: add read command with date filtering and media metadata"
```

---

### Task 8: Download command

**Files:**
- Create: `src/commands/download.ts`
- Modify: `src/cli.ts`

**Step 1: Implement download in `src/commands/download.ts`**

```typescript
import { Api } from "telegram";
import { join } from "node:path";
import { createClient } from "../client.js";
import { DownloadResult } from "../types.js";
import { formatOutput } from "../output.js";

export async function downloadCommand(
  chatId: string,
  msgId: string,
  opts: { outDir: string; plain: boolean }
): Promise<void> {
  const client = await createClient();

  try {
    const entity = await client.getEntity(chatId);
    const messages = await client.getMessages(entity, { ids: [parseInt(msgId, 10)] });

    if (messages.length === 0 || !messages[0]) {
      throw new Error(`Message ${msgId} not found in chat ${chatId}`);
    }

    const message = messages[0];
    if (!message.media) {
      throw new Error(`Message ${msgId} has no media to download`);
    }

    // Determine filename and mimeType
    let filename = `${msgId}`;
    let mimeType = "application/octet-stream";

    if (message.media instanceof Api.MessageMediaDocument) {
      const doc = message.media.document;
      if (doc instanceof Api.Document) {
        mimeType = doc.mimeType;
        for (const attr of doc.attributes) {
          if (attr instanceof Api.DocumentAttributeFilename) {
            filename = attr.fileName;
          }
        }
        if (filename === `${msgId}`) {
          // No filename attribute — derive extension from MIME
          const ext = mimeType.split("/")[1] || "bin";
          filename = `${msgId}.${ext}`;
        }
      }
    } else if (message.media instanceof Api.MessageMediaPhoto) {
      mimeType = "image/jpeg";
      filename = `${msgId}.jpg`;
    }

    const outPath = join(opts.outDir, filename);

    const result = await client.downloadMedia(message, {
      outputFile: outPath,
    });

    if (!result) {
      throw new Error("Download failed — no data returned");
    }

    // Get file size
    const { stat } = await import("node:fs/promises");
    const stats = await stat(outPath);

    const output: DownloadResult = {
      path: outPath,
      size: stats.size,
      mimeType,
    };

    console.log(formatOutput(output, opts.plain));
  } finally {
    await client.disconnect();
  }
}
```

**Step 2: Wire download into `src/cli.ts`**

```typescript
import { downloadCommand } from "./commands/download.js";

program
  .command("download <chat-id> <message-id>")
  .description("Download media from a specific message")
  .option("--out-dir <path>", "Output directory", ".")
  .option("--plain", "Plain text output instead of JSON", false)
  .action(async (chatId, msgId, opts) => {
    try {
      await downloadCommand(chatId, msgId, { outDir: opts.outDir, plain: opts.plain });
    } catch (err) {
      handleError(err, opts.plain);
    }
  });
```

**Step 3: Build and verify**

```bash
npm run build
node dist/cli.js download --help
```

Expected: shows download usage with `<chat-id> <message-id>`, `--out-dir`, `--plain`.

**Step 4: Commit**

```bash
git add src/commands/download.ts src/cli.ts
git commit -m "feat: add download command for media files"
```

---

### Task 9: Final CLI wiring and help text

**Files:**
- Modify: `src/cli.ts`

**Step 1: Review and finalize `src/cli.ts`**

Ensure all imports are present, the shebang line is correct, and help text has useful examples. The final `src/cli.ts` should have:

```typescript
#!/usr/bin/env node
import { Command } from "commander";
import { authCommand } from "./commands/auth.js";
import { searchCommand } from "./commands/search.js";
import { infoCommand } from "./commands/info.js";
import { readCommand } from "./commands/read.js";
import { downloadCommand } from "./commands/download.js";

function handleError(err: unknown, plain: boolean): void {
  const message = err instanceof Error ? err.message : String(err);
  if (plain) {
    console.error(`Error: ${message}`);
  } else {
    console.error(JSON.stringify({ error: message }));
  }
  process.exit(1);
}

const program = new Command();

program
  .name("tgcli")
  .description("Read-only Telegram CLI for agent consumption.\n\nWorkflow: search → get chat ID → info/read/download")
  .version("0.1.0");

// ... all commands as defined in Tasks 4-8

program.parse();
```

**Step 2: Build full project**

```bash
npm run build
```

Expected: compiles without errors.

**Step 3: Verify all help output**

```bash
node dist/cli.js --help
node dist/cli.js auth --help
node dist/cli.js search --help
node dist/cli.js info --help
node dist/cli.js read --help
node dist/cli.js download --help
```

Expected: all commands show descriptive help with options.

**Step 4: Make CLI executable and link**

```bash
chmod +x dist/cli.js
npm link
tgcli --help
```

Expected: `tgcli` is available globally, shows help.

**Step 5: Commit**

```bash
git add src/cli.ts
git commit -m "feat: finalize CLI with all commands and help text"
```

---

### Task 10: End-to-end manual test

**Step 1: Authenticate**

```bash
tgcli auth
```

Follow prompts with real Telegram credentials. Expected: `✓ Authenticated. Session saved to ~/.tgcli/session`

**Step 2: Search for a known chat**

```bash
tgcli search "Saved Messages"
tgcli search "Saved Messages" --plain
```

Expected: JSON array with at least one result; plain text version shows `[dm] Saved Messages (id: ..., unread: 0)`.

**Step 3: Get info on the found chat**

```bash
tgcli info <id-from-search>
```

Expected: JSON with name, type, memberCount.

**Step 4: Read messages**

```bash
tgcli read <id-from-search> --limit 5
tgcli read <id-from-search> --limit 5 --plain
```

Expected: JSON array of messages; plain text shows `[date] sender: text`.

**Step 5: Download (if there's media)**

If any message has media, test:
```bash
tgcli download <chat-id> <message-id> --out-dir /tmp
```

Expected: JSON with path, size, mimeType. File exists at specified path.

**Step 6: Commit any fixes from manual testing**

```bash
git add -A
git commit -m "fix: adjustments from end-to-end testing"
```
