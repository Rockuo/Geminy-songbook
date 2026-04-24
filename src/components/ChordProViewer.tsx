import React from 'react';
import { parseChordPro } from '../lib/chordpro';
import { transposeChord, Notation } from '../lib/transpose';

export function ChordProViewer({ 
  text, 
  className = '',
  transposeSteps = 0,
  targetKey = 'C',
  sourceNotation = 'standard',
  targetNotation = 'standard',
  showChords = true,
  numberVerses = false,
  chorusIndicator = '',
  lyricsFontSize = 14,
  chordsFontSize = 14,
  headerFontSize = 24,
  subheaderFontSize = 20,
  columns = 1,
  lineSpacing = 1.0
}: { 
  text: string, 
  className?: string,
  transposeSteps?: number,
  targetKey?: string,
  sourceNotation?: Notation,
  targetNotation?: Notation,
  showChords?: boolean,
  numberVerses?: boolean,
  chorusIndicator?: string,
  lyricsFontSize?: number,
  chordsFontSize?: number,
  headerFontSize?: number,
  subheaderFontSize?: number,
  columns?: number,
  lineSpacing?: number
}) {
  const lines = parseChordPro(text);
  
  const blocks: { type: string, lines: any[] }[] = [];
  let currentBlock: any[] = [];
  let inExplicitBlock = false;
  let explicitBlockType = '';

  lines.forEach(line => {
    if (line.type === 'directive') {
      const key = line.content!.split(':')[0].toLowerCase().trim();
      if (['soc', 'start_of_chorus', 'sov', 'start_of_verse', 'sob', 'start_of_bridge'].includes(key)) {
        if (currentBlock.length > 0) {
          blocks.push({ type: 'normal', lines: currentBlock });
          currentBlock = [];
        }
        inExplicitBlock = true;
        explicitBlockType = (key.includes('chorus') || key === 'soc') ? 'chorus' : 'verse';
        return;
      }
      if (['eoc', 'end_of_chorus', 'eov', 'end_of_verse', 'eob', 'end_of_bridge'].includes(key)) {
        if (inExplicitBlock) {
          blocks.push({ type: explicitBlockType, lines: currentBlock });
          currentBlock = [];
          inExplicitBlock = false;
        }
        return;
      }
    }

    if (!inExplicitBlock && line.type === 'empty') {
      if (currentBlock.length > 0) {
        blocks.push({ type: 'normal', lines: currentBlock });
        currentBlock = [];
      }
    } else {
      currentBlock.push(line);
    }
  });
  if (currentBlock.length > 0) {
    blocks.push({ type: inExplicitBlock ? explicitBlockType : 'normal', lines: currentBlock });
  }
  
  const columnClass = columns === 1 ? '' : columns === 2 ? 'md:columns-2 print:columns-2 gap-8' : 'md:columns-3 print:columns-3 gap-8';
  
  let verseCounter = 1;

  return (
    <div className={`font-mono ${columnClass} ${className}`} style={{ fontSize: `${lyricsFontSize}px`, lineHeight: `${1.625 * lineSpacing}` }}>
      {blocks.map((block, bIdx) => {
        const isVerse = block.type === 'verse';
        const currentVerseNumber = isVerse ? verseCounter++ : null;
        const firstContentLineIndex = block.lines.findIndex(l => l.type !== 'empty' && l.type !== 'directive');

        return (
        <div key={bIdx} className={`break-inside-avoid ${(block.type === 'chorus' && !chorusIndicator) ? 'border-l-4 border-primary/40 pl-4 py-1' : ''}`} style={{ marginBottom: `${1.5 * lineSpacing}rem` }}>
          {block.lines.map((line, i) => {
            if (line.type === 'empty') return <div key={i} style={{ height: `${1 * lineSpacing}rem` }} />;
            if (line.type === 'directive') {
              const [key, ...val] = line.content!.split(':');
              const value = val.join(':').trim();
              if (key === 'title' || key === 't') return <h2 key={i} className="font-bold mt-2 mb-2 font-sans break-inside-avoid" style={{ fontSize: `${headerFontSize}px`, lineHeight: 1.2 }}>{value}</h2>;
              if (key === 'subtitle' || key === 'st') return <h3 key={i} className="font-bold mb-2 font-sans break-inside-avoid" style={{ fontSize: `${subheaderFontSize}px`, lineHeight: 1.2 }}>{value}</h3>;
              if (key === 'comment' || key === 'c') return <div key={i} className="font-bold bg-muted px-2 py-1 inline-block rounded mt-2 mb-1 font-sans break-inside-avoid">{value}</div>;
              return <div key={i} className="text-muted-foreground italic break-inside-avoid">[{line.content}]</div>;
            }
            
            const hasChordsInLine = line.parts?.some((part: any) => !!part.chord);
            
            return (
              <div key={i} className="flex flex-wrap items-end break-inside-avoid" style={{ marginBottom: `${0.25 * lineSpacing}rem` }}>
                {isVerse && numberVerses && i === firstContentLineIndex && (
                   <div className="flex flex-col mr-2 font-bold text-muted-foreground">
                      {(showChords && hasChordsInLine) ? <span className="h-5 -mb-1"></span> : null}
                      <span>{currentVerseNumber}.</span>
                   </div>
                )}
                {block.type === 'chorus' && chorusIndicator && i === firstContentLineIndex && (
                   <div className="flex flex-col mr-2 font-bold text-muted-foreground">
                      {(showChords && hasChordsInLine) ? <span className="h-5 -mb-1"></span> : null}
                      <span>{chorusIndicator}</span>
                   </div>
                )}
                {line.parts?.map((part: any, j: number) => {
                  let chord = part.chord;
                  if (chord) {
                    if (transposeSteps !== 0) {
                      chord = transposeChord(chord, transposeSteps, targetKey, sourceNotation, targetNotation);
                    } else if (sourceNotation !== targetNotation) {
                      // Even if no transpose steps, we might need to translate notation
                      chord = transposeChord(chord, 0, targetKey, sourceNotation, targetNotation);
                    }
                  }
                    
                  return (
                    <div key={j} className="flex flex-col">
                      {showChords && chord ? (
                        <span className="text-primary font-bold h-5 -mb-1" style={{ fontSize: `${chordsFontSize}px` }}>{chord}</span>
                      ) : (showChords && hasChordsInLine) ? (
                        <span className="h-5 -mb-1"></span>
                      ) : null}
                      <span className="whitespace-pre">{part.lyric || (showChords && chord ? ' ' : '')}</span>
                    </div>
                  );
                })}
              </div>
            );
          })}
        </div>
        );
      })}
    </div>
  );
}
