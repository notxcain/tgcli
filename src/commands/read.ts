import { Api } from "telegram";
import { createClient, resolveEntity } from "../client.js";
import { MessageResult, MediaInfo } from "../types.js";
import { formatOutput, OutputFormat } from "../output.js";

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
        size:
          typeof doc.size === "object" && "toJSNumber" in doc.size
            ? (doc.size as any).toJSNumber()
            : Number(doc.size),
      };

      for (const attr of doc.attributes) {
        if (attr instanceof Api.DocumentAttributeFilename) {
          info.filename = attr.fileName;
        }
        if (attr instanceof Api.DocumentAttributeVideo) {
          info.type = "video";
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
    return (
      [sender.firstName, sender.lastName].filter(Boolean).join(" ") ||
      "Unknown"
    );
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
  format: OutputFormat;
}

export async function readCommand(
  chatId: string,
  opts: ReadOpts,
): Promise<void> {
  const client = await createClient();

  try {
    const entity = await resolveEntity(client, chatId);

    const offsetDate = opts.before
      ? (() => {
          const d = new Date(opts.before!);
          if (isNaN(d.getTime())) throw new Error(`Invalid date: ${opts.before}. Use ISO format (e.g. 2026-02-20)`);
          return Math.floor(d.getTime() / 1000);
        })()
      : undefined;

    const afterTs = opts.after
      ? (() => {
          const d = new Date(opts.after!);
          if (isNaN(d.getTime())) throw new Error(`Invalid date: ${opts.after}. Use ISO format (e.g. 2026-02-20)`);
          return Math.floor(d.getTime() / 1000);
        })()
      : undefined;

    const messages: MessageResult[] = [];

    for await (const msg of client.iterMessages(entity, {
      limit: afterTs ? undefined : opts.limit,
      offsetDate,
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

    console.log(formatOutput(messages, opts.format));
  } finally {
    await client.disconnect();
  }
}
