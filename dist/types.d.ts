export type ChatType = "dm" | "group" | "channel";
export interface ChatSearchResult {
    id: string;
    name: string;
    type: ChatType;
    unreadCount: number;
}
export interface ChatInfo {
    id: string;
    name: string;
    type: ChatType;
    memberCount: number;
}
export interface MediaInfo {
    type: "photo" | "video" | "document" | "sticker" | "voice" | "audio" | "other";
    filename?: string;
    size?: number;
    mimeType?: string;
    width?: number;
    height?: number;
    duration?: number;
}
export interface MessageResult {
    id: number;
    date: string;
    from: string;
    text: string;
    media: MediaInfo | null;
}
export interface DownloadResult {
    path: string;
    size: number;
    mimeType: string;
}
