export const KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];
export const GERMAN_KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'B', 'H'];

const CHROMATIC_SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CHROMATIC_FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

export type Notation = 'standard' | 'german';

export function normalizeNote(note: string, notation: Notation): string {
  if (notation === 'german') {
    if (note === 'H') return 'B';
    if (note === 'B') return 'Bb';
  }
  return note;
}

export function formatNote(note: string, notation: Notation): string {
  if (notation === 'german') {
    if (note === 'B') return 'H';
    if (note === 'Bb') return 'B';
  }
  return note;
}

// Helper to get index of a note
function getNoteIndex(note: string, notation: Notation = 'standard'): number {
  const normalized = normalizeNote(note, notation);
  let idx = CHROMATIC_SHARPS.indexOf(normalized);
  if (idx === -1) idx = CHROMATIC_FLATS.indexOf(normalized);
  return idx;
}

// Determine if a key prefers sharps or flats
function prefersFlats(key: string, notation: Notation = 'standard'): boolean {
  const normalized = normalizeNote(key, notation);
  return ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm'].includes(normalized);
}

export function transposeChord(chord: string, steps: number, targetKey: string, sourceNotation: Notation = 'standard', targetNotation: Notation = 'standard'): string {
  if (!chord) return chord;
  
  // Parse the chord. e.g. "C#m7/F#" -> root: "C#", suffix: "m7", bass: "F#"
  // Allow H for German notation
  const match = chord.match(/^([A-H][#b]?)(.*?)(\/([A-H][#b]?))?$/);
  if (!match) return chord; // If it doesn't match standard chord format, return as is
  
  const root = match[1];
  const suffix = match[2] || '';
  const bass = match[4];
  
  const useFlats = prefersFlats(targetKey, targetNotation);
  const scale = useFlats ? CHROMATIC_FLATS : CHROMATIC_SHARPS;
  
  const transposeNote = (note: string) => {
    if (steps === 0) {
      const normalized = normalizeNote(note, sourceNotation);
      return formatNote(normalized, targetNotation);
    }

    const idx = getNoteIndex(note, sourceNotation);
    if (idx === -1) return note;
    
    // Calculate new index with wrap around
    let newIdx = (idx + steps) % 12;
    if (newIdx < 0) newIdx += 12;
    
    return formatNote(scale[newIdx], targetNotation);
  };
  
  const newRoot = transposeNote(root);
  const newBass = bass ? `/${transposeNote(bass)}` : '';
  
  return `${newRoot}${suffix}${newBass}`;
}

export function calculateSteps(fromKey: string, toKey: string, sourceNotation: Notation = 'standard', targetNotation: Notation = 'standard'): number {
  const fromIdx = getNoteIndex(fromKey, sourceNotation);
  const toIdx = getNoteIndex(toKey, targetNotation);
  
  if (fromIdx === -1 || toIdx === -1) return 0;
  
  let steps = toIdx - fromIdx;
  if (steps < -6) steps += 12;
  if (steps > 6) steps -= 12;
  
  return steps;
}
