// Parses the AI-generated weekly program text into 7 day blocks.
// Format expected (cf. AI_PROMPTS.weekly_program):
//   Jour X — [Titre]
//   • Mot du jour : [lingala] = [français]
//   • Phrase à dire : [lingala] — [français]
//   • Activité ... : [description]
//   • Conseil parent : [...]

const DAY_RE = /(?:^|\n)\s*Jour\s+(\d+)\s*[—–-]\s*([^\n]+)/gi;

function extractField(block, label) {
  const re = new RegExp(`[•\\-*]\\s*${label}[^\\n:]*[:\\-—–]\\s*([^\\n]+)`, "i");
  const m = block.match(re);
  return m ? m[1].trim() : "";
}

function splitLnFr(s, sep) {
  if (!s) return { ln: "", fr: "" };
  const idx = s.indexOf(sep);
  if (idx === -1) return { ln: s.trim(), fr: "" };
  return { ln: s.slice(0, idx).trim(), fr: s.slice(idx + sep.length).trim() };
}

export function parseWeeklyProgram(content) {
  if (!content || typeof content !== "string") return [];
  const matches = [...content.matchAll(DAY_RE)];
  if (matches.length === 0) return [];
  const days = [];
  for (let i = 0; i < matches.length; i++) {
    const m = matches[i];
    const start = m.index + m[0].length;
    const end = i + 1 < matches.length ? matches[i + 1].index : content.length;
    const block = content.slice(start, end);
    const wordRaw = extractField(block, "Mot du jour");
    const phraseRaw = extractField(block, "Phrase à dire") || extractField(block, "Phrase");
    const activity = extractField(block, "Activité");
    const tip = extractField(block, "Conseil parent") || extractField(block, "Conseil");

    const word = splitLnFr(wordRaw, "=").ln ? splitLnFr(wordRaw, "=") : splitLnFr(wordRaw, "—");
    const phrase = splitLnFr(phraseRaw, "—").ln ? splitLnFr(phraseRaw, "—") : splitLnFr(phraseRaw, "=");

    days.push({
      number: parseInt(m[1], 10),
      title: (m[2] || "").trim(),
      word,
      phrase,
      activity,
      tip,
    });
  }
  return days.slice(0, 7);
}
