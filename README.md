# 抽卡活动复盘看板 - Vercel Deploy Version

This folder is the clean Vercel-ready version of the corrected Lucky Draw dashboard.

## What Is Included

- Static dashboard files: `index.html`, `app.js`, `styles.css`
- Corrected CSV data only, under `data/`
- `vercel.json` for static hosting and CSV cache headers
- Local preview server: `preview-server.mjs`

## Preview Locally

```powershell
cd "C:\Users\hhsu\Mega Draw Evaluation\lucky-draw-dashboard-vercel"
node .\preview-server.mjs 4182
```

Open `http://127.0.0.1:4182/`.

## Deploy To Vercel

### Option 1: Vercel Website

1. Zip or upload this folder as the project root.
2. Framework preset: `Other`.
3. Build command: leave blank.
4. Output directory: leave blank / root.
5. Deploy.

### Option 2: CLI

```powershell
cd "C:\Users\hhsu\Mega Draw Evaluation\lucky-draw-dashboard-vercel"
npx vercel
npx vercel --prod
```

After deploy, Vercel will print the shareable URL.
