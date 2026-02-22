#!/usr/bin/env -S node --no-warnings
import { Command } from "commander";
import { OutputFormat } from "./output.js";
import { authCommand } from "./commands/auth.js";
import { searchCommand } from "./commands/search.js";
import { infoCommand } from "./commands/info.js";
import { readCommand } from "./commands/read.js";
import { downloadCommand } from "./commands/download.js";
import { activeCommand } from "./commands/active.js";
import { foldersCommand } from "./commands/folders.js";

const program = new Command();

program
  .name("tgcli")
  .description(
    "Read-only Telegram CLI for agent consumption.\n\nWorkflow: search → get chat ID → info/read/download"
  )
  .version("0.1.0")
  .option("--format <fmt>", "Output format: toon, json, plain", "toon")
  .option("--json", "Output as JSON")
  .option("--plain", "Output as plain text");

function resolveFormat(opts: { format?: string; json?: boolean; plain?: boolean }): OutputFormat {
  if (opts.json) return "json";
  if (opts.plain) return "plain";
  return (opts.format as OutputFormat) ?? "toon";
}

function handleError(err: unknown, format: OutputFormat): void {
  const message = err instanceof Error ? err.message : String(err);
  if (format === "plain") {
    console.error(`Error: ${message}`);
  } else {
    console.error(JSON.stringify({ error: message }));
  }
  process.exit(1);
}

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

program
  .command("active")
  .description("List chats with recent activity")
  .option("--days <n>", "Number of days to look back", "5")
  .option("--limit <n>", "Maximum results", "50")
  .action(async (opts) => {
    const format = resolveFormat(program.opts());
    try {
      await activeCommand({ days: parseInt(opts.days, 10), limit: parseInt(opts.limit, 10), format });
    } catch (err) {
      handleError(err, format);
    }
  });

program
  .command("folders")
  .description("List all chat folders")
  .action(async () => {
    const format = resolveFormat(program.opts());
    try {
      await foldersCommand({ format });
    } catch (err) {
      handleError(err, format);
    }
  });

program
  .command("search [query]")
  .description("Search dialogs by name, or list chats in a folder")
  .option("--folder <id>", "Filter to chats in this folder (use 'tgcli folders' to list)")
  .option("--limit <n>", "Maximum results", "20")
  .action(async (query, opts) => {
    const format = resolveFormat(program.opts());
    if (!query && opts.folder == null) {
      console.error("Provide a search query or --folder <id>");
      process.exit(1);
    }
    try {
      await searchCommand(query, {
        limit: parseInt(opts.limit, 10),
        format,
        folder: opts.folder != null ? parseInt(opts.folder, 10) : undefined,
      });
    } catch (err) {
      handleError(err, format);
    }
  });

program
  .command("info <chat-id>")
  .description("Get chat metadata (name, type, member count)")
  .action(async (chatId) => {
    const format = resolveFormat(program.opts());
    try {
      await infoCommand(chatId, { format });
    } catch (err) {
      handleError(err, format);
    }
  });

program
  .command("read <chat-id>")
  .description("Read messages from a chat")
  .option("--limit <n>", "Maximum messages to return", "50")
  .option("--before <date>", "Messages before this ISO date (e.g. 2026-02-20)")
  .option("--after <date>", "Messages after this ISO date")
  .action(async (chatId, opts) => {
    const format = resolveFormat(program.opts());
    try {
      await readCommand(chatId, {
        limit: parseInt(opts.limit, 10),
        before: opts.before,
        after: opts.after,
        format,
      });
    } catch (err) {
      handleError(err, format);
    }
  });

program
  .command("download <chat-id> <message-id>")
  .description("Download media from a specific message")
  .option("--out-dir <path>", "Output directory", ".")
  .action(async (chatId, msgId, opts) => {
    const format = resolveFormat(program.opts());
    try {
      await downloadCommand(chatId, msgId, { outDir: opts.outDir, format });
    } catch (err) {
      handleError(err, format);
    }
  });

program.parse();
