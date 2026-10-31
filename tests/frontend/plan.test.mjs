// Run with: node --test   (Node 22+)
import assert from "node:assert/strict";
import test from "node:test";
import {LANGS, t} from "../../static/i18n.js";
import {daysBetween, mainDay, money, openTasks, totals} from "../../static/plan.js";

const task = (over) => ({id: "x", title: "t", category: "venue", due: null, est_cost: 100, actual_cost: null, done: false, ...over});

test("totals use the real price for done tasks and the estimate for open ones", () => {
  const plan = {budget: 1000, tasks: [task({done: true, actual_cost: 80}), task({est_cost: 300})]};
  assert.deepEqual(totals(plan), {spent: 80, pending: 300, planned: 380, remaining: 620});
});

test("mainDay prefers the flagged day, then the wedding's last day, then the first day", () => {
  const days = [{label: "a", date: "2027-07-12"}, {label: "b", date: "2027-07-14"}];
  assert.equal(mainDay({event_type: "wedding", days}).date, "2027-07-14");
  assert.equal(mainDay({event_type: "birthday", days}).date, "2027-07-12");
  assert.equal(mainDay({event_type: "wedding", days: [{...days[0], main: true}, days[1]]}).date, "2027-07-12");
  assert.equal(mainDay({event_type: "wedding", days: []}), undefined);
});

test("daysBetween counts across month ends", () => {
  assert.equal(daysBetween("2026-10-30", "2026-11-02"), 3);
  assert.equal(daysBetween("2026-11-02", "2026-10-30"), -3);
});

test("money uses Indian digit grouping and a real minus sign", () => {
  assert.equal(money(500000), "₹5,00,000");
  assert.equal(money(-5000), "−₹5,000");
});

test("openTasks hides done tasks and sorts by due date with undated last", () => {
  const plan = {tasks: [task({id: "c"}), task({id: "b", due: "2027-02-01"}), task({id: "a", due: "2027-01-01"}), task({id: "d", done: true})]};
  assert.deepEqual(openTasks(plan).map((x) => x.id), ["a", "b", "c"]);
});

test("every language defines every English string", () => {
  const english = ["greeting", "ground", "memo", "calendar", "other", "send", "typeHere", "back", "dueToday", "priceAsk"];
  for (const lang of Object.keys(LANGS)) {
    for (const key of english) assert.notEqual(t(lang, key), key, `${lang} is missing "${key}"`);
  }
});

test("t fills placeholders and falls back to English", () => {
  assert.equal(t("en", "dueSoon", {task: "Book hall", n: 3}), "Book hall is due in 3 days");
  assert.equal(t("xx", "wedding"), "Wedding");
});