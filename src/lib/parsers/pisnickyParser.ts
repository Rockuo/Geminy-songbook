// Parser for pisnicky-akordy.cz -> ChordPro format

export function extractPre(html: string): string {
  const m = html.match(/<pre[^>]*>([\s\S]*?)<\/pre>/i);
  if (!m) throw new Error('No <pre> block found on the page');
  let text = m[1].replace(/<[^>]+>/g, '');
  text = text
    .replace(/&amp;/g,  '&')
    .replace(/&lt;/g,   '<')
    .replace(/&gt;/g,   '>')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g,  "'")
    .replace(/&quot;/g, '"');
  return text;
}

export function extractTitle(html: string): string {
  let m = html.match(/<div id="songheader">[\s\S]*?<h1[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i);
  if (m) return m[1].trim();
  m = html.match(/<div id="songheader">[\s\S]*?<h1[^>]*>([\s\S]+?)<\/h1>/i);
  if (m) {
    return m[1].replace(/<[^>]+>/g, '').trim();
  }
  return '';
}

export function extractArtist(html: string): string {
  const m = html.match(/<div id="songheader">[\s\S]*?<h2[^>]*>[\s\S]*?<a[^>]*>([^<]+)<\/a>/i);
  return m ? m[1].trim() : '';
}

export function extractActiveKey(html: string): string {
  const m = html.match(/<li[^>]+class=["'][^"']*active[^"']*["'][^>]*>\s*<a[^>]*>([^<]+)<\/a>/i);
  return m ? m[1].trim() : '';
}

const CHORD_TOKEN_RE = /^[A-H](b|#|is|es|s)?(m|mi|min|maj|sus|aug|dim|add|\d)*(\/[A-H](b|#|is|es|s)?)?$/;

export function isChordToken(token: string): boolean {
  return CHORD_TOKEN_RE.test(token);
}

export function isChordLine(line: string): boolean {
  const stripped = line.trim();
  if (!stripped) return false;
  return stripped.split(/\s+/).every(isChordToken);
}

export function mergeChordAndLyric(chordLine: string, lyricLine: string): string {
  const chords: { pos: number; chord: string }[] = [];
  let i = 0;
  while (i < chordLine.length) {
    if (chordLine[i] !== ' ') {
      let j = i;
      while (j < chordLine.length && chordLine[j] !== ' ') j++;
      chords.push({ pos: i, chord: chordLine.slice(i, j) });
      i = j;
    } else {
      i++;
    }
  }

  if (chords.length === 0) return lyricLine;

  const chars = [...lyricLine];
  for (let k = chords.length - 1; k >= 0; k--) {
    const { pos, chord } = chords[k];
    const tag = `[${chord}]`;
    if (pos <= chars.length) {
      chars.splice(pos, 0, tag);
    } else {
      chars.push(tag);
    }
  }
  return chars.join('');
}

export function isInstrumentalLine(line: string): boolean {
  return /^\s*(mezihra|intro|dohra|předehra)\s*:/i.test(line);
}

export function spaceChordLine(line: string): string {
  const tokens: string[] = [];
  let i = 0;
  const s = line.trimStart();
  while (i < s.length) {
    if (s[i] !== ' ') {
      let j = i;
      while (j < s.length && s[j] !== ' ') j++;
      tokens.push(s.slice(i, j));
      i = j;
    } else {
      i++;
    }
  }
  if (tokens.length === 0) return '';
  let out = `[${tokens[0]}]`;
  for (let k = 1; k < tokens.length; k++) {
    const gap = 2 + tokens[k - 1].length;
    out += ' '.repeat(gap) + `[${tokens[k]}]`;
  }
  return out;
}

export function convertInstrumentalLine(line: string): string {
  const m = line.match(/^(\s*)(mezihra|intro|dohra|předehra)\s*:\s*(.*)/i);
  if (!m) return line;
  const [, , label, rest] = m;
  const tokens = rest.includes(',')
    ? rest.split(',').map((t: string) => t.trim()).filter(Boolean)
    : rest.trim().split(/\s+/).filter(Boolean);
  
  if (tokens.length && tokens.every(isChordToken)) {
    if (rest.includes(',')) {
      return `${label}: ${tokens.map((t: string) => `[${t}]`).join('  ')}`;
    } else {
      return `${label}: ${spaceChordLine(rest.trim())}`;
    }
  }
  return `${label}: ${rest.trim()}`;
}

export function isStandaloneVerseNumber(line: string): boolean {
  return /^\s*\d+\.\s*$/.test(line);
}

export function stripVerseNumber(line: string): { line: string; offset: number } {
  const m = line.match(/^(\s*\d+\.\s+)/);
  if (m) {
    const offset = m[1].length;
    return { line: line.slice(offset), offset };
  }
  return { line, offset: 0 };
}

export function splitIntoVerseBlocks(preText: string): string[][] {
  const lines = preText.split(/\r?\n/);
  const blocks: string[][] = [];
  let current: string[] = [];

  for (const line of lines) {
    if (line.trim() === '') {
      if (current.length) {
        blocks.push(current);
        current = [];
      }
    } else {
      current.push(line);
    }
  }
  if (current.length) blocks.push(current);
  return blocks;
}

export function isChorusBlock(block: string[]): boolean {
  for (const line of block) {
    if (isStandaloneVerseNumber(line)) continue;
    if (!isChordLine(line)) {
      return /^\s*(R|Ref)\s*:/i.test(line);
    }
  }
  return false;
}

export function stripChorusPrefix(line: string): string {
  return line.replace(/^\s*(R|Ref)\s*:\s*/i, '').trim();
}

export function convertBlock(block: string[]): string[] {
  const result: string[] = [];
  let i = 0;

  while (i < block.length) {
    const line = block[i];

    if (isStandaloneVerseNumber(line)) {
      i++;
      continue;
    }

    if (isInstrumentalLine(line)) {
      result.push(convertInstrumentalLine(line).trim());
      i++;
      continue;
    }

    if (isChordLine(line)) {
      const chordLine = line;
      if (i + 1 < block.length && !isChordLine(block[i + 1])
                                && !isStandaloneVerseNumber(block[i + 1])) {
        const nextLine = block[i + 1];
        const { line: afterVerse, offset: verseOffset } = stripVerseNumber(nextLine);
        const chorusPrefixMatch = afterVerse.match(/^(\s*(R|Ref)\s*:\s*)/i);
        const chorusPrefixLen   = chorusPrefixMatch ? chorusPrefixMatch[1].length : 0;
        const totalOffset       = verseOffset + chorusPrefixLen;

        const adjustedChord = totalOffset < chordLine.length
          ? chordLine.slice(totalOffset)
          : chordLine;

        const lyricRaw     = afterVerse.slice(chorusPrefixLen);
        const trimmedLyric = lyricRaw.trimStart();
        const spaceTrim    = lyricRaw.length - trimmedLyric.length;
        const finalChord   = spaceTrim < adjustedChord.length
          ? adjustedChord.slice(spaceTrim)
          : adjustedChord;

        result.push(mergeChordAndLyric(finalChord, trimmedLyric).trimEnd());
        i += 2;
      } else {
        result.push(spaceChordLine(chordLine));
        i++;
      }
      continue;
    }

    const { line: afterVerse } = stripVerseNumber(line);
    result.push(stripChorusPrefix(afterVerse).trim());
    i++;
  }

  return result;
}

export function convertBlockWithMeta(block: string[]): { lines: string[]; chorus: boolean } {
  const chorus = isChorusBlock(block);
  return { lines: convertBlock(block), chorus };
}

import { ParsedSong, SongParser } from './types';

export const PisnickyAkordyParser: SongParser = {
  id: 'pisnicky-akordy',
  name: 'pisnicky-akordy.cz',
  canParse: (html: string) => {
    return html.includes('pisnicky-akordy.cz') || html.includes('Písničky Akordy');
  },
  parse: (html: string): ParsedSong => {
    const preText = extractPre(html);
    const title   = extractTitle(html);
    const artist  = extractArtist(html);
    const key     = extractActiveKey(html);

    const lines: string[] = [];

    const blocks = splitIntoVerseBlocks(preText);
    for (const block of blocks) {
      const { lines: converted, chorus } = convertBlockWithMeta(block);
      if (converted.length) {
        lines.push(chorus ? '{soc}' : '{sov}');
        lines.push(...converted);
        lines.push(chorus ? '{eoc}' : '{eov}');
        lines.push('');
      }
    }

    return { 
      title, 
      artist, 
      key, 
      chordpro: lines.join('\n'),
      sourceNotation: 'german' 
    };
  }
};
