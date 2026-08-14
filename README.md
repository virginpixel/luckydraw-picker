# Lucky Draw Picker

A responsive, generic lucky draw app built with Next.js and React.

## Features

- Create an event with a configurable number of winners
- Paste entries with one entry per line
- Generate an ordered number pool from 1 to 100
- Import entries from CSV using a required number and optional name
- Download a sample CSV
- Roll entries rapidly at random and stop on a candidate
- Confirm winners or remove unavailable entries
- Prevent confirmed and removed entries from returning to the draw
- Preserve the event and draw state in local storage
- Responsive event controls and winner cards

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## CSV format

```csv
number,name
1001,Aisha Khan
1002,Daniel Lee
```

The `name` column is optional. Numbers must be present and unique.

## Deployment

Pushes to `main` automatically enable GitHub Pages, build the static export, and deploy it through GitHub Actions.

The exported site is generated in `out`, which is also compatible with Cloudflare Pages. For Cloudflare, use `npm run build` as the build command and `out` as the output directory.
