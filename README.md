# Pomodoro

A minimal, browser-based Pomodoro timer with animated backgrounds and synthesized sounds.

**[Live Demo →](https://l2g4t-c7v6b-x1q9z.github.io/sorvidpomo/)**

---

## Features

- **Circular progress ring** — SVG dial with smooth animation and glow effect
- **Animated break background** — shifting color blobs during break sessions
- **Synthesized audio** — Web Audio API sounds for start, pause, skip, completion, and 5-second countdown; no audio files required
- **Persistent settings** — focus and break durations saved to localStorage
- **Background-safe** — timer continues running when you switch tabs
- **Auto-advance** — sessions switch automatically on completion

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `F` | Toggle fullscreen |
| `Escape` | Exit fullscreen |

## Controls

| Control | Action |
|---------|--------|
| ▶ / ⏸ | Play / Pause |
| ⏭ | Skip to next session |
| ↺ | Reset current session |
| +1 / +5 | Add 1 or 5 minutes |
| 🔊 / 🔇 | Toggle mute |

## Getting Started

```bash
npm install
npm run dev
```

Then open [http://localhost:5173/sorvidpomo/](http://localhost:5173/sorvidpomo/)

## Available Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Build for production |
| `npm run preview` | Preview production build |
| `npm run typecheck` | Run TypeScript type check |
| `npm run lint` | Run ESLint |
| `npm run deploy` | Deploy to GitHub Pages |

## Tech Stack

- [React 19](https://react.dev/) + TypeScript
- [Vite 7](https://vitejs.dev/) — build tool
- [Framer Motion](https://www.framer.com/motion/) — animations
- [Tailwind CSS 4](https://tailwindcss.com/) — utility styles
- Web Audio API — synthesized sound effects

## Project Structure

```
src/
├── audio/
│   └── SoundEngine.ts     # Web Audio API synthesis
├── components/
│   ├── AnimatedTime.tsx   # Digit-by-digit time display
│   ├── BlobField.tsx      # Animated break background
│   ├── Icons.tsx          # SVG icon components
│   └── ModeTag.tsx        # FOCUS / BREAK label
├── hooks/
│   ├── useFullscreen.ts   # Fullscreen toggle
│   ├── useIdle.ts         # Idle cursor hide
│   └── useTimer.ts        # Core timer state & logic
├── types.ts               # Shared TypeScript types
├── App.tsx                # Root component & layout
└── index.css              # Global styles
```
