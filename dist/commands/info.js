import { Api } from "telegram";
import { createClient } from "../client.js";
import { formatOutput } from "../output.js";
function getEntityType(entity) {
    if (entity instanceof Api.User)
        return "dm";
    if (entity instanceof Api.Chat)
        return "group";
    if (entity instanceof Api.Channel) {
        return entity.megagroup ? "group" : "channel";
    }
    return "channel";
}
async function getMemberCount(client, entity) {
    try {
        if (entity instanceof Api.User)
            return 2;
        if (entity instanceof Api.Chat)
            return entity.participantsCount ?? 0;
        if (entity instanceof Api.Channel) {
            const full = await client.invoke(new Api.channels.GetFullChannel({
                channel: await client.getInputEntity(entity),
            }));
            return full.fullChat.participantsCount ?? 0;
        }
    }
    catch {
        return 0;
    }
    return 0;
}
function getEntityName(entity) {
    if (entity instanceof Api.User) {
        return [entity.firstName, entity.lastName].filter(Boolean).join(" ") || "Unknown";
    }
    if (entity instanceof Api.Chat || entity instanceof Api.Channel) {
        return entity.title || "Unknown";
    }
    return "Unknown";
}
export async function infoCommand(chatId, opts) {
    const client = await createClient();
    try {
        const entity = await client.getEntity(chatId);
        const memberCount = await getMemberCount(client, entity);
        const info = {
            id: chatId,
            name: getEntityName(entity),
            type: getEntityType(entity),
            memberCount,
        };
        console.log(formatOutput(info, opts.plain));
    }
    finally {
        await client.disconnect();
    }
}
