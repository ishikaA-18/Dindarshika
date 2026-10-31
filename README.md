# Dindarshika: AI Celebration & Event Planner

Plan a wedding, birthday or community event by tapping options. No typing. A live **main ground** scene fills up as you finish tasks, a **cash memo** tracks the budget, and a **calendar** highlights the big day.

## Run
```bash
python -m venv .venv
.venv\Scripts\activate          # Mac/Linux: source .venv/bin/activate
pip install -r requirements.txt
copy .env.example .env          # Mac/Linux: cp .env.example .env, then add your Gemini API key
uvicorn main:app --reload       # open http://localhost:8000
pytest                          # backend tests (Gemini is mocked)
```

## What you see
- **Chat (option select):** every question comes with tappable choices, multi-select with Confirm, or a date picker. Tapping a smart tip sends it to the planner.
- **Event themes:** the background colours and floating decorations change with the event (wedding, birthday, community).
- **Main ground:** finishing a category builds that part of the venue. Seating adds tables and chairs sized to your guest count, catering adds a buffet with waiters walking, plus stage, decor garlands, lights, music, photographer, rituals, cake, arriving guests and a bus. Pending categories show as faint markers; the next one to unlock pulses.
- **Cash memo:** one line per task, estimates become PAID stamps with the real price, totals count up or down, a flash shows each change, and a stamp says within or over budget.
- **Calendar:** main event day in gold with the event icon, other ceremony days outlined, red dots for due tasks.
- **Proactive AI:** every reply names the next best move; the server adds overdue and due-this-week alerts; the model suggests ideas you can tap.

## How it works
- The browser sends the tapped answer, the current plan and recent history to `POST /api/chat`.
- Gemini returns JSON: reply, `ask` (what to show next), updated plan, suggestions. The server validates it with Pydantic, recomputes totals and due-date alerts itself, and drops a malformed `ask` instead of failing.
- Everything on screen renders from one `plan` object (`static/app.js` wires `ground.js`, `memo.js`, `calendar.js`, `backdrop.js`).

## Design choices
- **Security:** API key stays server-side; strict input limits; rate limiting; CSP and security headers; UI uses `textContent` and CSSOM styles only (no XSS, no inline styles); model output is schema-validated; user text is treated as data in the prompt.
- **Efficiency:** stateless server, last 12 turns only, one Gemini call per message; scene layers are rebuilt only when their look changes.
- **Accessibility:** labelled controls, `aria-live` chat log, options are real buttons (`aria-pressed` for multi-select), calendar days have full spoken labels, the scene has a text label listing finished tasks, budget state is text not only colour, visible focus, reduced-motion support, `lang` follows the chosen language.
- **Languages:** English, Hindi, Bengali, Tamil, Telugu, Marathi, Gujarati, Kannada.
- **Testing:** pytest covers totals, alerts, validation, error paths, rate limit, headers and JS MIME type.


## Architecture
```
Browser (static/*.js modules)  --POST /api/chat-->  FastAPI (main.py)  -->  Gemini API
   app.js  state + chat                              validate (Pydantic)
   ground.js / memo.js / calendar.js                 recompute totals + alerts
   backdrop.js (themes), i18n.js (8 languages)       rate limit, security headers, gzip
```

## Performance
- One shared Gemini client, a 30 s timeout and a capped output size; "thinking" is off for 2.5 Flash models because planning is structured output.
- The plan is sent as compact JSON (empty fields dropped) and only the last 12 turns are kept.
- Responses are gzipped, module scripts are preloaded, and panels are redrawn only when their data changed.
- The rate limiter purges idle clients so memory stays bounded.

## Checks
```bash
ruff check . && mypy main.py   # lint and types
pytest -q                      # backend tests (27)
node --test                    # frontend logic tests (Node 22+)
```
CI runs all of these on every push (`.github/workflows/ci.yml`).

## Limitations
- Plans live in the browser only; refreshing the page starts over (use Start over for a clean run).
- Free Gemini keys have a small daily request quota; the app shows a clear message when it is used up.
- Task prices are estimates from the model, not live vendor quotes.