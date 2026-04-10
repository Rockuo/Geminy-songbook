export const KEYS = ['C', 'C#', 'D', 'Eb', 'E', 'F', 'F#', 'G', 'Ab', 'A', 'Bb', 'B'];

const CHROMATIC_SHARPS = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];
const CHROMATIC_FLATS = ['C', 'Db', 'D', 'Eb', 'E', 'F', 'Gb', 'G', 'Ab', 'A', 'Bb', 'B'];

// Helper to get index of a note
function getNoteIndex(note: string): number {
  let idx = CHROMATIC_SHARPS.indexOf(note);
  if (idx === -1) idx = CHROMATIC_FLATS.indexOf(note);
  return idx;
}

// Determine if a key prefers sharps or flats
function prefersFlats(key: string): boolean {
  return ['F', 'Bb', 'Eb', 'Ab', 'Db', 'Gb', 'Dm', 'Gm', 'Cm', 'Fm', 'Bbm', 'Ebm'].includes(key);
}

export function transposeChord(chord: string, steps: number, targetKey: string): string {
  if (!chord) return chord;
  
  // Parse the chord. e.g. "C#m7/F#" -> root: "C#", suffix: "m7", bass: "F#"
  const match = chord.match(/^([A-G][#b]?)(.*?)(\/([A-G][#b]?))?$/);
  if (!match) return chord; // If it doesn't match standard chord format, return as is
  
  const root = match[1];
  const suffix = match[2] || '';
  const bass = match[4];
  
  const useFlats = prefersFlats(targetKey);
  const scale = useFlats ? CHROMATIC_FLATS : CHROMATIC_SHARPS;
  
  const transposeNote = (note: string) => {
    const idx = getNoteIndex(note);
    if (idx === -1) return note;
    
    // Calculate new index with wrap around
    let newIdx = (idx + steps) % 12;
    if (newIdx < 0) newIdx += 12;
    
    return scale[newIdx];
  };
  
  const newRoot = transposeNote(root);
  const newBass = bass ? `/${transposeNote(bass)}` : '';
  
  return `${newRoot}${suffix}${newBass}`;
}

export function calculateSteps(fromKey: string, toKey: string): number {
  const fromIdx = getNoteIndex(fromKey);
  const toIdx = getNoteIndex(toKey);
  
  if (fromIdx === -1 || toIdx === -1) return 0;
  
  let steps = toIdx - fromIdx;
  if (steps < -6) steps += 12;
  if (steps > 6) steps -= 12;
  
  return steps;
}
