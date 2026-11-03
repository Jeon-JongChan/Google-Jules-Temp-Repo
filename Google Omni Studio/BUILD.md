# Google Omni Studio — build note

Snapshot export of the Google AI Studio project "Gemini OmniStudio"
(https://aistudio.google.com/apps/6a377d5b-095e-4aef-8097-ef09f38a6f7f),
exported 2026-11-03. The AI Studio project remains the editing origin;
this folder is a snapshot for local build and test.

No real API key is included. `.env.example` is a template only.

## Web app

Prerequisites: Node.js

1. `npm install`
2. Set `GEMINI_API_KEY` in `.env.local` (see `.env.example`)
3. `npm run dev` (runs `tsx server.ts`)

Other scripts in `package.json`: `npm run build` (`vite build`),
`npm run preview` (`vite preview`), `npm run start` (`node server.ts`).

## Android native shell

`android_native/` is an Android Studio Gradle project
(namespace / applicationId `com.omnistudio.labs`, compileSdk 34,
minSdk 26, targetSdk 34, version 2.0.0).

Open the `android_native/` directory in Android Studio and build/run
from there. `capacitor.config.json` (appId `com.gemini.omnistudio`,
webDir `dist`) is also included from the export.
