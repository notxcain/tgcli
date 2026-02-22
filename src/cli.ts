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
