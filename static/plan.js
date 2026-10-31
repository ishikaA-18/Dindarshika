// Pure plan helpers shared by every widget. Mirrors totals() in main.py for instant UI feedback.
export const CAT_ICON = {venue: "🏛️", seating: "🪑", catering: "🍲", decor: "🌸", music: "🎶", photo: "📸",
  ritual: "🪔", cake: "🎂", lighting: "💡", invites: "💌", transport: "🚌", stage: "🎤"};
export const EVENT_ICON = {wedding: "💍", birthday: "🎈", community: "🏘️"};

export const emptyPlan = () => ({event_type: null, name: "", budget: 0, guests: 0, days: [], tasks: []});

export const money = (n) => (n < 0 ? "−" : "") + "₹" + new Intl.NumberFormat("en-IN").format(Math.abs(n));

export function totals(plan) {
  const cost = (t) => t.actual_cost ?? t.est_cost;
  const spent = plan.tasks.filter((t) => t.done).reduce((s, t) => s + cost(t), 0);
  const pending = plan.tasks.filter((t) => !t.done).reduce((s, t) => s + t.est_cost, 0);
  return {spent, pending, planned: spent + pending, remaining: plan.budget - spent - pending};
}

export const parseDate = (iso) => { const [y, m, d] = iso.split("-").map(Number); return new Date(y, m - 1, d); };
export const toIso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
export const todayIso = () => toIso(new Date());
export const daysBetween = (a, b) => Math.round((parseDate(b) - parseDate(a)) / 86400000);

/** The day to highlight: the one the model flagged, else the wedding's last day or the first day. */
export function mainDay(plan) {
  const dated = plan.days.filter((d) => d.date);
  return dated.find((d) => d.main) || (plan.event_type === "wedding" ? dated[dated.length - 1] : dated[0]);
}

export const openTasks = (plan) =>
  plan.tasks.filter((t) => !t.done).sort((a, b) => (a.due || "9").localeCompare(b.due || "9"));
