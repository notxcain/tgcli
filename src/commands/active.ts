import { createClient } from "../client.js";
import { ChatSearchResult, ChatType } from "../types.js";
import { formatOutput, OutputFormat } from "../output.js";

function getChatType(dialog: { isUser: boolean; isGroup: boolean; isChannel: boolean }): ChatType {
  if (dialog.isUser) return "dm";
  if (dialog.isGroup) return "group";
  return "channel";
}

export async function activeCommand(opts: { days: number; limit: number; format: OutputFormat }): Promise<void> {
  const client = await createClient();

  try {
    const cutoff = Math.floor(Date.now() / 1000) - opts.days * 86400;
    const results: ChatSearchResult[] = [];

    for await (const dialog of client.iterDialogs({})) {
      if (dialog.date < cutoff) continue;
      if (results.length >= opts.limit) break;

      results.push({
        id: dialog.id!.toString(),
        name: dialog.name || "",
        type: getChatType(dialog),
        unreadCount: dialog.unreadCount,
      });
    }

    console.log(formatOutput(results, opts.format));
  } finally {
    await client.disconnect();
  }
}
