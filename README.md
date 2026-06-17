# Praxis

A beautiful, modern task manager inspired by Greek philosophy — *Praxis* (πρᾶξις) means “action” or “practice.”

## Current Status

The app has been migrated from a single monolithic HTML file to a proper modular project structure using **Vite + Tailwind CSS**.

See [STRUCTURE.md](./STRUCTURE.md) for details about the new architecture.

## Development

```bash
npm install
npm run dev
```

## Features

- Multiple projects with custom colors
- Tasks with priority + due dates
- Smart sorting + drag & drop
- Per-user data isolation (auth module)
- Beautiful glassmorphism design
- Fully offline (localStorage)

## Tech Stack (New)

- Vite
- Tailwind CSS
- Vanilla JavaScript (ES Modules)
- Modular architecture (core / features / ui)

## Original Version

The previous single-file version is preserved at `index.html.backup`.
