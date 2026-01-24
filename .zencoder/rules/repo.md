# Repository Guidelines for Zencoder Assistance

## Overview
This document provides a quick reference for the repository structure, coding conventions, and workflow expectations to help Zencoder deliver precise and consistent support.

## Repository Structure Highlights
- **src/**: Main application source code, including hooks, components, contexts, stores, and utilities.
- **functions/**: Firebase Cloud Functions related to realtime call signaling and cleanup.
- **public/**: Static assets and test harness files used for manual verification.
- **docs/** and root-level `CALL_*.md` files: Extensive documentation of the call system architecture, debugging notes, and deployment guides.
- **config/**, **scripts/**, and other root-level files: Deployment configuration, automation scripts, and environment setup resources.

## Key Technologies
- **Next.js / React** with TypeScript for frontend.
- **Zustand** for client-side state management.
- **Firebase** (Realtime Database, Functions) and **LiveKit** for call signaling and media.

## Coding Conventions
- Prefer **TypeScript** typings and strict null checks where applicable.
- Maintain **functional React components** and **custom hooks** patterns.
- Follow existing **Zustand store structure** for shared state.
- Use **async/await** for asynchronous calls and ensure proper error handling.
- Keep code **modular and readable**, with meaningful names and inline comments when logic is non-trivial.

## Testing & Validation
- Align with existing test utilities and manual test pages located in `public/` for call flows.
- Update or create tests only when explicitly requested.
- Run relevant linters or build commands when necessary to validate changes.

## Collaboration Notes
- Apply minimal, targeted changes requested by the user.
- Document important behavior changes in PR descriptions or follow-up notes when applicable.
- Respect user-provided plans; do not re-verify or deviate unless instructed.

## Additional Resources
- Refer to `COMPLETE_CALL_SYSTEM.md`, `GLOBAL_CALL_POPUP_IMPLEMENTATION.md`, and related docs for detailed call system insights.
- Deployment instructions and checklists are available in root-level `*_CHECKLIST.md` files.

Use this guide to stay aligned with repository practices and ensure efficient collaboration.