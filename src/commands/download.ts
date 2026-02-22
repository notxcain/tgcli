import { Api } from "telegram";
import { join, resolve } from "node:path";
import { stat } from "node:fs/promises";
import { createClient } from "../client.js";
import { DownloadResult } from "../types.js";
import { formatOutput, OutputFormat } from "../output.js";

export async function downloadCommand(
  chatId: string,
  msgId: string,
  opts: { outDir: string; format: OutputFormat }
): Promise<void> {
  const client = await createClient();

  try {
    const entity = await client.getEntity(chatId);
    const messages = await client.getMessages(entity, { ids: [parseInt(msgId, 10)] });

    if (messages.length === 0 || !messages[0]) {
      throw new Error(`Message ${msgId} not found in chat ${chatId}`);
    }

    const message = messages[0];
    if (!message.media) {
      throw new Error(`Message ${msgId} has no media to download`);
    }

    // Determine filename and mimeType
    let filename = `${msgId}`;
    let mimeType = "application/octet-stream";

    if (message.media instanceof Api.MessageMediaDocument) {
      const doc = message.media.document;
      if (doc instanceof Api.Document) {
        mimeType = doc.mimeType;
        for (const attr of doc.attributes) {
          if (attr instanceof Api.DocumentAttributeFilename) {
            filename = attr.fileName;
          }
        }
        if (filename === `${msgId}`) {
          const ext = mimeType.split("/")[1] || "bin";
          filename = `${msgId}.${ext}`;
        }
      }
    } else if (message.media instanceof Api.MessageMediaPhoto) {
      mimeType = "image/jpeg";
      filename = `${msgId}.jpg`;
    }

    const outPath = resolve(join(opts.outDir, filename));

    const result = await client.downloadMedia(message, {
      outputFile: outPath,
    });

    if (!result) {
      throw new Error("Download failed — no data returned");
    }

    const stats = await stat(outPath);

    const output: DownloadResult = {
      path: outPath,
      size: stats.size,
      mimeType,
    };

    console.log(formatOutput(output, opts.format));
  } finally {
    await client.disconnect();
  }
}
