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
