export type MoodId = 'radiant' | 'tender' | 'calm' | 'melancholy' | 'restless' | 'wonder';
export type DecorKind = 'plant' | 'lamp' | 'orb' | 'cushion' | 'boat' | 'shard' | 'balloon' | 'candle';
export type ParticleKind = 'petals' | 'rain' | 'stars' | 'embers' | 'motes' | 'bubbles';
export type PropKind = 'lamp' | 'book' | 'cup' | 'plant' | 'note' | 'frame' | 'key' | 'chair';

/** Everything the renderer needs to dress the house. Pure data, no code. */
export interface MoodPalette {
  sky: string; fog: string; wall: string; floor: string; trim: string;
  accent: string; glow: string; sun: string; ambient: string;
  sunIntensity: number; ambientIntensity: number;
}
export interface MoodPreset {
  id: MoodId;
  label: string;
  /** Short non-colour cue so mood never relies on colour alone. */
  glyph: string;
  blurb: string;
  environment: string;
  palette: MoodPalette;
  particles: { kind: ParticleKind; color: string; speed: number; rise: boolean; size: number };
  decor: DecorKind[];
  titles: string[];
  defaultMotifs: string[];
  keywords: string[];
}

export interface Fragment {
  id: string;
  kind: 'text' | 'photo' | 'music';
  prop: PropKind;
  caption: string;        // always derived from the player's own words (or a neutral label)
  image?: string;         // downscaled data URL (photo / video still)
}

export interface SpotifyRef { kind: 'track' | 'episode' | 'album' | 'playlist'; id: string; url: string; }

export interface MoodConfig {
  schemaVersion: 1;
  seed: number;
  interpreter: 'local-rules';       // honest provenance: no AI model ran
  title: string;
  moodId: MoodId;
  moodLabel: string;
  environment: string;
  motifs: string[];
  palette: MoodPalette;
  particles: MoodPreset['particles'];
  decor: DecorKind[];
  fragments: Fragment[];
}

export interface SavedWorld {
  id: string;
  createdAt: number;
  text: string;
  spotify: SpotifyRef | null;
  mediaNote?: string;
  config: MoodConfig;
}
