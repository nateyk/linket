declare module 'markdown-it' {
  export interface MarkdownToken {
    attrSet(name: string, value: string): void;
    attrGet(name: string): string | null;
    children?: MarkdownToken[] | null;
    type: string;
    tag: string;
    content: string;
    info: string;
    markup: string;
    block: boolean;
    hidden: boolean;
  }

  export interface MarkdownOptions {
    html?: boolean;
    linkify?: boolean;
    typographer?: boolean;
    breaks?: boolean;
    [key: string]: unknown;
  }

  export type MarkdownEnv = Record<string, unknown>;

  export interface MarkdownRenderer {
    rules: Record<
      string,
      | ((
          tokens: MarkdownToken[],
          idx: number,
          options: MarkdownOptions,
          env: MarkdownEnv,
          self: MarkdownRenderer,
        ) => string)
      | undefined
    >;
    renderToken(
      tokens: MarkdownToken[],
      idx: number,
      options: MarkdownOptions,
    ): string;
  }

  export interface MarkdownIt {
    render(src: string, env?: MarkdownEnv): string;
    renderInline(src: string, env?: MarkdownEnv): string;
    parse(src: string, env?: MarkdownEnv): MarkdownToken[];
    use(plugin: unknown, ...params: unknown[]): this;
    renderer: MarkdownRenderer;
  }

  interface MarkdownItConstructor {
    (options?: MarkdownOptions): MarkdownIt;
  }

  const MarkdownIt: MarkdownItConstructor;
  export default MarkdownIt;
}
