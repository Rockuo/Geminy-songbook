import { PisnickyAkordyParser } from './pisnickyParser';
import { ParsedSong, SongParser } from './types';

export const PARSERS: SongParser[] = [
  PisnickyAkordyParser,
  // Future parsers go here
];

export async function parseHtmlDrop(html: string): Promise<ParsedSong> {
  const parser = PARSERS.find(p => p.canParse(html));
  if (!parser) {
    throw new Error('No compatible parser found for this HTML format.');
  }
  return await parser.parse(html);
}
