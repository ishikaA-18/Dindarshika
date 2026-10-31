// Month calendar: the main event day is filled gold with the event's icon; other event days are
// outlined; a dot marks a pending task due that day. Starts on the main day's month.
import {mk, $} from "./dom.js";
import {t, LOCALE} from "./i18n.js";
import {mainDay, parseDate, toIso, todayIso, daysBetween, EVENT_ICON} from "./plan.js";

let view = null, lastMain = "", last = {plan: null, lang: "en"};

export function shiftMonth(n) {
  if (!view) return;
  const d = new Date(view.y, view.m + n, 1);
  view = {y: d.getFullYear(), m: d.getMonth()};
  draw();
}

export function updateCalendar(plan, lang) {
  last = {plan, lang};
  const main = mainDay(plan)?.date || "";
  if (main && main !== lastMain) {
    const d = parseDate(main);
    view = {y: d.getFullYear(), m: d.getMonth()};
  }
  lastMain = main;
  if (!view) { const n = new Date(); view = {y: n.getFullYear(), m: n.getMonth()}; }
  draw();
}

function draw() {
  const {plan, lang} = last, loc = LOCALE[lang], md = mainDay(plan);
  const fmt = (opts) => new Intl.DateTimeFormat(loc, opts);
  const num = new Intl.NumberFormat(loc);
  const events = new Map(plan.days.filter((d) => d.date).map((d) => [d.date, d]));
  const due = new Map();
  for (const task of plan.tasks) {
    if (task.done || !task.due) continue;
    if (!due.has(task.due)) due.set(task.due, []);
    due.get(task.due).push(task.title);
  }
  const today = todayIso(), first = new Date(view.y, view.m, 1), count = new Date(view.y, view.m + 1, 0).getDate();
  const monthName = fmt({month: "long", year: "numeric"}).format(first);
  $("cal-month").textContent = monthName;
  $("cal").querySelector("caption").textContent = `${t(lang, "calendar")}: ${monthName}`;

  const head = mk("tr");
  for (let i = 0; i < 7; i++) {
    const day = new Date(2023, 0, 1 + i); // 1 Jan 2023 was a Sunday
    const th = mk("th", "", fmt({weekday: "narrow"}).format(day));
    th.scope = "col";
    th.setAttribute("aria-label", fmt({weekday: "long"}).format(day));
    head.append(th);
  }
  $("cal").tHead.replaceChildren(head);

  const body = $("cal").tBodies[0];
  body.replaceChildren();
  let row = mk("tr");
  for (let i = 0; i < first.getDay(); i++) row.append(mk("td", "pad"));
  for (let d = 1; d <= count; d++) {
    const date = new Date(view.y, view.m, d), iso = toIso(date), ev = events.get(iso), isMain = md?.date === iso;
    const td = mk("td", [ev ? "event" : "", isMain ? "main" : "", iso === today ? "today" : "", due.has(iso) ? "due" : ""].filter(Boolean).join(" "));
    td.append(mk("span", "n", num.format(d)));
    if (isMain) td.append(mk("span", "ico", EVENT_ICON[plan.event_type] || "🎉"));
    const spoken = [fmt({dateStyle: "full"}).format(date)];
    if (ev) spoken.push(`${isMain ? t(lang, "mainDay") + ": " : ""}${ev.label}`);
    if (due.has(iso)) spoken.push(due.get(iso).join(", "));
    td.title = spoken.slice(1).join(". ");
    td.setAttribute("aria-label", spoken.join(". "));
    if (iso === today) td.setAttribute("aria-current", "date");
    row.append(td);
    if (date.getDay() === 6 || d === count) { body.append(row); row = mk("tr"); }
  }

  const note = $("cal-note");
  if (md?.date) {
    const n = daysBetween(today, md.date);
    const when = n === 0 ? t(lang, "today") : n > 0 ? t(lang, "daysToGo", {n: num.format(n)}) : "";
    note.textContent = [`${t(lang, "mainDay")}: ${fmt({weekday: "short", day: "numeric", month: "short", year: "numeric"}).format(parseDate(md.date))}`, when].filter(Boolean).join(" · ");
  } else {
    note.textContent = t(lang, "noDate");
  }
}
