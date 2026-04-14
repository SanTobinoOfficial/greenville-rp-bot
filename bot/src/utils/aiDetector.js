// aiDetector.js — Wykrywanie odpowiedzi generowanych przez AI
// Używane w formularzach weryfikacyjnych i podaniach o pracę

/**
 * Sprawdza czy podany tekst prawdopodobnie pochodzi od AI
 * @param {string} text - Tekst do analizy
 * @returns {{ isAI: boolean, score: number, reasons: string[] }}
 */
function detectAI(text) {
  if (!text || text.length < 20) return { isAI: false, score: 0, reasons: [] };

  const reasons = [];
  let score = 0;

  const t = text.toLowerCase().trim();

  // ── Wzorce typowe dla AI ──────────────────────────────────────────────────

  // 1. Formalne nagłówki/struktury AI
  const aiPatterns = [
    /^(oczywiście|z przyjemnością|chętnie|certainly|absolutely|of course)/i,
    /^(na pewno odpowiem|postaram się|spróbuję odpowiedzieć)/i,
    /jako (sztuczna inteligencja|ai|model językowy|asystent)/i,
    /\bpo pierwsze[,\s].*\bpo drugie[,\s]/is,
    /\b(w pierwszej kolejności|następnie|w dalszej kolejności|na zakończenie|podsumowując)\b/i,
    /\b(z pewnością|bez wątpienia|niewątpliwie)\b/i,
    /\bdlatego też\b/i,
    /\bco więcej\b/i,
    /\bmając na uwadze powyższe\b/i,
    /\bwarto zaznaczyć, że\b/i,
    /\bnależy podkreślić\b/i,
    /\bkluczowym aspektem jest\b/i,
    /\bjest to niezwykle ważne\b/i,
    /\bistotnym elementem\b/i,
  ];

  for (const pattern of aiPatterns) {
    if (pattern.test(text)) {
      score += 15;
      reasons.push(`Wykryto wzorzec AI: "${pattern.source.slice(0, 30)}..."`);
    }
  }

  // 2. Zbyt perfekcyjna polszczyzna (brak błędów ortograficznych, skrótów)
  const hasSlang = /\b(lol|xd|haha|ej|hej|no bo|no to|bo ja|nie ma|trochę|niby|jakoś)\b/i.test(t);
  const hasTypos = /[a-zą-ź]{2,}[^a-zą-ź\s][a-zą-ź]{2,}/i.test(t); // coś w środku wyrazu
  const hasContractions = /\b(nie\s+ma|to\s+jest|co\s+do|za\s+to)\b/i.test(t);

  if (!hasSlang && !hasTypos && text.length > 150) {
    score += 10;
    reasons.push('Brak naturalnych elementów językowych (slangu, skrótów, literówek)');
  }

  // 3. Zbyt długa i "okrągła" odpowiedź na proste pytanie
  if (text.length > 600) {
    score += 20;
    reasons.push(`Odpowiedź bardzo długa (${text.length} znaków)`);
  } else if (text.length > 400) {
    score += 10;
    reasons.push(`Odpowiedź długa (${text.length} znaków)`);
  }

  // 4. Wielkie litery na początku każdego zdania (typowe dla AI)
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 5);
  const capitalSentences = sentences.filter(s => /^\s*[A-ZĄĆĘŁŃÓŚŹŻ]/.test(s));
  if (sentences.length >= 3 && capitalSentences.length / sentences.length > 0.9) {
    score += 8;
    reasons.push('Zbyt regularna struktura zdań');
  }

  // 5. Listy numerowane lub bulletpoints (AI-style)
  if (/^\s*\d+[\.\)]\s/m.test(text) && text.match(/^\s*\d+[\.\)]/gm)?.length >= 3) {
    score += 15;
    reasons.push('Wykryto sformatowaną listę numerowaną');
  }

  // 6. Powtarzające się słowa kluczowe (AI lubi powtarzać kontekst)
  const words = t.split(/\s+/).filter(w => w.length > 5);
  const wordCount: Record<string, number> = {};
  for (const w of words) { wordCount[w] = (wordCount[w] || 0) + 1; }
  const repeated = Object.entries(wordCount).filter(([, c]) => c >= 4);
  if (repeated.length >= 2) {
    score += 10;
    reasons.push(`Nadmierne powtórzenia słów: ${repeated.map(([w]) => w).join(', ')}`);
  }

  // 7. Specyficzne angielskie zwroty (copy-paste z AI po angielsku)
  if (/\b(furthermore|moreover|therefore|consequently|in conclusion|in summary|firstly|secondly)\b/i.test(text)) {
    score += 25;
    reasons.push('Wykryto angielskie zwroty typowe dla AI');
  }

  // 8. Sprawdź perplexity-like odpowiedzi (zbyt neutralne, bez emocji)
  const emotionWords = /(kocham|nienawidzę|super|fajnie|ekstra|spoko|mega|świetnie|cieszę się|lubię|chce mi się|marzy mi się)/i;
  if (!emotionWords.test(text) && text.length > 200) {
    score += 5;
    reasons.push('Brak emocjonalnych wyrażeń (neutralny ton AI)');
  }

  // 9. Zbyt formalne słownictwo
  const formalWords = /\b(jednakże|aczkolwiek|niemniej jednak|co więcej|nadto|albowiem|zaiste|przeto)\b/i;
  if (formalWords.test(text)) {
    score += 20;
    reasons.push('Wykryto nadmiernie formalne słownictwo');
  }

  // ── Wynik ────────────────────────────────────────────────────────────────
  const normalizedScore = Math.min(100, score);
  const isAI = normalizedScore >= 40;

  return {
    isAI,
    score: normalizedScore,
    reasons,
    verdict: normalizedScore >= 60 ? 'PEWNE_AI' : normalizedScore >= 40 ? 'PRAWDOPODOBNE_AI' : normalizedScore >= 20 ? 'PODEJRZANE' : 'LUDZKIE',
  };
}

/**
 * Sprawdza WSZYSTKIE pola formularza
 * @param {Object} answers - Obiekt z odpowiedziami { fieldId: text }
 * @returns {{ hasSuspiciousAI: boolean, results: Object[] }}
 */
function analyzeForm(answers) {
  const results = [];
  let hasSuspiciousAI = false;

  for (const [fieldId, text] of Object.entries(answers)) {
    if (!text || typeof text !== 'string') continue;
    const result = detectAI(text);
    results.push({ fieldId, ...result });
    if (result.score >= 40) hasSuspiciousAI = true;
  }

  return { hasSuspiciousAI, results };
}

module.exports = { detectAI, analyzeForm };
