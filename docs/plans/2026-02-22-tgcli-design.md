# tgcli Design

Read-only Telegram CLI for local agent consumption. Authenticates as a personal Telegram account via MTProto user API.

## Commands & Interface

```
tgcli auth                          # Interactive: phone -> code -> 2FA -> saves session
tgcli search <query>                # Search dialogs (DMs, groups, channels) by name
tgcli info <chat-id>                # Get chat metadata
tgcli read <chat-id>                # Read messages from a chat
tgcli download <chat-id> <msg-id>   # Download media from a specific message
```

### Global flags

- `--json` (default) — structured JSON output
- `--plain` — human-readable plain text
- `--help` — per-command help with examples

### Command-specific flags

**search:** `--limit <n>` (default: 20)

**read:**
- `--limit <n>` (default: 50)
- `--before <date>` — messages before ISO date (e.g. `2026-02-20`)
- `--after <date>` — messages after ISO date

**download:** `--out-dir <path>` (default: current dir)

### Chat ID format

Telegram numeric IDs. Workflow: `search` -> get ID -> `info`/`read`/`download`.

## Output Schemas

### search

```json
[
  {
    "id": "123456789",
    "name": "John Doe",
    "type": "dm",
    "unreadCount": 3
  }
]
```

Types: `dm`, `group`, `channel`.

### info

```json
{
  "id": "123456789",
  "name": "John Doe",
  "type": "dm",
  "memberCount": 2
}
```

### read

```json
[
  {
    "id": 4521,
    "date": "2026-02-22T10:30:00Z",
    "from": "John Doe",
    "text": "Hey, check this out",
    "media": null
  },
  {
    "id": 4522,
    "date": "2026-02-22T10:31:00Z",
    "from": "John Doe",
    "text": "Here's the file",
    "media": {
      "type": "document",
      "filename": "report.pdf",
      "size": 245000,
      "mimeType": "application/pdf"
    }
  }
]
```

Messages ordered newest-first. `media` is `null` for text-only. Media types: `photo`, `video`, `document`, `sticker`, `voice`, `audio`, `other`.

### download

```json
{
  "path": "/Users/notxcain/downloads/report.pdf",
  "size": 245000,
  "mimeType": "application/pdf"
}
```

### Plain text mode

```
[2026-02-22 10:30] John Doe: Hey, check this out
[2026-02-22 10:31] John Doe: Here's the file [document: report.pdf, 245KB]
[2026-02-22 10:32] John Doe: [photo: 1920x1080, 512KB]
```

## Project Structure

```
tgcli/
├── package.json
├── tsconfig.json
├── src/
│   ├── cli.ts              # Entry point, commander setup, subcommand routing
│   ├── commands/
│   │   ├── auth.ts         # Interactive auth flow
│   │   ├── search.ts       # Dialog search
│   │   ├── info.ts         # Chat info
│   │   ├── read.ts         # Read messages
│   │   └── download.ts     # Download media
│   ├── client.ts           # GramJS client factory, session loading
│   ├── output.ts           # JSON/plain text formatters
│   └── types.ts            # Shared TypeScript types
```

## Tech Stack

- **telegram** (GramJS) — MTProto client
- **commander** — CLI framework with built-in --help
- **input** — interactive auth prompts

Build: TypeScript compiled to ESM. `bin` field in package.json.

## Session & Config Storage

All in `~/.tgcli/`:
- `config.json` — `api_id` and `api_hash`
- `session` — GramJS StringSession

## Auth Flow

1. `tgcli auth` prompts for API ID, API Hash, phone number
2. GramJS sends code request to Telegram
3. User enters code (and 2FA password if enabled)
4. StringSession saved to `~/.tgcli/session`
5. Re-running `tgcli auth` overwrites existing session

All other commands fail with `Error: Not authenticated. Run 'tgcli auth' first.` if no session exists.

## Error Handling

- Non-zero exit codes on failure
- Errors to stderr as JSON `{"error": "message"}` or plain text depending on mode
- Auth errors suggest running `tgcli auth`
