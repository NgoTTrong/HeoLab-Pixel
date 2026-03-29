import { tone } from "./audioUtils";

let ctx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!ctx) ctx = new AudioContext();
  if (ctx.state === "suspended") ctx.resume();
  return ctx;
}

/** Short blip on hover — classic menu cursor sound */
export function playHoverSound(): void {
  try {
    tone(getCtx(), "square", 580, 620, 0.07, 0.07);
  } catch {
    // AudioContext blocked — silently ignore
  }
}

/** Rising confirm tone on click */
export function playClickSound(): void {
  try {
    const c = getCtx();
    tone(c, "square", 300, 900, 0.12, 0.14);
  } catch {
    // AudioContext blocked — silently ignore
  }
}
