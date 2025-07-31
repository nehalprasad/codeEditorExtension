export function splitSentences(text: string): string[] {
  return text
    .replace(/([.?!])\s+(?=[A-Z])/g, '$1|') // Break at sentence-ending punctuation
    .split('|')
    .map(s => s.trim())
    .filter(Boolean);
}
