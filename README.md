# Songbook Editor & Viewer

A full-stack web application for managing, transposing, and printing chord sheets and songbooks. Built with React, Vite, Tailwind CSS, and Firebase.

## Features

- **Song Management**: Create, edit, and store songs using a simplified ChordPro-like format (e.g., `[C]Hello [G]world`).
- **Songbooks**: Group songs into printable songbooks with customizable layouts.
- **Advanced Transposition**: Transpose chords on the fly. Supports both Standard (B, Bb) and German (H, B) chord notations.
- **Print-Ready Layouts**: Pixel-perfect A4 print layouts with multi-column support, intelligent page breaks, and customizable font sizes for lyrics and chords.
- **Real-time Sync**: Powered by Firebase Firestore for real-time updates and secure data storage.
- **Access Control**: Share songbooks with specific groups or make them public.

## Tech Stack

- **Frontend**: React 18, Vite, Tailwind CSS, Lucide React
- **UI Components**: Custom components built on top of `@base-ui/react`
- **Backend**: Firebase (Authentication, Firestore)
- **Routing**: React Router DOM

## Development Setup

1. Install dependencies:
   ```bash
   npm install
   ```

2. Start the development server:
   ```bash
   npm run dev
   ```

3. **Firebase Configuration**:
   Ensure you have a `firebase-applet-config.json` file in the root directory with your Firebase project credentials.

## Documentation for AI Agents

This repository includes specific instructions for various AI coding assistants to help them understand the project's architecture and conventions:

- `.cursorrules`: Instructions for Cursor IDE.
- `.github/copilot-instructions.md`: Instructions for GitHub Copilot.
- `AGENTS.md` / `GEMINI.md`: Instructions for Google AI Studio and Gemini agents.
