# Lucky Draw Picker

A responsive bib lucky draw app built with Next.js and React.

## Features

- Create an event with a configurable number of winners
- Import entrants from CSV using a required bib number and optional name
- Download a sample CSV
- Roll bib numbers rapidly and stop on a candidate
- Confirm winners or remove absent entrants
- Prevent confirmed and absent bibs from returning to the draw
- Responsive event controls and winner cards

## Local development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

## CSV format

```csv
bib number,name
1001,Aisha Khan
1002,Daniel Lee
```

The `name` column is optional. Bib numbers must be present and unique.

## Deployment

Pushes to `main` automatically enable GitHub Pages, build the static export, and deploy it through GitHub Actions.

The exported site is generated in `out`, which is also compatible with Cloudflare Pages. For Cloudflare, use `npm run build` as the build command and `out` as the output directory.
