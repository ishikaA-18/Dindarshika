// Tiny DOM helpers. Styles go through the CSSOM (allowed by our CSP), never inline attributes.
export const $ = (id) => document.getElementById(id);

export function mk(tag, cls = "", text, css) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (text != null) e.textContent = text;
  if (css) {
    for (const [k, v] of Object.entries(css)) {
      if (k.startsWith("--")) e.style.setProperty(k, v);
      else e.style[k] = v;
    }
  }
  return e;
}
