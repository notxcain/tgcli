import { Api } from "telegram";
import { createClient } from "../client.js";
import { formatOutput, OutputFormat } from "../output.js";

interface FolderResult {
  id: number;
  title: string;
  emoticon?: string;
}

export async function foldersCommand(opts: { format: OutputFormat }): Promise<void> {
  const client = await createClient();

  try {
    const result = await client.invoke(new Api.messages.GetDialogFilters());
    const folders: FolderResult[] = [];

    for (const filter of result.filters) {
      if (filter instanceof Api.DialogFilterDefault) continue;
      if (filter instanceof Api.DialogFilter || filter instanceof Api.DialogFilterChatlist) {
        const title = typeof filter.title === "string"
          ? filter.title
          : (filter.title as any).text ?? String(filter.title);
        folders.push({
          id: filter.id,
          title,
          ...(filter.emoticon ? { emoticon: filter.emoticon } : {}),
        });
      }
    }

    console.log(formatOutput(folders, opts.format));
  } finally {
    await client.disconnect();
  }
}
