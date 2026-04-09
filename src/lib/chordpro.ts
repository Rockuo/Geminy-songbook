export interface ChordProLine {
  type: 'lyric' | 'directive' | 'empty';
  content?: string;
  parts?: { chord: string; lyric: string }[];
}

export function parseChordPro(text: string): ChordProLine[] {
  const lines = text.split('\n');
  return lines.map(line => {
    line = line.trimEnd();
    if (!line) return { type: 'empty' };
    
    if (line.startsWith('{') && line.endsWith('}')) {
      return { type: 'directive', content: line.slice(1, -1) };
    }
    
    const parts: { chord: string; lyric: string }[] = [];
    const regex = /\[(.*?)\]/g;
    let lastIndex = 0;
    let match;
    
    while ((match = regex.exec(line)) !== null) {
      if (match.index > lastIndex) {
        parts.push({ chord: '', lyric: line.substring(lastIndex, match.index) });
      }
      const chord = match[1];
      lastIndex = regex.lastIndex;
      
      const nextMatchIndex = line.indexOf('[', lastIndex);
      const lyric = nextMatchIndex !== -1 
        ? line.substring(lastIndex, nextMatchIndex) 
        : line.substring(lastIndex);
        
      parts.push({ chord, lyric });
      lastIndex += lyric.length;
    }
    
    if (lastIndex < line.length && parts.length === 0) {
      parts.push({ chord: '', lyric: line.substring(lastIndex) });
    }
    
    return { type: 'lyric', parts };
  });
}
