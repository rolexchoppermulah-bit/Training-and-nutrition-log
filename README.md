# Lift Log: training & nutrition tracker

A personal, phone-first web app for an Upper/Lower lifting split, zone 2 cardio, calories/protein, and bodyweight on a lean bulk.
No accounts and no servers. Everything you log is saved in your phone's browser.

**Live app (once Pages is turned on):** https://rolexchoppermulah-bit.github.io/Training-and-nutrition-log/

---

## Put it on your phone (one-time setup, about 5 minutes)

GitHub Pages hosts the app for free. A small automated script, called a *workflow* (`.github/workflows/deploy.yml`), rebuilds and publishes it every time the `main` branch changes.

### 1. Merge the code into `main`

The app was built on the branch `claude/ecstatic-davinci-pyj0dv`. Pages publishes from `main`, so merge it:

1. Open the repo on GitHub and click the **Pull requests** tab.
2. Click **New pull request**. Set **base: `main`** and **compare: `claude/ecstatic-davinci-pyj0dv`**.
3. Click **Create pull request**, then **Merge pull request** → **Confirm merge**.

### 2. Turn on GitHub Pages

1. In the repo, click **Settings** (top bar), then **Pages** in the left sidebar.
2. Under **Build and deployment → Source**, choose **GitHub Actions**. There's nothing else to fill in.

### 3. Run the deploy

1. Click the **Actions** tab.
2. Click **Deploy to GitHub Pages** on the left.
   - If a run already shows a green ✓, you're done.
   - If it shows a red ✗ (this happens when the merge came before step 2), click **Run workflow** → **Run workflow**.
3. Wait 1–2 minutes for the green ✓.

### 4. Open it on your phone and add it to your home screen

Open **https://rolexchoppermulah-bit.github.io/Training-and-nutrition-log/** on your phone, then:

- **iPhone (Safari):** tap the **Share** button → **Add to Home Screen** → **Add**.
- **Android (Chrome):** tap **⋮** → **Add to Home screen** (or **Install app**).

Always open the app from the home-screen icon. It opens full screen like a normal app, works offline at the gym once it's been opened online, and the browser is much less likely to clear its data.

> **iPhone note:** the home-screen app keeps its data separately from Safari. If you've already logged things in Safari, open
> **Settings → Export** there, then **Settings → Import** in the home-screen app.

### Updating later

Any change merged into `main` redeploys automatically. Your logged data is not touched by updates.

---

## How to use it

**Home** shows today at a glance: today's workout from your split, calories and protein so far, your latest weight and trend,
and this week's zone 2 minutes. You can log your morning weight and add saved foods straight from here.

**Lift**
- Tap **Start** on a workout. Each exercise shows **Last time** so you know what to beat. The weights are pre-filled.
- For each set, type weight and reps (RPE is optional) and tap **✓**. If you tap ✓ without typing reps, it uses the grey
  placeholder number (your target or last time's reps). Changing the weight on set 1 carries it to the remaining sets.
- **Progressive overload:** if you hit the top of the rep range on every set, the app says *"Go up to X lb"* next time and
  pre-fills the heavier weight.
- **PRs:** a set that beats your heaviest weight or your best estimated 1-rep max turns gold with a 🏆.
- If you close the app mid-workout, it picks up where you left off.
- **Finish** saves the workout and shows a summary with new PRs and where to add weight next time.
- **History** lets you view, edit, or delete past workouts. **PRs** lists your bests; tap one to see its chart.
- Tap the ✏️ on a workout to **edit its exercises**: names, muscle group, sets, rep range, and how much weight to add.

**Cardio**: pick the type, minutes, and optional average heart rate. The bar shows this week's zone 2 minutes against your target.

**Food**: tap **Add food** to log calories and protein (carbs and fat are optional). Tick *Save to My foods* for things you eat
often, and from then on they're one tap. Use **×½ steps** to change servings, and **Edit** under My foods to change or delete
saved foods.

**Weight**: log each morning. The chart shows daily weigh-ins, a 7-day average line, and your 180 lb goal line, plus your
average weekly gain over the last 4 weeks and a goal date at that pace.

**Charts**: estimated 1-rep max over time for any exercise, and weekly sets (or pounds lifted) per muscle group.

**Settings** (⚙️ top right): your calorie, protein, cardio, and weight targets, which days you train (or a simple rotation), and backups.
The default targets (2,800 cal / 160 g protein) are placeholders, so set your own.

---

## Your data & backups

- Data is stored **only in this browser on this device**. Nothing is uploaded anywhere.
- Different browsers and devices don't share data.
- **Back up regularly:** Settings → **Export** downloads a `.json` file with everything. Keep it in iCloud Drive, Google Drive,
  or email it to yourself. Home reminds you if you haven't backed up in 2 weeks.
- **Restore:** Settings → **Import** and pick a backup file. This replaces what's currently in the app.

---

## For tinkering later (optional)

You don't need any of this to use the app. It's here for when you want to change the code on your own computer.

1. Install [Node.js](https://nodejs.org) (version 22 or newer).
2. In a terminal, inside this folder:
   ```bash
   npm install     # download the libraries (first time only)
   npm run dev     # start a local copy at http://localhost:5173
   npm test        # run the automated checks
   npm run build   # make the production version in dist/
   ```

Where things live:

| Folder / file | What's in it |
|---|---|
| `src/pages/` | One file per screen (Dashboard, Lift, WorkoutLogger, Food, Weight, Cardio, Progress, Settings) |
| `src/lib/calc.js` | The math: estimated 1RM, PRs, overload suggestions, moving average, weekly rate, volume |
| `src/lib/defaults.js` | The starting workout templates and default targets |
| `src/lib/storage.js` | Saving to the browser, plus export/import |
| `src/components/charts/` | The charts |
| `src/styles.css` | Colors and layout (dark theme) |

Built with React and Vite. Charts by Recharts, icons by Lucide.
