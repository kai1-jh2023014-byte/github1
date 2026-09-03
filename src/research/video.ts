import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import type { PixelBuffer } from "../vision/render";

export interface VideoInfo {
  path: string;
  durationSec: number;
  width: number;
  height: number;
  fps: number;
}

export function probeVideo(path: string): VideoInfo | null {
  const result = spawnSync(
    "ffprobe",
    [
      "-v",
      "error",
      "-select_streams",
      "v:0",
      "-show_entries",
      "stream=width,height,r_frame_rate,duration",
      "-show_entries",
      "format=duration",
      "-of",
      "json",
      path,
    ],
    { encoding: "utf8" },
  );
  if (result.status !== 0) return null;
  const json = JSON.parse(result.stdout) as {
    streams?: { width?: number; height?: number; r_frame_rate?: string; duration?: string }[];
    format?: { duration?: string };
  };
  const stream = json.streams?.[0];
  if (!stream?.width || !stream.height) return null;
  const [num, den] = (stream.r_frame_rate ?? "10/1").split("/").map(Number);
  const fps = den ? num / den : 10;
  const durationSec = Number(stream.duration ?? json.format?.duration ?? 0);
  return { path, durationSec, width: stream.width, height: stream.height, fps };
}

export function extractFrames(path: string, fps = 8): { info: VideoInfo; frames: { time: number; buffer: PixelBuffer }[] } {
  const info = probeVideo(path);
  if (!info) throw new Error(`ffprobe failed for ${path}`);
  const dir = mkdtempSync(join(tmpdir(), "tetris-replay-"));
  try {
    const out = spawnSync(
      "ffmpeg",
      ["-y", "-i", path, "-vf", `fps=${fps}`, join(dir, "frame_%05d.ppm")],
      { encoding: "utf8" },
    );
    if (out.status !== 0) throw new Error(out.stderr || "ffmpeg extract failed");
    const files = readdirSync(dir)
      .filter((name) => name.endsWith(".ppm"))
      .sort();
    const frames = files.map((name, i) => ({
      time: i / fps,
      buffer: readPpm(join(dir, name)),
    }));
    return { info, frames };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

export function writeVideo(path: string, frames: PixelBuffer[], fps = 8): void {
  if (frames.length === 0) return;
  const dir = mkdtempSync(join(tmpdir(), "tetris-encode-"));
  try {
    frames.forEach((frame, i) => {
      writeFileSync(join(dir, `frame_${String(i).padStart(5, "0")}.ppm`), encodePpm(frame));
    });
    const out = spawnSync(
      "ffmpeg",
      [
        "-y",
        "-framerate",
        String(fps),
        "-i",
        join(dir, "frame_%05d.ppm"),
        "-pix_fmt",
        "yuv420p",
        path,
      ],
      { encoding: "utf8" },
    );
    if (out.status !== 0) throw new Error(out.stderr || "ffmpeg encode failed");
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}

function readPpm(path: string): PixelBuffer {
  const raw = readFileSync(path);
  let offset = 0;
  const nextToken = (): string => {
    while (offset < raw.length) {
      const c = raw[offset]!;
      if (c === 35) {
        while (offset < raw.length && raw[offset] !== 10) offset += 1;
        continue;
      }
      if (c === 9 || c === 10 || c === 13 || c === 32) {
        offset += 1;
        continue;
      }
      break;
    }
    const start = offset;
    while (offset < raw.length) {
      const c = raw[offset]!;
      if (c === 9 || c === 10 || c === 13 || c === 32) break;
      offset += 1;
    }
    return ascii(raw.subarray(start, offset));
  };
  const magic = nextToken();
  if (magic !== "P6") throw new Error(`unsupported ppm ${magic}`);
  const width = Number(nextToken());
  const height = Number(nextToken());
  nextToken();
  if (raw[offset] === 10 || raw[offset] === 13) offset += 1;
  const pixels = raw.subarray(offset);
  const data = new Uint8ClampedArray(width * height * 4);
  for (let i = 0, p = 0; i < width * height; i += 1, p += 3) {
    const o = i * 4;
    data[o] = pixels[p]!;
    data[o + 1] = pixels[p + 1]!;
    data[o + 2] = pixels[p + 2]!;
    data[o + 3] = 255;
  }
  return { width, height, data };
}

function encodePpm(frame: PixelBuffer): Uint8Array {
  const header = new TextEncoder().encode(`P6\n${frame.width} ${frame.height}\n255\n`);
  const body = new Uint8Array(frame.width * frame.height * 3);
  for (let i = 0, p = 0; i < frame.width * frame.height; i += 1, p += 3) {
    const o = i * 4;
    body[p] = frame.data[o]!;
    body[p + 1] = frame.data[o + 1]!;
    body[p + 2] = frame.data[o + 2]!;
  }
  const out = new Uint8Array(header.length + body.length);
  out.set(header, 0);
  out.set(body, header.length);
  return out;
}

function ascii(bytes: Uint8Array): string {
  let text = "";
  for (let i = 0; i < bytes.length; i++) text += String.fromCharCode(bytes[i]!);
  return text;
}
