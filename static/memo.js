// Budget as a cash-memo slip: one line per task, totals that count up or down, a PAID/stamp.
import {mk, $} from "./dom.js";
import {money, CAT_ICON} from "./plan.js";
import {t, LOCALE} from "./i18n.js";

const lines = new Map();      // task id -> <li>
const tokens = new WeakMap(); // element -> running tween token
let prevPlanned = null;
const reduceMotion = () => typeof matchMedia === "function" && matchMedia("(prefers-reduced-motion: reduce)").matches;

function tween(el, to) {
  const from = Number(el.dataset.v ?? to);
  el.dataset.v = to;
  if (from === to || reduceMotion() || typeof requestAnimationFrame !== "function") { el.textContent = money(to); return; }
  const token = {}, t0 = performance.now();
  tokens.set(el, token);
  const step = (now) => {
    if (tokens.get(el) !== token) return;
    const k = Math.min(1, (now - t0) / 600);
    el.textContent = money(Math.round(from + (to - from) * (1 - (1 - k) ** 3)));
    if (k < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
}

function fillLine(li, task, lang) {
  const actual = task.actual_cost ?? task.est_cost;
  const amount = mk("span", "am");
  if (task.done) {
    if (actual !== task.est_cost) amount.append(mk("s", "", money(task.est_cost)), " ");
    amount.append(mk("b", "", money(actual)), mk("em", "pd", t(lang, "paid")));
  } else {
    amount.append(mk("span", "", money(task.est_cost)), mk("em", "est", t(lang, "est")));
  }
  li.classList.toggle("paid", task.done);
  li.replaceChildren(mk("span", "ic", CAT_ICON[task.category] || "✨"), mk("span", "nm", task.title), amount);
}

export function resetMemo() { lines.clear(); prevPlanned = null; $("memo-lines").replaceChildren(); }

export function updateMemo(plan, totals, lang) {
  $("memo-name").textContent = plan.name;
  $("memo-date").textContent = new Intl.DateTimeFormat(LOCALE[lang], {day: "numeric", month: "short", year: "numeric"}).format(new Date());
  const list = $("memo-lines"), seen = new Set(plan.tasks.map((x) => x.id));
  for (const [id, li] of lines) if (!seen.has(id)) { li.remove(); lines.delete(id); }
  plan.tasks.forEach((task, i) => {
    let li = lines.get(task.id);
    const sig = [task.title, task.est_cost, task.actual_cost, task.done, lang].join("|");
    if (!li) {
      li = mk("li", "line enter");
      li.addEventListener("animationend", () => li.classList.remove("enter"));
      lines.set(task.id, li);
    }
    if (li.dataset.sig !== sig) { li.dataset.sig = sig; fillLine(li, task, lang); }
    if (list.children[i] !== li) list.insertBefore(li, list.children[i] || null);
  });

  tween($("v-budget"), plan.budget);
  tween($("v-spent"), totals.spent);
  tween($("v-pending"), totals.pending);
  tween($("v-planned"), totals.planned);
  tween($("v-balance"), totals.remaining);
  $("v-balance").classList.toggle("neg", totals.remaining < 0);

  const delta = $("delta");
  if (prevPlanned !== null && totals.planned !== prevPlanned) {
    const d = totals.planned - prevPlanned;
    delta.textContent = `${d > 0 ? "▲" : "▼"} ${money(Math.abs(d))}`;
    delta.className = d > 0 ? "up" : "down";
    void delta.offsetWidth; // restart the flash animation
    delta.classList.add("flash");
    $("memo-live").textContent = `${t(lang, "planned")}: ${money(totals.planned)} (${delta.textContent})`;
  }
  prevPlanned = totals.planned;

  const stamp = $("memo-stamp"), over = totals.remaining < 0;
  stamp.hidden = !plan.budget || !plan.tasks.length;
  stamp.textContent = t(lang, over ? "over" : "within");
  stamp.className = "stamp " + (over ? "bad" : "good");
}
