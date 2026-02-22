export function formatOutput(data, plain) {
    if (!plain) {
        return JSON.stringify(data, null, 2);
    }
    if (Array.isArray(data) && data.length > 0 && "text" in data[0]) {
        return formatMessagesPlain(data);
    }
    if (Array.isArray(data) && data.length > 0 && "unreadCount" in data[0]) {
        return formatSearchPlain(data);
    }
    if (!Array.isArray(data) && data && typeof data === "object" && "memberCount" in data) {
        return formatInfoPlain(data);
    }
    if (!Array.isArray(data) && data && typeof data === "object" && "path" in data) {
        return formatDownloadPlain(data);
    }
    return JSON.stringify(data, null, 2);
}
function formatSearchPlain(results) {
    return results
        .map((r) => `[${r.type}] ${r.name} (id: ${r.id}, unread: ${r.unreadCount})`)
        .join("\n");
}
function formatInfoPlain(info) {
    return `${info.name}\n  Type: ${info.type}\n  ID: ${info.id}\n  Members: ${info.memberCount}`;
}
function formatMediaTag(media) {
    const parts = [media.type];
    if (media.filename)
        parts.push(media.filename);
    if (media.width && media.height)
        parts.push(`${media.width}x${media.height}`);
    if (media.size)
        parts.push(formatBytes(media.size));
    if (media.duration)
        parts.push(`${media.duration}s`);
    const [type, ...rest] = parts;
    return rest.length > 0 ? `[${type}: ${rest.join(", ")}]` : `[${type}]`;
}
function formatBytes(bytes) {
    if (bytes < 1024)
        return `${bytes}B`;
    if (bytes < 1024 * 1024)
        return `${Math.round(bytes / 1024)}KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}
function formatMessagesPlain(messages) {
    return messages
        .map((m) => {
        const date = new Date(m.date).toISOString().replace("T", " ").slice(0, 16);
        const mediaTag = m.media ? " " + formatMediaTag(m.media) : "";
        const text = m.text || "";
        return `[${date}] ${m.from}: ${text}${mediaTag}`;
    })
        .join("\n");
}
function formatDownloadPlain(result) {
    return `Downloaded: ${result.path} (${formatBytes(result.size)}, ${result.mimeType})`;
}
