# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

**English Master Pro** is a standalone English language learning app built as a single static HTML file (`index.html`). It has zero dependencies, no build step, and no server-side logic — open the file directly in a browser to run it.

## Running the App

No build or install step required. Open `index.html` directly in a browser, or serve it with any static file server:

```bash
python3 -m http.server 8080
# then open http://localhost:8080
```

There are no tests, no linter, and no CI configuration.

## Architecture

The entire application lives in `index.html` (~150 lines): HTML structure, CSS styles (inline `<style>`), and JavaScript (inline `<script>`) are all co-located in one file.

**Key globals in the script:**
- `library[]` — hard-coded array of phrase objects `{ cat, en, pt }` covering 4 categories (Greetings, Travel, Daily, Useful)
- `current` — the currently displayed phrase object
- `score` — accumulated XP points
- `audioInitialized` — boolean flag required before Web Speech APIs can activate (browser security policy requires a user gesture first)

**Core Web APIs used:**
- `SpeechSynthesis` — plays the English phrase at 0.8× speed for learner clarity
- `SpeechRecognition` / `webkitSpeechRecognition` — captures user speech and compares against `current.en` with punctuation-stripped, case-insensitive matching

**Flow:** user hears phrase → speaks it → recognition result is compared → if matched, 10 XP awarded and next phrase loads.

## Conventions

- All code stays in `index.html`; do not split into separate `.css` or `.js` files unless refactoring is explicitly requested.
- Theme uses CSS custom properties on `:root`: primary accent `#00f2fe`, background `#0f172a`, card `#1e293b`.
- The app is mobile-first; keep touch targets large and avoid hover-only interactions.
- The phrase library is embedded directly in the script — there is no external data source or API.
