# GitHub Copilot Instructions

When generating code for this repository, please adhere to the following guidelines:

## Architecture & Stack
- **Framework**: React 18 with Vite.
- **Language**: TypeScript. Always use strict typing.
- **Styling**: Tailwind CSS.
- **Backend**: Firebase v10 (modular SDK).

## Component Guidelines
- We use `@base-ui/react` for headless components. 
- **CRITICAL**: When using Base UI components (like `PopoverTrigger`, `Button`), use the `render` prop instead of `asChild` to avoid hydration errors and nested DOM elements. Example: `<PopoverTrigger render={<Button />}>`
- Icons are provided by `lucide-react`.

## Domain Logic
- **Chords**: Songs are written in a ChordPro-like format (e.g., `[C]Hello [G]world`).
- **Notation**: Be aware of `standard` vs `german` chord notations. Use the utilities in `src/lib/transpose.ts` for any chord manipulation.
- **Printing**: The `SongbookViewPage` is heavily optimized for A4 printing. Be careful when modifying layout classes (`break-inside-avoid`, `column-count`, etc.).

## Firebase
- Never mutate Firestore documents with fields that are not explicitly allowed in `firestore.rules`.
- Handle Firebase errors gracefully and log them.
