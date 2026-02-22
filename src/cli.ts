#!/usr/bin/env node
import { Command } from "commander";

const program = new Command();

program
  .name("tgcli")
  .description("Read-only Telegram CLI for agent consumption")
  .version("0.1.0");

program.parse();
