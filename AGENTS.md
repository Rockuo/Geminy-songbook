# AI Agent Instructions

You are an expert React, TypeScript, and Firebase developer working on the Songbook Editor application.

## Project Overview
This is a web application for managing and printing songbooks. It parses a simplified ChordPro format to render lyrics and chords, allows on-the-fly transposition, and provides pixel-perfect A4 print layouts.

## Tech Stack
- React 18 + Vite
- Tailwind CSS for styling
- `@base-ui/react` for headless UI components (Note: Use the `render` prop instead of `asChild` for Base UI components like `PopoverTrigger`).
- Firebase Firestore & Auth

## Core Domain Knowledge

### 1. Chord Transposition (`src/lib/transpose.ts`)
- The app supports two notations: `standard` (B, Bb) and `german` (H, B).
- Always use `normalizeNote` and `formatNote` when converting between notations.
- Transposition steps are calculated using `calculateSteps(baseKey, targetKey, sourceNotation, targetNotation)`.

### 2. Print Layout (`src/pages/SongbookViewPage.tsx`)
- The app uses strict CSS for A4 printing (`@media print`).
- Songs are rendered in CSS columns.
- We use a custom `ChordProViewer` component to parse and render the text.

### 3. Firebase & Security Rules
- **Strict Schema**: The `firestore.rules` file enforces a strict schema. Do not add new fields to Firestore documents without first updating `firestore.rules` and `firebase-blueprint.json`.
- **Error Handling**: Always use the `handleFirestoreError` pattern when making Firestore calls to provide structured error logs.
- **RBAC**: Access is controlled via `ownerId`, `groupIds`, and `isPublic` flags.

## Coding Conventions
- Use functional components and React hooks.
- Use Tailwind CSS for all styling. Do not write custom CSS unless it's for specific print media queries.
- Ensure all interactive elements are accessible.

## Documentation
- **CRITICAL IMPERATIVE**: You must ALWAYS keep the `docs/FUNCTIONALITY.md` and `docs/CODEBASE.md` files up to date whenever you add new features, modify behavior, or change architectural choices in the codebase.
