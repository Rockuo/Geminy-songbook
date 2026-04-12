import React from 'react';
import { parseChordPro } from '../lib/chordpro';
import { transposeChord } from '../lib/transpose';

export function ChordProViewer({ 
  text, 
  className = '',
  transposeSteps = 0,
  targetKey = 'C',
  showChords = true,
  lyricsFontSize = 14,
  chordsFontSize = 14,
  headerFontSize = 24,
  subheaderFontSize = 20,
  columns = 1
}: { 
  text: string, 
  className?: string,
  transposeSteps?: number,
  targetKey?: string,
  showChords?: boolean,
  lyricsFontSize?: number,
  chordsFontSize?: number,
  headerFontSize?: number,
  subheaderFontSize?: number,
  columns?: number
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
  
  return (
    <div className={`font-mono leading-relaxed ${columnClass} ${className}`} style={{ fontSize: `${lyricsFontSize}px` }}>
      {blocks.map((block, bIdx) => (
        <div key={bIdx} className={`break-inside-avoid mb-6 ${block.type === 'chorus' ? 'border-l-4 border-primary/40 pl-4 py-1' : ''}`}>
          {block.lines.map((line, i) => {
            if (line.type === 'empty') return <div key={i} className="h-4" />;
            if (line.type === 'directive') {
              const [key, ...val] = line.content!.split(':');
              const value = val.join(':').trim();
              if (key === 'title' || key === 't') return <h2 key={i} className="font-bold mt-2 mb-2 font-sans break-inside-avoid" style={{ fontSize: `${headerFontSize}px`, lineHeight: 1.2 }}>{value}</h2>;
              if (key === 'subtitle' || key === 'st') return <h3 key={i} className="font-semibold mb-2 font-sans break-inside-avoid" style={{ fontSize: `${subheaderFontSize}px`, lineHeight: 1.2 }}>{value}</h3>;
              if (key === 'comment' || key === 'c') return <div key={i} className="font-bold bg-muted px-2 py-1 inline-block rounded mt-2 mb-1 font-sans break-inside-avoid">{value}</div>;
              return <div key={i} className="text-muted-foreground italic break-inside-avoid">[{line.content}]</div>;
            }
            
            return (
              <div key={i} className="flex flex-wrap items-end mb-1 break-inside-avoid">
                {line.parts?.map((part: any, j: number) => {
                  const chord = part.chord && transposeSteps !== 0 
                    ? transposeChord(part.chord, transposeSteps, targetKey) 
                    : part.chord;
                    
                  return (
                    <div key={j} className="flex flex-col">
                      {showChords && chord ? (
                        <span className="text-primary font-bold h-5 -mb-1" style={{ fontSize: `${chordsFontSize}px` }}>{chord}</span>
                      ) : showChords ? (
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
      ))}
    </div>
  );
}
