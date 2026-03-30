import type { ComboEffects } from "./types";
import {
  COMBO_BREAK_TICKS,
  COMBO_DOT_CAP,
  COMBO_MILESTONES,
  COMBO_SPEED_BOOST_TICKS,
  COMBO_VISION_BOOST_TICKS,
  COMBO_MINI_POWER_TICKS,
  SCORE,
  TICK_MS,
} from "./config";

export interface ComboResult {
  combo: number;
  score: number;           // additional score to add (on top of base dot score)
  comboEffects: ComboEffects;
  milestonePopup: string | null;
  milestonePopupTimer: number;
  lastMilestone: number;
}

/** Calculate score for a dot with combo multiplier. */
export function comboDotScore(combo: number): number {
  const mult = Math.min(combo, COMBO_DOT_CAP);
  return SCORE.dot * Math.max(mult, 1);
}

/**
 * Process a dot being eaten in survival mode.
 * Increments combo, checks milestones, returns updated values.
 */
export function onDotEaten(
  combo: number,
  effects: ComboEffects,
  prevMilestone: number,
): ComboResult {
  const newCombo = combo + 1;
  let bonusScore = 0;
  let popup: string | null = null;
  let popupTimer = 0;
  let newEffects = { ...effects };
  let milestone = prevMilestone;

  // Check milestones (only trigger each once per combo streak)
  for (const m of COMBO_MILESTONES) {
    if (newCombo >= m.combo && prevMilestone < m.combo) {
      bonusScore += m.bonus;
      milestone = m.combo;
      if (m.label) {
        popup = m.label;
        popupTimer = Math.round(1.5 * 1000 / TICK_MS);
      }
      if (m.effect === "speedBoost") newEffects.speedBoost = COMBO_SPEED_BOOST_TICKS;
      if (m.effect === "visionBoost") newEffects.visionBoost = COMBO_VISION_BOOST_TICKS;
      if (m.effect === "miniPower") newEffects.miniPower = COMBO_MINI_POWER_TICKS;
    }
  }

  const dotScore = comboDotScore(newCombo);

  return {
    combo: newCombo,
    score: dotScore + bonusScore - SCORE.dot, // subtract base dot score (already added by movePacman)
    comboEffects: newEffects,
    milestonePopup: popup,
    milestonePopupTimer: popupTimer,
    lastMilestone: milestone,
  };
}

/** Process a ghost being eaten — adds to combo without resetting. */
export function onGhostEaten(combo: number): number {
  return combo + 1;
}

/** Check if combo should break (pac-man didn't move). */
export function shouldBreakCombo(comboTimer: number): boolean {
  return comboTimer > COMBO_BREAK_TICKS;
}

/** Tick down active combo effects, return updated. */
export function tickComboEffects(effects: ComboEffects): ComboEffects {
  return {
    speedBoost: Math.max(0, effects.speedBoost - 1),
    visionBoost: Math.max(0, effects.visionBoost - 1),
    miniPower: Math.max(0, effects.miniPower - 1),
  };
}

/** Get combo color hex based on current combo count. */
export function getComboColor(combo: number): string {
  if (combo >= 50) return "#ff2d55";   // red
  if (combo >= 20) return "#f97316";   // orange
  if (combo >= 10) return "#ffe600";   // yellow
  return "#ffffff";                     // white
}
