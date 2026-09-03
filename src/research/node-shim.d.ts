declare module "node:fs" {
  export function mkdirSync(path: string, options?: { recursive?: boolean }): void;
  export function writeFileSync(path: string, data: string | Uint8Array): void;
  export function readFileSync(path: string): Uint8Array;
  export function readdirSync(path: string): string[];
  export function mkdtempSync(prefix: string): string;
  export function rmSync(path: string, options?: { recursive?: boolean; force?: boolean }): void;
}

declare module "node:path" {
  export function join(...parts: string[]): string;
  export function dirname(path: string): string;
}

declare module "node:os" {
  export function tmpdir(): string;
}

declare module "node:child_process" {
  export function spawnSync(
    command: string,
    args: string[],
    options?: { encoding?: string },
  ): { status: number | null; stdout: string; stderr: string };
}
