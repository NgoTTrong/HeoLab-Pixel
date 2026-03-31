export interface HelpControl {
  key: string;    // e.g. "Arrow Keys", "Space / Tap", "Right Click"
  action: string; // e.g. "Move", "Jump", "Flag cell"
}

export interface HelpSpecial {
  name: string;   // e.g. "DRIFT BOOST"
  icon: string;   // emoji e.g. "⚡"
  desc: string;   // short description, 1-2 sentences
}

export interface GameHelp {
  objective: string;
  controls: HelpControl[];
  scoring?: HelpSpecial[];
  specials?: HelpSpecial[];
}
