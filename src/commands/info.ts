import { Api, TelegramClient } from "telegram";
import { createClient, resolveEntity } from "../client.js";
import { ChatInfo, ChatType } from "../types.js";
import { formatOutput, OutputFormat } from "../output.js";

type Entity = Api.User | Api.Chat | Api.Channel;

function getEntityType(entity: Entity): ChatType {
  if (entity instanceof Api.User) return "dm";
  if (entity instanceof Api.Chat) return "group";
  if (entity instanceof Api.Channel) {
    return entity.megagroup ? "group" : "channel";
  }
  return "channel";
}

async function getMemberCount(client: TelegramClient, entity: Entity): Promise<number> {
  try {
    if (entity instanceof Api.User) return 2;
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

function getEntityName(entity: Entity): string {
  if (entity instanceof Api.User) {
    return [entity.firstName, entity.lastName].filter(Boolean).join(" ") || "Unknown";
  }
  if (entity instanceof Api.Chat || entity instanceof Api.Channel) {
    return entity.title || "Unknown";
  }
  return "Unknown";
}

export async function infoCommand(chatId: string, opts: { format: OutputFormat }): Promise<void> {
  const client = await createClient();

  try {
    const entity = await resolveEntity(client, chatId) as Entity;
    const memberCount = await getMemberCount(client, entity);

    const info: ChatInfo = {
      id: chatId,
      name: getEntityName(entity),
      type: getEntityType(entity),
      memberCount,
    };

    console.log(formatOutput(info, opts.format));
  } finally {
    await client.disconnect();
  }
}
