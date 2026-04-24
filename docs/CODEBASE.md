# Songbook Editor - Codebase Documentation

This document provides a technical overview of the system architecture, file structure, and technical conventions governing the Songbook Editor application.

**Note to developers:** This file MUST be kept up to date when the architecture is changed, libraries are added, or major internal refactors occur.

## Tech Stack
- **Framework:** React 18
- **Build Tool:** Vite
- **Language:** TypeScript
- **Styling:** Tailwind CSS
- **Headless UI:** `@base-ui/react` (Note: we use the `render` prop extensively in place of `asChild`)
- **Backend & DB:** Firebase Firestore & Firebase Auth

## Directory Structure

```
├── docs/                     # Project documentation (FUNCTIONALITY and CODEBASE)
├── src/
│   ├── components/           # Reusable UI elements (Dropdowns, Dialogs, etc.)
│   │   ├── ui/               # Generic styled wrappers (Tailwind/Base UI abstractions)
│   │   └── ChordProViewer/   # Specifically renders ChordPro strings into musical format
│   ├── lib/                  # Core domain logic
│   │   ├── parsers/          # Extraction logic for importing HTML pages into ChordPro
│   │   │   ├── index.ts      # Main entry point and Parser autodetector
│   │   │   ├── types.ts      # Interfaces `SongParser` and `ParsedSong`
│   │   │   └── pisnickyParser.ts # Specific parser logic for `pisnicky-akordy.cz`
│   │   ├── transpose.ts      # Logic for transposing keys and switching notations
│   │   └── utils.ts          # Generic helpers, class merging (`cn()`)
│   ├── pages/                # App views mapping to routes
│   │   ├── SongEditorPage.tsx  # CRUD UI with drag-and-drop HTML import logic
│   │   ├── SongbookViewPage.tsx # Strictly styled Print-layout engine 
│   │   └── ...                 
│   ├── App.tsx               # Main component holding routes
│   ├── firebase.ts           # Firebase SDK initialization
│   ├── index.css             # Tailwind base imports and any global print media-queries
│   └── main.tsx              # React mounting root
└── package.json              # NPM manifest
```

## Core Domain Logic Details

### 1. Transposition (`src/lib/transpose.ts`)
- Governs how musical notes adjust based on offsets.
- Distinguishes between `standard` (Bb/B) and `german` (B/H).
- The central function, `calculateSteps(baseKey, targetKey, sourceNotation, targetNotation)`, determines relative key shifts regardless of formatting.

### 2. Parsers (`src/lib/parsers/`)
- Handles extracting song contents from 3rd-party websites. 
- Designed with an adapter pattern:
  - Any new website parser is built by extending the `SongParser` interface (`canParse()` and `parse()`).
  - Added to the `PARSERS` array in `parsers/index.ts`.
  - `parseHtmlDrop(html)` acts as a facade: it iterates through available parsers, running the first one where `canParse` returns true.

### 3. Print Layouts 
- Implemented heavily inside `src/pages/SongbookViewPage.tsx`.
- Relies on CSS multicolumn properties tightly coupled to an A4 dimension constraint within `@media print`.

## Firebase Architecture
- Integrates Firestore via standard `@firebase/firestore` functions.
- Every API call must be guarded by a `handleFirestoreError` wrap block to log error definitions in adherence to strict structural principles setup in `firestore.rules`.
- Database schema changes require synchronous updates to both the rules file and `firebase-blueprint.json` to prevent divergence.
