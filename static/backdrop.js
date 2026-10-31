// Floating decoration behind the page. The event type picks the theme (colours live in style.css).
import {mk} from "./dom.js";

const SETS = {
  wedding: {icons: ["🌸", "🪷", "🌼", "✨"], motion: "fall"},
  birthday: {icons: ["🎈", "🎉", "🎊", "🎁"], motion: "rise"},
  community: {icons: ["🪁", "🎊", "🪔", "🏮"], motion: "drift"},
  "": {icons: ["✨", "🪔"], motion: "fall"},
};

export function setTheme(root, eventType) {
  const key = eventType in SETS ? eventType : "";
  if (document.body.dataset.event === key && root.childElementCount) return;
  document.body.dataset.event = key;
  const {icons, motion} = SETS[key];
  root.replaceChildren();
  for (let i = 0; i < 14; i++) {
    root.append(mk("span", "bd " + motion, icons[i % icons.length], {
      left: ((i * 37) % 94 + 2) + "%",
      fontSize: (1.3 + (i % 4) * 0.45) + "rem",
      animationDuration: (14 + (i * 3) % 11) + "s",
      animationDelay: "-" + (i * 2.3).toFixed(1) + "s",
    }));
  }
}
