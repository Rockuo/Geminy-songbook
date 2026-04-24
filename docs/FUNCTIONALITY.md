# Songbook Editor - Functionality Documentation

This document describes the core functionality and user-facing features of the Songbook Editor application. 

**Note to developers:** This file MUST be kept up to date when new features are added or existing behaviors are modified.

## Overview
Songbook Editor is a web application designed to help musicians, bands, and worship groups manage their repertoire, transpose chords on-the-fly, and generate beautiful, print-ready songbooks in A4 format.

## Core Features

### 1. Song Management (CRUD)
- **Dashboard:** Users view a collection of their saved songs. 
- **Create & Edit:** A dedicated editor interface allows users to input the title, artist, key, and lyrics of a song.
- **Delete:** Unwanted songs can be permanently deleted.
- **Metadata:** Along with textual content, songs store their base key and the musical notation standard they were drafted in.

### 2. Embedded ChordPro Editor
- Uses a simplified ChordPro format to interlace lyrics and chords. For example, `[C]Hello [G]world`.
- Provides a live, side-by-side preview of how the lyrics and chords will be rendered to the user.
- The `ChordProViewer` renders chords cleanly above the lyric syllables.

### 3. Musical Transposition
- **On-the-fly Shifting:** Users can transpose any song into any other key in real-time. The chords automatically adjust relative to the new target key.
- **Notations:** The app supports two primary notations natively:
  - **Standard Notation:** C, C#, D, D#, E, F, F#, G, G#, A, Bb, B 
  - **German Notation:** C, Cis, D, Dis, E, F, Fis, G, Gis, A, B, H
- Transpositions handle intelligent mappings, flats/sharps detection, and smooth switching between the Standard and German systems.

### 4. Print Layouts & Songbook Compilation
- A specific view exists for compiling songs into a ready-to-print format.
- **Styles:** Uses strictly enforced CSS `@media print` rules, rendering songs smoothly on standard A4 paper.
- **Columns:** Renders text in CSS columns for space efficiency across multiple pages.

### 5. Web Page Import (Drag-and-Drop)
- Rather than manually typing in an entire song, users can import songs directly from supported chord databases.
- **Flow:** 
  1. The user saves an HTML page of a song from a site like `pisnicky-akordy.cz` using `CTRL+S`.
  2. The user drags and drops the HTML file directly into the Song Editor window.
  3. The system auto-detects the source, parses the HTML, extracts the chords, and merges them into the standard ChordPro format.
- Parses and restructures verses, choruses, and instrumental segments accurately into the preview frame automatically.

### 6. Authentication and Cloud Storage
- Backed by Firebase Authentication for user accounts.
- Stores user data, song catalogs, and configurations securely in Cloud Firestore with role-based strict schema security rule validations.
