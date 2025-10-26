# uHabits React Viewer (no backend)

A tiny React app that loads habits from a **local JSON file** and displays them in a Loop Habit Tracker–style grid (read-only).

## Quick start

1. **Unzip** the archive you downloaded. You should get a folder `uhabits-react-viewer/`.
2. Open a terminal in that folder and run:

   ```bash
   npm install
   npm run dev
   ```

3. Open the printed URL (usually `http://localhost:5173`).

## Where to put your JSON

- Put your file at: `public/data/habits.json` (create the `data` folder if missing).
- Then restart `npm run dev` so the file is served.
- Alternatively, click **Open JSON** in the app and choose your file (no restart needed).

An example is included: `public/data/habits.sample.json`. If `public/data/habits.json` is missing, the app will load the sample automatically.

## Expected JSON shape

The app is flexible and accepts several shapes. Internally it normalizes to:

```json
{
  "habits": [
    {
      "id": 1,
      "name": "Drink Water",
      "color": "#3F51B5",
      "archived": false,
      "frequency": { "times": 1, "period": "day" },
      "repetitions": ["2025-08-30", "2025-08-31"]
    }
  ]
}
```

Accepted variants:
- Root array or `{ "habits": [...] }` or `{ "data": { "habits": [...] } }`.
- `repetitions` can be:
  - an array of ISO date strings,
  - or an object map `{ "YYYY-MM-DD": true }`,
  - or an array of objects with a `date` field,
  - or an array of epoch timestamps (seconds or ms).

Only **completed** days are expected in `repetitions`. The heatmap shows the last N days (configurable).

## Scripts

- `npm run dev` — start Vite dev server
- `npm run build` — production build into `dist/`
- `npm run preview` — preview the build

## Notes

- This app is **read-only** and does not save changes (there is no backend).
- Timezone: dates are treated in **local time** and displayed as ISO `YYYY-MM-DD`.
