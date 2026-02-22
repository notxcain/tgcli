declare module "input" {
  function text(prompt: string): Promise<string>;
  function password(prompt: string): Promise<string>;
  function confirm(prompt: string): Promise<boolean>;
  function select(prompt: string, options: string[]): Promise<string>;
  const _default: {
    text: typeof text;
    password: typeof password;
    confirm: typeof confirm;
    select: typeof select;
  };
  export default _default;
}
