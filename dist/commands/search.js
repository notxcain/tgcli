import { createClient } from "../client.js";
import { formatOutput } from "../output.js";
function getChatType(dialog) {
    if (dialog.isUser)
        return "dm";
    if (dialog.isGroup)
        return "group";
    return "channel";
}
export async function searchCommand(query, opts) {
    const client = await createClient();
    try {
        const results = [];
        const lowerQuery = query.toLowerCase();
        for await (const dialog of client.iterDialogs({})) {
            if (results.length >= opts.limit)
                break;
            if (dialog.name?.toLowerCase().includes(lowerQuery)) {
                results.push({
                    id: dialog.id.toString(),
                    name: dialog.name || "",
                    type: getChatType(dialog),
                    unreadCount: dialog.unreadCount,
                });
            }
        }
        console.log(formatOutput(results, opts.plain));
    }
    finally {
        await client.disconnect();
    }
}
