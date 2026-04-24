export interface ParsedSong {
  title: string;
  artist: string;
  key: string;
  chordpro: string;
  sourceNotation?: 'standard' | 'german';
}

export interface SongParser {
  id: string;
  name: string;
  canParse(html: string): boolean;
  parse(html: string): ParsedSong | Promise<ParsedSong>;
}
