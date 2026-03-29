"use client";

import { playHoverSound, playClickSound } from "@/lib/uiSounds";

/**
 * Returns onMouseEnter + onClick handlers that play pixel UI sounds.
 * Attach to any interactive element: <button {...sounds}> or <Link {...sounds}>
 */
export function usePixelSound() {
  return {
    onMouseEnter: playHoverSound,
    onClick: playClickSound,
  };
}
