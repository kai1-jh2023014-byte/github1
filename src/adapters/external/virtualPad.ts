import type { TetrisAction } from "../../core/actions";
import type { TetrisInputAdapter } from "../../core/adapters";

/**
 * Xbox 360 / XInput button names. Bindings are our own defaults for a
 * local/offline PoC, not a recreation of any third-party AI.
 */
export type XInputButton =
  | "DPadLeft"
  | "DPadRight"
  | "DPadDown"
  | "DPadUp"
  | "A"
  | "B"
  | "X"
  | "Y"
  | "LeftShoulder";

export const DEFAULT_ACTION_BUTTONS: Record<TetrisAction["type"], XInputButton> = {
  moveLeft: "DPadLeft",
  moveRight: "DPadRight",
  softDrop: "DPadDown",
  hardDrop: "DPadUp",
  rotateCW: "B",
  rotateCCW: "A",
  hold: "LeftShoulder",
};

export interface PadEvent {
  atMs: number;
  action: TetrisAction;
  button: XInputButton;
  kind: "press" | "release";
}

export const EXTERNAL_POLICY = {
  allowsOnlinePlay: false,
  allowsMemoryRead: false,
  allowsAntiCheatBypass: false,
  intendedEnvironment: "local-offline-or-own-game" as const,
};

export interface VirtualPadBackend {
  readonly name: string;
  connect(): Promise<void> | void;
  disconnect(): Promise<void> | void;
  setButton(button: XInputButton, pressed: boolean): Promise<void> | void;
}

/** Records intended pad traffic without talking to a real driver. */
export class RecordingPadBackend implements VirtualPadBackend {
  readonly name = "recording";
  readonly events: PadEvent[] = [];
  connected = false;

  connect(): void {
    this.connected = true;
  }

  disconnect(): void {
    this.connected = false;
  }

  setButton(button: XInputButton, pressed: boolean): void {
    this.events.push({
      atMs: Date.now(),
      action: { type: "hardDrop" },
      button,
      kind: pressed ? "press" : "release",
    });
  }
}

/**
 * Placeholder for a future Windows ViGEmBus backend.
 * Never used for online play. Throws in this environment.
 */
export class ViGEmPadBackend implements VirtualPadBackend {
  readonly name = "vigem-windows";

  connect(): never {
    throw new Error(
      "ViGEm backend is not available here. Use RecordingPadBackend for local PoC. Do not use this on online matches.",
    );
  }

  disconnect(): void {}

  setButton(): never {
    throw new Error("ViGEm backend is not available here.");
  }
}

export class ExternalInputAdapter implements TetrisInputAdapter {
  holdMs: number;

  constructor(
    private readonly backend: VirtualPadBackend,
    private readonly buttons: Record<TetrisAction["type"], XInputButton> = DEFAULT_ACTION_BUTTONS,
    holdMs = 32,
  ) {
    this.holdMs = holdMs;
  }

  async press(action: TetrisAction): Promise<boolean> {
    if (!EXTERNAL_POLICY.intendedEnvironment) return false;
    const button = this.buttons[action.type];
    await this.backend.setButton(button, true);
    await sleep(this.holdMs);
    await this.backend.setButton(button, false);
    return true;
  }
}

export class RecordingInputAdapter implements TetrisInputAdapter {
  readonly log: PadEvent[] = [];

  constructor(
    private readonly buttons: Record<TetrisAction["type"], XInputButton> = DEFAULT_ACTION_BUTTONS,
  ) {}

  press(action: TetrisAction): boolean {
    this.log.push({
      atMs: Date.now(),
      action,
      button: this.buttons[action.type],
      kind: "press",
    });
    return true;
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
