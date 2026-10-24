# Spot the Scam

A fast game that trains people to spot fake bank alerts, phishing texts, fake credit alerts and POS tricks.
Players see a message and tap **Real** or **Scam**, then learn why. Works fully offline once opened.

- **Modes:** Classic (10 cards), Daily challenge (8 cards, same for everyone), Endless (3 lives)
- **Progress:** points, streak multiplier (x1.5 / x2 / x3), 7 levels, day streak, personal stats and weak spots
- **Learn:** every answer shows the red flags highlighted, plus a plain-language explanation
- **Tech:** plain HTML, CSS and JavaScript. No build step, no libraries, no internet needed to play.

All bank, telecom and shop names in the game are fictional.

## Files

| File | Job |
|---|---|
| `index.html` | Page shell and all screens |
| `style.css` | Look and feel |
| `data.js` | **All 38 messages**, categories, levels and rules. Add cards here |
| `game.js` | Game logic, scoring, saving, install prompt |
| `sw.js` | Service worker that makes it work offline |
| `manifest.json` + icons | Lets people install it on their home screen |
| `vercel.json` | Makes sure updates to `sw.js` are picked up |

## Run it locally

```
cd spot-the-scam
python -m http.server 8000
```
Open http://localhost:8000 (the service worker works on localhost).

## Deploy to Vercel (2 minutes)

**Option A, no tools:** push this folder to GitHub, go to vercel.com/new, import the repo, click Deploy.
Leave "Framework Preset" as **Other**. No build command, no output directory.

**Option B, CLI:**
```
npm i -g vercel
cd spot-the-scam
vercel --prod
```

Netlify (drag the folder onto app.netlify.com/drop) and GitHub Pages work too.

## How offline works

1. A person opens your link **once with internet**.
2. `sw.js` saves every file in their browser (9 files, under 100 KB).
3. From then on the game opens and plays with no data, even in airplane mode.
4. Scores and progress are saved on their phone with localStorage.

**Test it before the hackathon:** open the live link, reload once, then Chrome DevTools > Application >
Service Workers > tick **Offline**, reload. Or just turn on airplane mode on your phone and reopen it.

**Good to know**
- iPhone Safari can clear saved data if the site is not opened for a few weeks. Adding it to the Home Screen avoids that.
- To ship an update: edit files, change `VERSION` in `sw.js` (for example `v2`), redeploy. People get the new version the next time they open it online.

## Add your own scam cards

Open `data.js`, copy an object in `SCENARIOS`, and edit it. Wrap the clues in `[[double brackets]]`.
They stay plain until the player answers, then light up red (scam) or green (real).

## Demo script (60 seconds)

1. (0:00) "Fake alerts cost Nigerians money every day. This game trains your eyes in two minutes."
2. (0:10) Hand a judge the phone. Tap **Play**. First card: let them answer.
3. (0:25) Show the red flags lighting up and the explanation. "Every answer teaches something."
4. (0:35) Turn on airplane mode, reopen the app. "It works with no data. That matters here."
5. (0:45) Show **Daily challenge** and the streak. "Same cards for everyone, so friends compare scores."
6. (0:55) Close with: "Awareness is the cheapest fraud protection there is."

## Ideas for after the hackathon

- Online leaderboard for the daily challenge (Firebase or a small FastAPI service)
- Pidgin, Yoruba, Igbo and Hausa versions of the cards
- A classroom mode for schools, banks and NGOs, with a shared code and class scoreboard
- New cards sent weekly, based on scams people actually report
