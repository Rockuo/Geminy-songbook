import React from 'react';
import { parseChordPro } from '../lib/chordpro';

export function ChordProViewer({ text, className = '' }: { text: string, className?: string }) {
  const lines = parseChordPro(text);
  
  return (
    <div className={`font-mono text-sm leading-relaxed ${className}`}>
      {lines.map((line, i) => {
        if (line.type === 'empty') return <div key={i} className="h-6" />;
        if (line.type === 'directive') {
          const [key, ...val] = line.content!.split(':');
          const value = val.join(':').trim();
          if (key === 'title' || key === 't') return <h2 key={i} className="text-2xl font-bold mt-6 mb-2 font-sans">{value}</h2>;
          if (key === 'subtitle' || key === 'st') return <h3 key={i} className="text-xl font-semibold mb-2 font-sans">{value}</h3>;
          if (key === 'comment' || key === 'c') return <div key={i} className="font-bold bg-muted px-2 py-1 inline-block rounded mt-4 mb-1 font-sans text-sm">{value}</div>;
          return <div key={i} className="text-muted-foreground italic">[{line.content}]</div>;
        }
        
        return (
          <div key={i} className="flex flex-wrap items-end mb-2">
            {line.parts?.map((part, j) => (
              <div key={j} className="flex flex-col">
                {part.chord ? (
                  <span className="text-primary font-bold text-sm h-5 -mb-1">{part.chord}</span>
                ) : (
                  <span className="h-5 -mb-1"></span>
                )}
                <span className="whitespace-pre text-base">{part.lyric || (part.chord ? ' ' : '')}</span>
              </div>
            ))}
          </div>
        );
      })}
    </div>
  );
}
