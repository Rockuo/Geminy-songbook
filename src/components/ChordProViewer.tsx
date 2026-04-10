import React from 'react';
import { parseChordPro } from '../lib/chordpro';
import { transposeChord } from '../lib/transpose';

export function ChordProViewer({ 
  text, 
  className = '',
  transposeSteps = 0,
  targetKey = 'C',
  showChords = true,
  fontSize = 14,
  headerFontSize = 24,
  subheaderFontSize = 20,
  columns = 1
}: { 
  text: string, 
  className?: string,
  transposeSteps?: number,
  targetKey?: string,
  showChords?: boolean,
  fontSize?: number,
  headerFontSize?: number,
  subheaderFontSize?: number,
  columns?: number
}) {
  const lines = parseChordPro(text);
  
  const columnClass = columns === 1 ? '' : columns === 2 ? 'md:columns-2 print:columns-2 gap-8' : 'md:columns-3 print:columns-3 gap-8';
  
  return (
    <div className={`font-mono leading-relaxed ${columnClass} ${className}`} style={{ fontSize: `${fontSize}px` }}>
      {lines.map((line, i) => {
        if (line.type === 'empty') return <div key={i} className="h-4" />;
        if (line.type === 'directive') {
          const [key, ...val] = line.content!.split(':');
          const value = val.join(':').trim();
          if (key === 'title' || key === 't') return <h2 key={i} className="font-bold mt-6 mb-2 font-sans break-inside-avoid" style={{ fontSize: `${headerFontSize}px`, lineHeight: 1.2 }}>{value}</h2>;
          if (key === 'subtitle' || key === 'st') return <h3 key={i} className="font-semibold mb-2 font-sans break-inside-avoid" style={{ fontSize: `${subheaderFontSize}px`, lineHeight: 1.2 }}>{value}</h3>;
          if (key === 'comment' || key === 'c') return <div key={i} className="font-bold bg-muted px-2 py-1 inline-block rounded mt-4 mb-1 font-sans break-inside-avoid">{value}</div>;
          return <div key={i} className="text-muted-foreground italic break-inside-avoid">[{line.content}]</div>;
        }
        
        return (
          <div key={i} className="flex flex-wrap items-end mb-1 break-inside-avoid">
            {line.parts?.map((part, j) => {
              const chord = part.chord && transposeSteps !== 0 
                ? transposeChord(part.chord, transposeSteps, targetKey) 
                : part.chord;
                
              return (
                <div key={j} className="flex flex-col">
                  {showChords && chord ? (
                    <span className="text-primary font-bold h-5 -mb-1" style={{ fontSize: `${fontSize * 0.9}px` }}>{chord}</span>
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
  );
}
