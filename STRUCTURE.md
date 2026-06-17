# Praxis Project Structure

This app has been migrated from a single monolithic `index.html` to a proper modular structure for better scalability.

## Folder Structure

```
praxis/
├── index.html                 # Main entry point (minimal)
├── package.json
├── vite.config.js
├── tailwind.config.js
├── postcss.config.js
├── src/
│   ├── main.js                # Application entry point
│   ├── styles/
│   │   └── main.css           # Tailwind + custom design tokens
│   ├── core/                  # Core business logic (framework-agnostic)
│   │   ├── auth.js            # Authentication (signup, login, guest)
│   │   ├── state.js           # State management + data operations
│   │   └── storage.js         # localStorage abstraction layer
│   ├── features/              # Feature-specific modules
│   │   ├── projects/
│   │   └── tasks/
│   ├── ui/                    # UI rendering & components
│   │   ├── sidebar.js
│   │   ├── taskList.js
│   │   └── modals.js
│   └── utils/                 # Helper functions
├── public/                    # Static assets
└── index.html.backup          # Original single-file version (backup)
```

## Why this structure?

- **Scalability**: Easy to add new features without touching everything
- **Maintainability**: Clear separation of concerns
- **Future-proof**: Can gradually introduce frameworks (React, Vue, etc.) if needed
- **Backend-ready**: `core/storage.js` and `core/auth.js` can be swapped for real APIs

## Development

```bash
npm run dev        # Start development server
npm run build      # Production build
npm run preview    # Preview production build
```

## Migration Status

- [x] Project scaffolding (Vite + Tailwind)
- [x] Core modules (auth, state, storage)
- [x] Feature modules (projects, tasks)
- [x] Full UI components migration (sidebar, taskList, modals, stats, datePicker)
- [x] Legacy bridge removed (src/app.js gutted)
- [x] index.html cleaned of inline handlers
- [ ] Add automated tests (future)
