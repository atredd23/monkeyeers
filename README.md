# Monkeyeers Match Host

Monkeyeers Match Host is a party game app inspired by Monikers-style play. Players split into teams and try to guess the same set of cards across three rounds, with clue rules getting stricter each round.

## What The Game Is

This app is a host screen for in-person gameplay. It helps you:

- Add and manage players
- Collect card words/topics for the game
- Assign or randomize teams
- Run timed turns with pass limits
- Track team scores by round and total
- Continue games after refresh using local storage

Cards can be typed manually and can also be loaded from [public/cards.txt](public/cards.txt).

## Game Flow

1. Add players.
2. Configure game options (turn time, pass limit).
3. Each player enters 3 cards.
4. Assign teams (or randomize).
5. Play three rounds using the same card set.
6. View final standings.

## Round Rules

### Round 1: Taboo Style

- Use words and sounds.
- No gestures.
- Do not say part of the answer.

### Round 2: One Word

- Give exactly one word as a clue.
- No gestures.

### Round 3: Charades

- No words and no sounds.
- Gesture only.

## Turn Rules

- Each turn is timed.
- You can pass based on the configured pass setting.
- If time expires, the app asks whether the last card should count.
- At manual turn end, the app also asks whether the final card should count.

## Persistence

The app saves:

- Active game state (phase, deck, scores, turn info)
- Player roster (for quick new games)

This is stored in browser local storage, so refresh should resume your game.

## Requirements

- Node.js 20.19+ (or Node.js 22.12+)
- npm

## Getting Started

From the project root, install dependencies:

```bash
npm install
```

Run in development mode:

```bash
npm run dev
```

Open the local URL printed by Vite (typically http://localhost:5173).

## Build For Production

```bash
npm run build
```

Preview production build locally:

```bash
npm run preview
```

## Optional: Custom Card Library

Edit [public/cards.txt](public/cards.txt) and place one card/topic per line.

Example:

```text
Albert Einstein
Jurassic Park
The Great Wall of China
Taylor Swift
Basketball
```

## Scripts

- `npm run dev` - start dev server
- `npm run build` - type-check and create production build
- `npm run preview` - preview production build
- `npm run lint` - run ESLint
