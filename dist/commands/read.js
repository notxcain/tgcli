import { Api } from "telegram";
import { createClient } from "../client.js";
import { formatOutput } from "../output.js";
function extractMedia(message) {
    if (!message.media)
        return null;
    if (message.media instanceof Api.MessageMediaPhoto) {
        const photo = message.media.photo;
        if (photo instanceof Api.Photo) {
            let width;
            let height;
            let size;
            for (const s of photo.sizes) {
                if (s instanceof Api.PhotoSize) {
                    width = s.w;
                    height = s.h;
                    size = s.size;
                }
                else if (s instanceof Api.PhotoSizeProgressive) {
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
            const info = {
                type: "document",
                mimeType: doc.mimeType,
                size: typeof doc.size === "object" && "toJSNumber" in doc.size
                    ? doc.size.toJSNumber()
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
function getSenderName(message) {
    const sender = message.sender;
    if (!sender)
        return "Unknown";
    if (sender instanceof Api.User) {
        return ([sender.firstName, sender.lastName].filter(Boolean).join(" ") ||
            "Unknown");
    }
    if (sender instanceof Api.Chat || sender instanceof Api.Channel) {
        return sender.title || "Unknown";
    }
    return "Unknown";
}
export async function readCommand(chatId, opts) {
    const client = await createClient();
    try {
        const entity = await client.getEntity(chatId);
        const offsetDate = opts.before
            ? (() => {
                const d = new Date(opts.before);
                if (isNaN(d.getTime()))
                    throw new Error(`Invalid date: ${opts.before}. Use ISO format (e.g. 2026-02-20)`);
                return Math.floor(d.getTime() / 1000);
            })()
            : undefined;
        const afterTs = opts.after
            ? (() => {
                const d = new Date(opts.after);
                if (isNaN(d.getTime()))
                    throw new Error(`Invalid date: ${opts.after}. Use ISO format (e.g. 2026-02-20)`);
                return Math.floor(d.getTime() / 1000);
            })()
            : undefined;
        const messages = [];
        for await (const msg of client.iterMessages(entity, {
            limit: afterTs ? undefined : opts.limit,
            offsetDate,
        })) {
            if (!(msg instanceof Api.Message))
                continue;
            if (afterTs && msg.date < afterTs)
                break;
            if (messages.length >= opts.limit)
                break;
            messages.push({
                id: msg.id,
                date: new Date(msg.date * 1000).toISOString(),
                from: getSenderName(msg),
                text: msg.text || "",
                media: extractMedia(msg),
            });
        }
        console.log(formatOutput(messages, opts.plain));
    }
    finally {
        await client.disconnect();
    }
}
