
import {$, mk} from "./dom.js";
import {LANGS, LOCALE, t} from "./i18n.js";
import {emptyPlan, money, totals, openTasks, todayIso, parseDate, toIso} from "./plan.js";
import {setTheme} from "./backdrop.js";
import {createGround} from "./ground.js";
import {updateMemo, resetMemo} from "./memo.js";
import {updateCalendar, shiftMonth} from "./calendar.js";

const state = {plan: emptyPlan(), totals: totals(emptyPlan()), history: [], lang: "en", ask: null, suggestions: [], alerts: [], busy: false};
const ground = createGround($("ground"), $("ground-hint"));
const tr = (key, vars) => t(state.lang, key, vars);

function bubble(text, cls) {
  const b = mk("div", "msg " + cls, text);
  $("log").append(b);
  $("log").scrollTop = $("log").scrollHeight;
  return b;
}

// ---- static labels -------------------------------------------------------------------------
function applyLang() {
  document.documentElement.lang = state.lang;
  $("lang-label").textContent = tr("language");
  $("reset").textContent = tr("startOver");
  $("h-tips").textContent = tr("tips");
  $("h-tasks").textContent = tr("tasks");
  $("h-ground").textContent = tr("ground");
  $("h-memo").textContent = tr("memo");
  $("h-cal").textContent = tr("calendar");
  $("cal-prev").setAttribute("aria-label", tr("prev"));
  $("cal-next").setAttribute("aria-label", tr("next"));
  [["k-budget", "budget"], ["k-spent", "spent"], ["k-pending", "pending"], ["k-planned", "planned"], ["k-balance", "balance"]]
    .forEach(([id, key]) => { $(id).textContent = tr(key); });
}

// ---- chat: option-select only --------------------------------------------------------------
const fallbackAsk = () => ({kind: "single", options: [tr("cont")]});

function renderChoices() {
  const box = $("opts");
  box.replaceChildren();
  const ask = state.ask;
  if (!ask) return;
  const pick = (value, shown) => (ask.onPick ? ask.onPick(value, shown) : send(value, shown));
  const lock = state.busy;

  if (ask.kind === "date") {
    const label = mk("label", "", tr("pickDate")), input = mk("input");
    input.type = "date"; input.id = "date-pick"; label.htmlFor = input.id;
    const tomorrow = new Date(); tomorrow.setDate(tomorrow.getDate() + 1);
    input.min = toIso(tomorrow); input.disabled = lock;
    const ok = mk("button", "primary", tr("confirm"));
    ok.type = "button"; ok.disabled = lock;
    ok.addEventListener("click", () => {
      if (!input.value) { input.focus(); return; }
      const nice = new Intl.DateTimeFormat(LOCALE[state.lang], {dateStyle: "long"}).format(parseDate(input.value));
      pick(`${nice} (${input.value})`, nice);
    });
    const wrap = mk("div", "datebox");
    wrap.append(input, ok);
    box.append(label, wrap);
    return;
  }

  if (ask.kind === "multi") {
    const chosen = new Set();
    const ok = mk("button", "primary", tr("confirm"));
    ok.type = "button"; ok.disabled = true;
    ask.options.forEach((o) => {
      const b = mk("button", "opt", o);
      b.type = "button"; b.disabled = lock; b.setAttribute("aria-pressed", "false");
      b.addEventListener("click", () => {
        chosen.has(o) ? chosen.delete(o) : chosen.add(o);
        b.setAttribute("aria-pressed", String(chosen.has(o)));
        ok.disabled = lock || !chosen.size;
      });
      box.append(b);
    });
    ok.addEventListener("click", () => { const v = [...chosen].join(", "); pick(v, v); });
    box.append(ok);
    return;
  }

  ask.options.forEach((o, i) => {
    const b = mk("button", "opt", o);
    b.type = "button"; b.disabled = lock;
    b.addEventListener("click", () => pick(ask.onPick ? i : o, o));
    box.append(b);
  });
}
let typing = false; // true while the "type something else" box is open

function renderAsk() {
  const ask = state.ask;
  if (!ask || ask.onPick) typing = false;
  renderChoices();
  if (!ask || ask.onPick) return; // the price question has fixed answers
  const box = $("opts");
  if (typing) {
    box.replaceChildren();
    const input = mk("input", "free");
    input.type = "text";
    input.maxLength = 300;
    input.placeholder = tr("typeHere");
    input.setAttribute("aria-label", tr("typeHere"));
    input.disabled = state.busy;
    const submit = () => {
      const text = input.value.trim();
      if (!text) return;
      typing = false;
      send(text);
    };
    const go = mk("button", "primary", tr("send"));
    go.type = "button";
    go.disabled = state.busy;
    go.addEventListener("click", submit);
    const back = mk("button", "opt", "← " + tr("back"));
    back.type = "button";
    back.addEventListener("click", () => { typing = false; renderAsk(); });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") submit();
      if (e.key === "Escape") { typing = false; renderAsk(); }
    });
    box.append(input, go, back);
    input.focus();
    return;
  }
  const other = mk("button", "opt other", "✏️ " + tr("other"));
  other.type = "button";
  other.disabled = state.busy;
  other.addEventListener("click", () => { typing = true; renderAsk(); });
  box.append(other);
}

async function send(text, shown = text) {
  if (state.busy) return;
  const previous = state.ask;
  bubble(shown, "me");
  state.ask = null;
  state.busy = true;
  renderAll();
  const wait = bubble("…", "ai typing");
  try {
    const res = await fetch("/api/chat", {method: "POST", headers: {"Content-Type": "application/json"},
      body: JSON.stringify({message: text, plan: state.plan, history: state.history.slice(-12), lang: state.lang})});
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(typeof data.detail === "string" ? data.detail : tr("error"));
    wait.className = "msg ai";
    wait.textContent = data.reply;
    state.history.push({role: "user", text}, {role: "model", text: data.reply});
    Object.assign(state, {plan: data.plan, totals: data.totals, ask: data.ask || fallbackAsk(),
      suggestions: data.suggestions || [], alerts: data.alerts || []});
  } catch (err) {
    wait.className = "msg ai err";
    wait.textContent = err.message || tr("error");
    state.ask = previous || fallbackAsk(); // let the user retry the same question
  } finally {
      state.busy = false;
      renderAll();
      $("log").scrollTop = $("log").scrollHeight;
      if (!document.activeElement || document.activeElement === document.body) { // keep keyboard users in the options
        $("opts").querySelector("button:not(:disabled), input:not(:disabled)")?.focus({preventScroll: true});
    }
  }
}

// ---- finishing a task: ask how the price turned out, then tell the planner ------------------
function startDone(task) {
  if (state.busy) return;
  const est = task.est_cost;
  const choices = [[tr("asPlanned"), est], [tr("saved"), Math.round(est * 0.9)], [tr("extra"), Math.round(est * 1.1)]];
  bubble(tr("priceAsk", {task: task.title}), "ai");
  state.ask = {kind: "single", options: choices.map(([label, amt]) => `${label} · ${money(amt)}`),
    onPick: (i, shown) => {
      const amt = choices[i][1];
      task.done = true;
      task.actual_cost = amt;
      state.totals = totals(state.plan);
      send(`Done: ${task.title} (paid INR ${amt})`, shown);
    }};
  renderAll();
}

// ---- side panels ---------------------------------------------------------------------------
function renderTasks() {
  const list = $("tasks"), fmt = new Intl.DateTimeFormat(LOCALE[state.lang], {day: "numeric", month: "short", year: "numeric"});
  list.replaceChildren();
  const open = openTasks(state.plan), today = todayIso();
  if (!open.length) list.append(mk("li", "empty", tr("empty")));
  open.forEach((task) => {
    const li = mk("li"), box = mk("input"), label = mk("label");
    box.type = "checkbox"; box.id = "task-" + task.id; box.disabled = state.busy; label.htmlFor = box.id;
    box.addEventListener("change", () => startDone(task));
    const late = task.due && task.due < today;
    label.append(task.title, mk("small", late ? "late" : "", [late ? tr("late") : "", task.due && fmt.format(parseDate(task.due)), money(task.est_cost)].filter(Boolean).join(" · ")));
    li.append(box, label);
    list.append(li);
  });
}

function renderTips() {
  const alerts = $("alerts"), tips = $("tips");
  alerts.replaceChildren();
  tips.replaceChildren();
  state.alerts.forEach((a) => {
    const text = a.type === "overdue" ? tr("overdue", {task: a.task}) : a.days === 0 ? tr("dueToday", {task: a.task}) : tr("dueSoon", {task: a.task, n: a.days});
    alerts.append(mk("li", a.type, "⏰ " + text));
  });
  state.suggestions.forEach((s) => {
    const b = mk("button", "tip", s);
    b.type = "button"; b.title = tr("tipHint"); b.disabled = state.busy;
    b.addEventListener("click", () => send(s));
    tips.append(b);
  });
  if (!state.alerts.length && !state.suggestions.length) tips.append(mk("p", "empty", tr("noTips")));
}

let drawn = {scene: "", lists: ""}; // what was last drawn, so unchanged panels are not rebuilt

function renderAll() {
  const {plan} = state;
  const scene = JSON.stringify([plan, state.totals, state.lang]);
  if (scene !== drawn.scene) {
    drawn.scene = scene;
    setTheme($("backdrop"), plan.event_type || "");
    const next = openTasks(plan)[0];
    const done = plan.tasks.filter((x) => x.done).map((x) => x.title);
    $("ground-hint").textContent = tr("groundEmpty");
    ground(plan, next?.category, `${tr("ground")}: ${done.join(", ") || tr("groundEmpty")}`);
    $("next-up").textContent = next ? `${tr("nextUp")}: ${next.title}` : "";
    updateMemo(plan, state.totals, state.lang);
    updateCalendar(plan, state.lang);
  }
  const lists = JSON.stringify([plan, state.lang, state.busy, state.suggestions, state.alerts]);
  if (lists !== drawn.lists) {
    drawn.lists = lists;
    renderTasks();
    renderTips();
  }
  renderAsk();
}

// ---- start / reset -------------------------------------------------------------------------
function greet() {
  $("log").replaceChildren();
  bubble(tr("greeting"), "ai");
  state.ask = {kind: "single", options: [tr("wedding"), tr("birthday"), tr("community")]};
}

function reset() {
  typing=false;
  Object.assign(state, {plan: emptyPlan(), totals: totals(emptyPlan()), history: [], ask: null, suggestions: [], alerts: [], busy: false});
  resetMemo();
  greet();
  renderAll();
}

Object.entries(LANGS).forEach(([code, name]) => $("lang").append(new Option(name, code)));
$("lang").addEventListener("change", (e) => {
  state.lang = e.target.value;
  applyLang();
  if (!state.history.length) greet(); // nothing said yet: restart the greeting in the new language
  renderAll();
});
$("reset").addEventListener("click", reset);
$("cal-prev").addEventListener("click", () => shiftMonth(-1));
$("cal-next").addEventListener("click", () => shiftMonth(1));
applyLang();
greet();
renderAll();
