import { TelegramClient } from "telegram";
export interface TgConfig {
    apiId: number;
    apiHash: string;
}
export declare function ensureConfigDir(): Promise<void>;
export declare function saveConfig(config: TgConfig): Promise<void>;
export declare function loadConfig(): Promise<TgConfig>;
export declare function saveSession(session: string): Promise<void>;
export declare function loadSession(): Promise<string>;
export declare function createClient(): Promise<TelegramClient>;
