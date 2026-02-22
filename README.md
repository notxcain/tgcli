# tgcli

Read-only Telegram CLI for agent consumption. Authenticates as your personal Telegram account via MTProto and provides structured output optimized for LLM token efficiency.

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

## Output formats

All commands output [TOON](https://github.com/nicholasgasior/toon) (Token-Oriented Object Notation) by default — a compact format that reduces token usage by 30-60% vs JSON for arrays of objects. Use global flags to switch format:

| Flag | Format |
|------|--------|
| _(default)_ | TOON |
| `--json` | JSON (pretty-printed) |
| `--plain` | Human-readable plain text |
| `--format <fmt>` | Explicit: `toon`, `json`, or `plain` |

## Commands

### auth

Authenticate with your Telegram account (interactive).

```bash
tgcli auth
```

### folders

List all chat folders.

```bash
tgcli folders
tgcli folders --json
```

### search

Search dialogs by name, or list chats in a folder.

```bash
tgcli search "Tech"
tgcli search --folder 248
tgcli search "Mom" --folder 248
```

Options: `--folder <id>`, `--limit <n>` (default: 20)

### active

List chats with recent activity.

```bash
tgcli active
tgcli active --days 3
```

Options: `--days <n>` (default: 5), `--limit <n>` (default: 50)

### info

Get chat metadata.

```bash
tgcli info "123456789"
tgcli info "123456789" --json
```

### read

Read messages from a chat.

```bash
tgcli read "123456789" --limit 10
tgcli read "123456789" --after 2026-02-20
tgcli read "123456789" --before 2026-02-22 --after 2026-02-20
```

Options: `--limit <n>` (default: 50), `--before <date>`, `--after <date>`

### download

Download media from a message.

```bash
tgcli download "123456789" 4522
tgcli download "123456789" 4522 --out-dir /tmp
```

Options: `--out-dir <path>` (default: `.`)

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
