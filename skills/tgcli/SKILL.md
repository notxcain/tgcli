---
name: tgcli
description: Use when the user asks about Telegram messages, chats, or contacts — provides the tgcli command reference for reading Telegram data
---

# tgcli — Read-Only Telegram CLI

Read-only CLI that authenticates as the user's personal Telegram account via MTProto. All output is structured for agent consumption.

**Binary:** `tgcli` (installed globally via `npm install -g @notxcain/tgcli`)
**Session:** `~/.tgcli/session` (mode 0600)
**Config:** `~/.tgcli/config.json`

## Global flags

| Flag | Format |
|------|--------|
| _(default)_ | TOON (token-efficient, 30-60% smaller than JSON) |
| `--json` | JSON (pretty-printed) |
| `--plain` | Human-readable plain text |
| `--format <fmt>` | Explicit: `toon`, `json`, or `plain` |

## Commands

### auth

Interactive authentication. Requires API credentials from https://my.telegram.org/auth.

```bash
tgcli auth
```

### folders

List all chat folders. Returns array of `{ id, name }`.

```bash
tgcli folders
tgcli folders --json
```

### search [query]

Search dialogs by name, or list chats in a folder. Requires either a query or `--folder`.

```bash
tgcli search "Tech"
tgcli search --folder 248
tgcli search "Mom" --folder 248
```

| Option | Default | Description |
|--------|---------|-------------|
| `--folder <id>` | — | Filter to chats in this folder (use `tgcli folders` to list) |
| `--limit <n>` | 20 | Maximum results |

Returns array of:
```json
{ "id": "123456789", "name": "John Doe", "type": "dm|group|channel", "unreadCount": 3 }
```

### active

List chats with recent activity.

```bash
tgcli active
tgcli active --days 3
```

| Option | Default | Description |
|--------|---------|-------------|
| `--days <n>` | 5 | Number of days to look back |
| `--limit <n>` | 50 | Maximum results |

Returns same shape as `search`.

### info \<chat-id\>

Get chat metadata.

```bash
tgcli info "123456789"
```

Returns:
```json
{ "id": "123456789", "name": "John Doe", "type": "dm|group|channel", "memberCount": 2 }
```

### read \<chat-id\>

Read messages from a chat.

```bash
tgcli read "123456789" --limit 10
tgcli read "123456789" --after 2026-02-20
tgcli read "123456789" --before 2026-02-22 --after 2026-02-20
```

| Option | Default | Description |
|--------|---------|-------------|
| `--limit <n>` | 50 | Maximum messages |
| `--before <date>` | — | Messages before this ISO date |
| `--after <date>` | — | Messages after this ISO date |

Returns array of:
```json
{
  "id": 4522,
  "date": "2026-02-22T10:31:00Z",
  "from": "John Doe",
  "text": "Here's the file",
  "media": { "type": "photo|video|document|sticker|voice|audio|other", "filename": "report.pdf", "size": 245000, "mimeType": "application/pdf", "width": 1920, "height": 1080, "duration": 120 }
}
```

`media` is `null` when the message has no attachment.

### download \<chat-id\> \<message-id\>

Download media from a specific message.

```bash
tgcli download "123456789" 4522
tgcli download "123456789" 4522 --out-dir /tmp
```

| Option | Default | Description |
|--------|---------|-------------|
| `--out-dir <path>` | `.` | Output directory |

Returns:
```json
{ "path": "/tmp/report.pdf", "size": 245000, "mimeType": "application/pdf" }
```
