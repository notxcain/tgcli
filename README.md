# tgcli

Read-only Telegram CLI for agent consumption. Authenticates as your personal Telegram account via MTProto and provides structured JSON output for programmatic use.

## Install

```bash
npm install -g github:notxcain/tgcli
```

## Setup

1. Get API credentials from https://my.telegram.org/auth
2. Authenticate:

```bash
tgcli auth
```

Session is saved to `~/.tgcli/session` (mode 0600). Config saved to `~/.tgcli/config.json`.

## Commands

All commands output JSON by default. Add `--plain` for human-readable text.

### auth

Authenticate with your Telegram account (interactive).

```bash
tgcli auth
```

### folders

List all chat folders.

```bash
tgcli folders
```

```json
[
  { "id": 248, "title": "Personal" },
  { "id": 58, "title": "Spain" }
]
```

### search

Search dialogs by name, or list chats in a folder.

```bash
tgcli search "Tech"
tgcli search --folder 248
tgcli search "Mom" --folder 248
```

Options: `--folder <id>`, `--limit <n>` (default: 20), `--plain`

### active

List chats with recent activity.

```bash
tgcli active
tgcli active --days 3
```

Options: `--days <n>` (default: 5), `--limit <n>` (default: 50), `--plain`

### info

Get chat metadata.

```bash
tgcli info "123456789"
```

```json
{
  "id": "123456789",
  "name": "Tech Channel",
  "type": "channel",
  "memberCount": 166
}
```

Options: `--plain`

### read

Read messages from a chat.

```bash
tgcli read "123456789" --limit 10
tgcli read "123456789" --after 2026-02-20
tgcli read "123456789" --before 2026-02-22 --after 2026-02-20
```

Options: `--limit <n>` (default: 50), `--before <date>`, `--after <date>`, `--plain`

### download

Download media from a message.

```bash
tgcli download "123456789" 4522
tgcli download "123456789" 4522 --out-dir /tmp
```

Options: `--out-dir <path>` (default: `.`), `--plain`

## Workflow

```
tgcli folders          # find folder ID
tgcli search --folder 58   # list chats in folder
tgcli read "-100123"   # read messages
tgcli download "-100123" 42  # download media
```

## Security

- Session file has full account access (same as Telegram Desktop)
- CLI is read-only by design (no send/delete/modify operations)
- Session stored with 0600 permissions
- No data leaves your machine
