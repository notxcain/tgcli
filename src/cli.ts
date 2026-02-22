#!/usr/bin/env node
import { Command } from "commander";
import { authCommand } from "./commands/auth.js";
import { searchCommand } from "./commands/search.js";

const program = new Command();

program
  .name("tgcli")
  .description("Read-only Telegram CLI for agent consumption")
  .version("0.1.0");

function handleError(err: unknown, plain: boolean): void {
  const message = err instanceof Error ? err.message : String(err);
  if (plain) {
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

program.parse();
