// The "main ground": a small animated venue. Each task category, once ALL its tasks are done,
// builds a layer of the scene (tables and chairs, buffet and waiters, lights...). Coordinates are in
// cqw (1% of the ground's width) so the scene scales with its container. Looks live in style.css.
import {mk} from "./dom.js";
import {CAT_ICON} from "./plan.js";

const CATS = ["venue", "stage", "decor", "lighting", "seating", "catering", "music", "photo", "ritual", "cake", "invites", "transport"];
// Where the faint "coming soon" marker of a not-yet-done category sits.
const GHOST = {venue: [50, 8.5], stage: [50, 19], decor: [20, 4], lighting: [80, 4], seating: [62, 45], catering: [7, 45],
  music: [84, 19], photo: [30, 53], ritual: [17, 20], cake: [50, 30], invites: [50, 57], transport: [90, 57]};

const cq = (n) => n + "cqw";
const layer = (cat) => mk("div", "layer " + cat);
const item = (cls, text, x, y, css = {}) => mk("span", "it " + cls, text, {left: cq(x), top: cq(y), ...css});

export const tableCount = (guests) => Math.min(12, Math.max(4, Math.ceil((guests || 48) / 8)));

// One walking character: walker moves along x, bobber bounces, face flips at each turn-around.
function walker(emoji, y, x0, dist, secs, delay, cls = "") {
  const w = mk("span", "walker " + cls, null, {left: cq(x0), top: cq(y), "--d": cq(dist), "--t": secs + "s", "--dl": delay + "s"});
  const b = mk("span", "bobber");
  b.append(mk("span", "face", emoji));
  w.append(b);
  return w;
}

const BUILD = {
  venue(plan) {
    const l = layer("venue");
    const icon = plan.event_type === "wedding" ? "💍" : plan.event_type === "birthday" ? "🎈" : "🎉";
    const ribbon = mk("div", "ribbon", `${icon} ${plan.name || ""}`.trim());
    ribbon.title = plan.name || "";
    l.append(mk("div", "pillar l"), mk("div", "pillar r"), ribbon);
    return l;
  },

  stage(plan) {
    const l = layer("stage");
    const stage = mk("div", "stage");
    stage.append(mk("div", "curtain l"), mk("div", "curtain r"));
    l.append(stage);
    const cast = {wedding: ["👰", "🤵"], birthday: ["🥳", "🎁"], community: ["🎤", "🧑‍💼"]}[plan.event_type] || ["🎤", "🎭"];
    cast.forEach((c, i) => l.append(item("sway", c, 44.5 + i * 7, 14.4, {"--fs": "5.2cqw", animationDelay: i * 0.4 + "s"})));
    return l;
  },

  decor() {
    const l = layer("decor");
    for (let i = 0; i < 13; i++) {
      const strand = mk("span", "strand", null, {left: cq(4 + i * 7.4), animationDelay: (i * 0.17) + "s", "--len": cq(3 + (i % 3) * 1.6)});
      strand.append(mk("i", "thread"), mk("b", "bloom", i % 2 ? "🌼" : "🌸"));
      l.append(strand);
    }
    l.append(item("sway", "🪴", 4, 20.5, {"--fs": "4cqw"}), item("sway", "🪴", 93, 20.5, {"--fs": "4cqw", animationDelay: ".5s"}));
    return l;
  },

  lighting() {
    const l = layer("lighting");
    l.append(mk("div", "glow"));
    const colours = ["#ffd43b", "#ff6b6b", "#69db7c", "#74c0fc", "#f783ac"];
    for (let i = 0; i < 18; i++) {
      l.append(mk("i", "bulb", null, {left: cq(2 + i * 5.45), top: cq(0.4 + 1.6 * Math.sin(Math.PI * ((i % 6) / 5))),
        animationDelay: (i % 3) * 0.45 + "s", "--c": colours[i % colours.length]}));
    }
    return l;
  },

  seating(plan) {
    const n = tableCount(plan.guests), cols = n <= 8 ? 4 : 6, rows = Math.ceil(n / cols);
    const l = layer("seating");
    let k = 0;
    for (let r = 0; r < rows; r++) {
      const inRow = Math.min(cols, n - r * cols);
      for (let c = 0; c < inRow; c++, k++) {
        const table = mk("div", "tbl", null, {left: cq(30 + 64 * (c + 0.5) / inRow), top: cq((rows === 1 ? 46 : 41) + r * 11), animationDelay: (k * 0.07) + "s"});
        for (let a = 0; a < 6; a++) {
          const deg = a * 60;
          table.append(mk("span", "chair", "🪑", {transform: `translate(-50%,-50%) rotate(${deg}deg) translateY(-3.7cqw) rotate(${-deg}deg)`}));
        }
        l.append(table);
      }
    }
    return l;
  },

  catering() {
    const l = layer("catering");
    l.append(mk("div", "buffet"));
    ["🍛", "🥘", "🍲", "🍚", "🥗", "🍮"].forEach((f, i) => l.append(item("", f, 4.4, 31 + i * 4.2, {"--fs": "3.4cqw"})));
    [0, 1].forEach((i) => l.append(item("steam", "💨", 3 + i * 4.5, 28.5, {"--fs": "2.6cqw", animationDelay: i * 0.9 + "s"})));
    l.append(item("sway", "🧑‍🍳", 0.8, 26.5, {"--fs": "4.6cqw"}));
    l.append(walker("🤵", 35, 13, 70, 9, 0, "waiter"), walker("🤵", 46, 13, 72, 11, -3, "waiter"), walker("🤵", 54, 13, 68, 8, -5, "waiter"));
    return l;
  },

  music() {
    const l = layer("music");
    l.append(item("pulse", "🔊", 71, 13, {"--fs": "4.4cqw"}), item("pulse", "🔊", 92, 13, {"--fs": "4.4cqw", animationDelay: ".25s"}),
      item("sway", "🧑‍🎤", 81.5, 15.5, {"--fs": "5cqw"}), item("sway", "🥁", 87, 19, {"--fs": "3.4cqw", animationDelay: ".3s"}));
    ["🎵", "🎶", "🎵", "🎶"].forEach((n, i) => l.append(item("note", n, 74 + i * 5, 12, {"--fs": "2.6cqw", animationDelay: i * 0.8 + "s", "--dx": (i % 2 ? 3 : -3) + "cqw"})));
    return l;
  },

  photo() {
    const l = layer("photo");
    const shooter = mk("span", "it shooter", "📸", {"--fs": "4cqw"});
    shooter.append(mk("i", "burst", "✨"));
    l.append(shooter);
    return l;
  },

  ritual() {
    const l = layer("ritual");
    l.append(mk("div", "kund"), item("flame", "🔥", 14.4, 17.4, {"--fs": "4cqw"}), item("sway", "🏺", 7.5, 18.5, {"--fs": "3.6cqw"}),
      item("sway", "🧘", 19.5, 15.5, {"--fs": "5cqw", animationDelay: ".6s"}));
    for (let i = 0; i < 7; i++) l.append(item("flame", "🪔", 36.5 + i * 4.3, 26.6, {"--fs": "2.6cqw", animationDelay: (i % 3) * 0.3 + "s"}));
    return l;
  },

  cake() {
    const l = layer("cake");
    l.append(mk("div", "cake-table"), item("", "🎂", 47.3, 26.2, {"--fs": "5.5cqw"}),
      item("twinkle", "✨", 44.6, 27, {"--fs": "2.4cqw"}), item("twinkle", "✨", 54.6, 26.4, {"--fs": "2.4cqw", animationDelay: ".6s"}));
    return l;
  },

  invites() {
    const l = layer("invites");
    l.append(mk("div", "gate"), item("sway", "💌", 48.4, 51.2, {"--fs": "3cqw"}));
    ["👨‍👩‍👧", "👩", "🧓", "🧑", "👴", "👵", "👨‍👩‍👦", "🧒"].forEach((g, i) =>
      l.append(item("arrive", g, 46 + (i % 4) * 2.6, 55.5, {"--fs": "3.6cqw", "--dx": ((i % 5) - 2) * 9 + "cqw", "--dy": -(14 + (i % 3) * 4) + "cqw", animationDelay: i * 1.1 + "s"})));
    return l;
  },

  transport() {
    const l = layer("transport");
    l.append(item("bus", "🚌", 0, 57, {"--fs": "5.2cqw"}), item("bus", "🚐", 0, 57.4, {"--fs": "4.6cqw", animationDelay: "-9s"}));
    return l;
  },
};

// Rebuild a layer only when something that changes its look changes (keeps animations from restarting).
const KEY = {venue: (p) => `${p.event_type}|${p.name}`, stage: (p) => p.event_type, seating: (p) => tableCount(p.guests)};

export function createGround(root, hint) {
  const live = new Map(), ghosts = new Map();
  return function update(plan, nextCat, label) {
    const byCat = new Map();
    for (const task of plan.tasks) {
      if (!byCat.has(task.category)) byCat.set(task.category, []);
      byCat.get(task.category).push(task);
    }
    for (const cat of CATS) {
      const group = byCat.get(cat), done = !!group && group.every((x) => x.done);
      const key = String(KEY[cat]?.(plan) ?? ""), cur = live.get(cat);
      if (done && (!cur || cur.key !== key)) {
        cur?.el.remove();
        const el = BUILD[cat](plan);
        root.append(el);
        live.set(cat, {el, key});
      } else if (!done && cur) {
        cur.el.remove();
        live.delete(cat);
      }
      let ghost = ghosts.get(cat);
      if (group && !done) {
        if (!ghost) {
          ghost = mk("span", "ghost", CAT_ICON[cat], {left: cq(GHOST[cat][0]), top: cq(GHOST[cat][1])});
          ghost.setAttribute("aria-hidden", "true");
          root.append(ghost);
          ghosts.set(cat, ghost);
        }
        ghost.title = group[0].title;
        ghost.classList.toggle("next", cat === nextCat);
      } else if (ghost) {
        ghost.remove();
        ghosts.delete(cat);
      }
    }
    hint.hidden = live.size > 0;
    root.setAttribute("aria-label", label);
  };
}
