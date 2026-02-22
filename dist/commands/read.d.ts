interface ReadOpts {
    limit: number;
    before?: string;
    after?: string;
    plain: boolean;
}
export declare function readCommand(chatId: string, opts: ReadOpts): Promise<void>;
export {};
