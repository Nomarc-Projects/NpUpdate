import "server-only";

import { HELM_CORPUS } from "@/lib/data/helm-corpus";
import { GUIDE_KNOWLEDGE } from "@/lib/data/guide-knowledge";
import type { HelmCitation } from "./client";

/**
 * Lexical retrieval for the VM-less (`local`) Helm backend.
 *
 * The VM retrieves with pgvector (dense) fused with a lexical retriever by RRF
 * (retrieval.py). Without the store there are no embeddings, so this is lexical
 * only: BM25 over the in-repo corpora. That is a genuine downgrade in recall —
 * it matches words, not meaning — so the score threshold below is deliberately
 * conservative: a question with no real term overlap must return nothing, so
 * `grounded` stays false and the assistant says it has no sources rather than
 * citing an unrelated chunk.
 *
 * What is grounded differs by surface, and the difference is honest:
 *   - Guide       → the public platform corpus (HELM_CORPUS + GUIDE_KNOWLEDGE).
 *   - Consultant → HELM_CORPUS only. The VM also scopes a consultant turn to the
 *                  caller's own and project's namespaces (their uploaded
 *                  documents); those need the VM's store, so locally they simply
 *                  don't exist and the reply is corpus-grounded at best.
 */

/** One retrievable passage, in the shape the assistant needs to cite it. */
export type LocalChunk = {
  sourceRef: string;
  title: string;
  section: string;
  body: string;
  /** The Python store's namespaces are corpus / user / project. Only "corpus"
   *  is reachable without the VM. */
  namespace: "corpus";
};

export type LocalRetrieved = LocalChunk & { score: number };

/** Matches store.py's KnowledgeChunk.citation so citation strings are identical
 *  whichever backend answered. */
export function citationLabel(c: LocalChunk): string {
  return c.section ? `${c.title} — ${c.section}` : c.title;
}

/* ── the searchable corpora ─────────────────────────────────────────────── */

/** Professional domain knowledge. Consultant + Guide. */
const CORPUS_CHUNKS: LocalChunk[] = HELM_CORPUS.map((c) => ({
  sourceRef: c.sourceRef,
  title: c.title,
  section: c.section,
  body: c.body,
  namespace: "corpus",
}));

/** Public platform copy written in the app for exactly this purpose
 *  (lib/data/guide-knowledge.ts). Guide only — it is pricing/plans/onboarding
 *  copy, not professional guidance. */
const GUIDE_CHUNKS: LocalChunk[] = GUIDE_KNOWLEDGE.map((e) => ({
  sourceRef: e.id,
  title: e.title,
  section: e.category,
  body: e.body,
  namespace: "corpus",
}));

export type LocalSource = "corpus" | "guide" | "all";

/** Common English function words — articles, pronouns, auxiliaries, prepositions
 *  and light verbs/adverbs.
 *
 *  This list is load-bearing, not housekeeping. The corpora are small (57
 *  chunks), so BM25 gives a word that happens to be rare *in the corpus* a high
 *  IDF even when it is meaningless in the query. With a short stoplist, "wire up
 *  a Kubernetes cluster" scored 2.91 by matching the corpus's "wire" and "up",
 *  and "I need help with my account" scored 4.31 on "need" — both above genuine
 *  domain questions, so no score threshold could separate them. Dropping
 *  function words leaves only content terms, which is what actually indicates
 *  the chunk is about the question.
 *
 *  Deliberately NOT included: construction vocabulary. "task", "account",
 *  "cluster"-free terms and the like are real signal in this domain even when
 *  they are also ordinary English. */
const STOPWORDS = new Set([
  "a", "about", "above", "after", "again", "against", "all", "also", "am", "an", "and", "any", "anyone",
  "anything", "are", "as", "at", "be", "because", "been", "before", "being", "below", "between", "both",
  "but", "buy", "by",
  "can", "cannot", "could", "did", "do", "does", "doing", "done", "down", "during",
  "each", "either", "everyone", "everything", "few", "fix", "for", "from", "further", "get", "give", "go",
  "going", "got",
  "had", "has", "have", "having", "he", "her", "here", "hers", "him", "his", "how", "i", "if",
  "in", "into", "is", "it", "its", "just", "let", "like", "look", "made", "make", "many", "me",
  "might", "mine", "more", "most", "much", "must", "my", "need", "never", "new", "no", "nor",
  "not", "now", "of", "off", "on", "once", "one", "only", "or", "other", "others", "our", "out",
  "over", "own", "put", "quite", "rather", "same", "say", "see", "set", "she", "should", "since",
  "so", "some", "someone", "something", "still", "such", "take", "than", "that", "the", "their",
  "them", "then", "there", "these", "they", "thing", "things", "this", "those", "through", "to",
  "too", "up", "us",
  "use", "used", "using", "very", "want", "was", "we", "well", "were", "what", "when", "where",
  "which", "while", "who", "whom", "whose", "why", "will", "with", "within", "would", "you",
  "your", "yours",
]);

/**
 * Deliberately conservative suffix stripping — just enough to close the gap
 * between a question and the corpus, without a full stemmer's precision cost.
 *
 *  plural  -ies → y  (companies → company)
 *           -es   (matches → match, boxes → box)
 *           -s    (tasks → task, tenders → tender), but never -ss (class → class)
 *  gerund  -ing  (tendering → tender, building → build)
 *  past    -ed   (registered → register)
 *
 *  Stripping -ing/-ed can expose a doubled consonant left by the suffix itself,
 *  so the result is de-doubled (planning → plann → plan). Without that step
 *  "plan" and "planning" never meet, and a question about a plan would miss the
 *  pricing chunk entirely.
 *
 *  Known imprecision, accepted: "curing" → "cur" won't meet "cure". A real
 *  stemmer would need a dictionary, and lexical retrieval is already a downgrade
 *  from the VM's embeddings — the point here is to stop *misses* like "task" vs
 *  "tasks", not to be linguistically correct.
 */
function stem(word: string): string {
  if (word.length <= 3) return word;
  let out = word;
  if (out.endsWith("ies") && out.length > 4) out = `${out.slice(0, -3)}y`;
  else if (/(sses|shes|ches|xes|zes)$/.test(out)) out = out.slice(0, -2);
  else if (out.endsWith("s") && !out.endsWith("ss")) out = out.slice(0, -1);
  else if (out.endsWith("ing") && out.length > 5) out = out.slice(0, -3);
  else if (out.endsWith("ed") && out.length > 4) out = out.slice(0, -2);
  // Undo a doubled final consonant introduced by the suffix: plann → plan.
  if (/([bdfglmnprt])\1$/.test(out) && out.length > 3) out = out.slice(0, -1);
  return out;
}

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^a-z0-9£$%]+/)
    .filter((t) => t.length > 1 && !STOPWORDS.has(t))
    .map(stem);
}

/* ── BM25 index, built once per process ─────────────────────────────────── */

const K1 = 1.2;
const B = 0.75;

type Indexed = LocalChunk & { terms: string[]; length: number };

function buildIndex(chunks: LocalChunk[]): { docs: Indexed[]; df: Map<string, number>; avg: number } {
  const docs = chunks.map((c) => {
    // Title and section are weighted into the text so a query naming a document
    // ("procurement routes") ranks its chunks above incidental body matches.
    const terms = tokenize(`${c.title} ${c.section} ${c.section} ${c.body}`);
    return { ...c, terms, length: terms.length };
  });
  const df = new Map<string, number>();
  for (const d of docs) {
    for (const t of new Set(d.terms)) df.set(t, (df.get(t) ?? 0) + 1);
  }
  const avg = docs.length ? docs.reduce((n, d) => n + d.length, 0) / docs.length : 0;
  return { docs, df, avg };
}

const CORPUS_INDEX = buildIndex(CORPUS_CHUNKS);
const GUIDE_INDEX = buildIndex(GUIDE_CHUNKS);

/** A chunk must clear this to be cited. Tuned against the real corpora: an
 *  on-topic question scores well above it, an unrelated one below. */
const MIN_SCORE = 1.2;

function searchIndex(
  index: { docs: Indexed[]; df: Map<string, number>; avg: number },
  query: string,
  limit: number,
): LocalRetrieved[] {
  const qTerms = [...new Set(tokenize(query))];
  if (qTerms.length === 0 || index.docs.length === 0) return [];

  const N = index.docs.length;
  const scored: LocalRetrieved[] = [];

  for (const doc of index.docs) {
    let score = 0;
    const counts = new Map<string, number>();
    for (const t of doc.terms) counts.set(t, (counts.get(t) ?? 0) + 1);

    for (const term of qTerms) {
      const tf = counts.get(term);
      if (!tf) continue;
      const df = index.df.get(term) ?? 0;
      // Standard BM25 idf, floored at a small positive so a term present in
      // every document contributes ~0 instead of going negative.
      const idf = Math.max(0.05, Math.log(1 + (N - df + 0.5) / (df + 0.5)));
      const norm = tf * (K1 + 1) / (tf + K1 * (1 - B + B * (doc.length / (index.avg || 1))));
      score += idf * norm;
    }
    if (score >= MIN_SCORE) scored.push({ ...doc, score });
  }

  // Stable ordering: score desc, then sourceRef/section so equal scores don't
  // shuffle between calls (citations would otherwise flicker turn to turn).
  scored.sort(
    (a, b) =>
      b.score - a.score ||
      a.sourceRef.localeCompare(b.sourceRef) ||
      a.section.localeCompare(b.section),
  );
  return scored.slice(0, limit);
}

/**
 * Scale a hit list to its own best hit (best → 1).
 *
 * BM25 scores are not comparable across indexes — idf depends on the document
 * count, and the corpus (33 chunks) and the guide knowledge base (24) differ in
 * size. Merging raw scores would let the larger index win on size alone, so
 * each side is normalised to "how well does this match, relative to the best
 * available match". Ordering within one index is monotonic under this, so
 * single-source results are unaffected.
 */
function normalise(hits: LocalRetrieved[]): LocalRetrieved[] {
  const best = hits[0]?.score ?? 0;
  return best > 0 ? hits.map((h) => ({ ...h, score: h.score / best })) : hits;
}

/** Top chunks for `query`. Never throws — retrieval must not take down a reply,
 *  which is why the Python version wraps search in a bare except too. */
export function search(query: string, opts: { limit?: number; source?: LocalSource } = {}): LocalRetrieved[] {
  const limit = opts.limit ?? 6;
  const source = opts.source ?? "corpus";
  try {
    const hits: LocalRetrieved[] = [];
    if (source === "corpus" || source === "all") {
      hits.push(...normalise(searchIndex(CORPUS_INDEX, query, limit)));
    }
    if (source === "guide" || source === "all") {
      hits.push(...normalise(searchIndex(GUIDE_INDEX, query, limit)));
    }
    if (hits.length === 0) return [];
    hits.sort(
      (a, b) =>
        b.score - a.score ||
        a.sourceRef.localeCompare(b.sourceRef) ||
        a.section.localeCompare(b.section),
    );
    return hits.slice(0, limit);
  } catch (err) {
    console.error("[helm:local] retrieval failed:", err);
    return [];
  }
}

/**
 * Render retrieved chunks as a numbered, citable context block. Numbering
 * matches list position, so a model told to cite `[1]` maps back to results[0] —
 * same contract as retrieval.py's format_context, including the whole-chunk
 * truncation at `maxChars` so the provider never sees half a sentence.
 */
export function formatContext(results: LocalRetrieved[], maxChars = 8000): string {
  const blocks: string[] = [];
  let used = 0;
  for (let i = 0; i < results.length; i++) {
    const r = results[i];
    const block = `[${i + 1}] ${citationLabel(r)}\n${r.body}`;
    if (used + block.length > maxChars && blocks.length > 0) break;
    blocks.push(block);
    used += block.length;
  }
  return blocks.join("\n\n");
}

/** Dedupe by source_ref, first occurrence wins — the same de-dupe the Python
 *  _citations does, so a chunk cited twice yields one citation. */
export function citations(results: LocalRetrieved[]): HelmCitation[] {
  const out: HelmCitation[] = [];
  const seen = new Set<string>();
  for (const r of results) {
    if (seen.has(r.sourceRef)) continue;
    seen.add(r.sourceRef);
    out.push({
      ref: r.sourceRef,
      title: citationLabel(r),
      namespace: r.namespace,
      snippet: r.body.slice(0, 200),
    });
  }
  return out;
}
