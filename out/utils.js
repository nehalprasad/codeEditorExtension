"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.splitSentences = void 0;
function splitSentences(text) {
    return text
        .replace(/([.?!])\s+(?=[A-Z])/g, '$1|') // Break at sentence-ending punctuation
        .split('|')
        .map(s => s.trim())
        .filter(Boolean);
}
exports.splitSentences = splitSentences;
//# sourceMappingURL=utils.js.map