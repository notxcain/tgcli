import { Api } from "telegram";
import { TelegramClient } from "telegram";
import { createClient } from "../client.js";
import { ChatSearchResult, ChatType } from "../types.js";
import { formatOutput } from "../output.js";

function getChatType(dialog: { isUser: boolean; isGroup: boolean; isChannel: boolean }): ChatType {
  if (dialog.isUser) return "dm";
  if (dialog.isGroup) return "group";
  return "channel";
}

function peerKey(peer: Api.TypeInputPeer): string | null {
  if (peer instanceof Api.InputPeerUser) return `user:${peer.userId}`;
  if (peer instanceof Api.InputPeerChat) return `chat:${peer.chatId}`;
  if (peer instanceof Api.InputPeerChannel) return `channel:${peer.channelId}`;
  return null;
}

function dialogPeerKey(dialog: { isUser: boolean; isGroup: boolean; isChannel: boolean; entity?: any }): string | null {
  const entity = dialog.entity;
  if (!entity) return null;
  if (dialog.isUser) return `user:${entity.id}`;
  if (dialog.isChannel) return `channel:${entity.id}`;
  if (dialog.isGroup) {
    if (entity instanceof Api.Channel) return `channel:${entity.id}`;
    return `chat:${entity.id}`;
  }
  return null;
}

async function buildFolderMatcher(
  client: TelegramClient,
  folderId: number
): Promise<(dialog: any) => boolean> {
  const result = await client.invoke(new Api.messages.GetDialogFilters());
  const folder = result.filters.find(
    (f): f is Api.DialogFilter | Api.DialogFilterChatlist =>
      (f instanceof Api.DialogFilter || f instanceof Api.DialogFilterChatlist) &&
      f.id === folderId
  );

  if (!folder) {
    throw new Error(`Folder ${folderId} not found. Use 'tgcli folders' to list available folders.`);
  }

  const includedPeers = new Set<string>();
  for (const peer of [...folder.pinnedPeers, ...folder.includePeers]) {
    const key = peerKey(peer);
    if (key) includedPeers.add(key);
  }

  const excludedPeers = new Set<string>();
  if (folder instanceof Api.DialogFilter && folder.excludePeers) {
    for (const peer of folder.excludePeers) {
      const key = peerKey(peer);
      if (key) excludedPeers.add(key);
    }
  }

  return (dialog: any) => {
    const key = dialogPeerKey(dialog);
    if (!key) return false;
    if (excludedPeers.has(key)) return false;
    if (includedPeers.has(key)) return true;

    // Category flags (only on DialogFilter)
    if (folder instanceof Api.DialogFilter) {
      if (folder.excludeMuted && dialog.entity?.muted) return false;
      if (folder.excludeRead && dialog.unreadCount === 0) return false;
      if (folder.excludeArchived && dialog.archived) return false;

      if (folder.contacts && dialog.isUser) return true;
      if (folder.nonContacts && dialog.isUser) return true;
      if (folder.groups && dialog.isGroup) return true;
      if (folder.broadcasts && dialog.isChannel && !dialog.isGroup) return true;
      if (folder.bots && dialog.entity?.bot) return true;
    }

    return false;
  };
}

interface SearchOpts {
  limit: number;
  plain: boolean;
  folder?: number;
}

export async function searchCommand(query: string | undefined, opts: SearchOpts): Promise<void> {
  const client = await createClient();

  try {
    const results: ChatSearchResult[] = [];
    const lowerQuery = query?.toLowerCase();

    const matchesFolder = opts.folder != null
      ? await buildFolderMatcher(client, opts.folder)
      : null;

    for await (const dialog of client.iterDialogs({})) {
      if (results.length >= opts.limit) break;

      if (matchesFolder && !matchesFolder(dialog)) continue;
      if (lowerQuery && !dialog.name?.toLowerCase().includes(lowerQuery)) continue;

      results.push({
        id: dialog.id!.toString(),
        name: dialog.name || "",
        type: getChatType(dialog),
        unreadCount: dialog.unreadCount,
      });
    }

    console.log(formatOutput(results, opts.plain));
  } finally {
    await client.disconnect();
  }
}
