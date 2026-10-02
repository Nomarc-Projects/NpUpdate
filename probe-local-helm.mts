/**
 * Offline verification of the local Helm backend.
 * Run: npx tsx --conditions=react-server probe-local-helm.ts
 *
 * Mocks global fetch so no provider key is needed, then checks the three things
 * that can silently regress: retrieval honesty (grounded only when there's a
 * real match), the response contract for both surfaces, and the proposal path.
 */

import { search, formatContext, citations } from "./lib/helm/local-retrieval";
import { answerConsultant, answerGuide } from "./lib/helm/assistant-local";

process.env.HELM_BACKEND = "local";
process.env.HELM_GROQ_API_KEY = "test-key";
delete process.env.HELM_CEREBRAS_API_KEY;
delete process.env.HELM_SAMBANOVA_API_KEY;

let fail = 0;
function check(name: string, ok: boolean, detail = "") {
  console.log(`${ok ? "PASS" : "FAIL"}  ${name}${detail ? `  — ${detail}` : ""}`);
  if (!ok) fail++;
}

/* ── 1. retrieval honesty ────────────────────────────────────────────────── */
console.log("\n== retrieval ==");
for (const [q, expectHits] of [
  ["What concrete mix should I specify for a foundation in Lagos?", true],
  ["How do tender sums work on a construction contract?", true],
  // The corpus documents "Lump sum" but never "quantum", so there is genuinely
  // nothing to ground on. An honest miss is the correct result — the point of
  // the score threshold. It is listed here to pin that behaviour.
  ["What is the difference between a quantum and a lumpsum?", false],
  ["Which professional body registers quantity surveyors in Nigeria?", true],
  ["How do I fix a broken deployment pipeline in Kubernetes?", false],
  ["what is the weather in Abuja tomorrow", false],
] as const) {
  const hits = search(q, { limit: 6, source: "corpus" });
  check(
    `corpus ${expectHits ? "hits" : "empty"}: ${q.slice(0, 44)}`,
    expectHits ? hits.length > 0 : hits.length === 0,
    hits.length ? `top=${citations(hits)[0]?.title}` : "",
  );
}

const guideHit = search("How much does a Pro plan cost?", { limit: 5, source: "all" });
check("guide finds pricing", guideHit.length > 0, guideHit[0]?.title);

const top = search("standard forms of contract used in Nigeria", { limit: 3, source: "corpus" });
check(
  "top hit is on-topic",
  /contract|procurement|tender/i.test(top[0]?.title ?? ""),
  top.map((t) => t.title).join(" / "),
);
const ctx = formatContext(top);
check("context is numbered and citable", /^\[1] /.test(ctx), `${ctx.length} chars`);
check("citations dedupe by source", citations(top).length === new Set(top.map((t) => t.sourceRef)).size);

/* ── 2. mocked provider ──────────────────────────────────────────────────── */
type Call = { body: any; url: string };
const calls: Call[] = [];
let reply: (p: string) => string = () => "ok";

globalThis.fetch = (async (url: any, init: any) => {
  const body = JSON.parse(String(init.body));
  calls.push({ body, url: String(url) });
  const text = reply(String(body.messages?.[0]?.content ?? ""));
  return new Response(
    JSON.stringify({
      choices: [{ message: { content: text }, finish_reason: "stop" }],
      usage: { prompt_tokens: 10, completion_tokens: 5 },
    }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}) as any;

const contains = (p: string, needle: string) => p.toLowerCase().includes(needle.toLowerCase());

console.log("\n== consultant (grounded) ==");
reply = () =>
  "Specify a 25–35N/mm2 concrete for a typical reinforced foundation, but confirm the mix design with a materials engineer and check the exposure class in the project code [1].";
let res = await answerConsultant({
  message: "What concrete mix should I specify for a foundation?",
  discipline: "structural",
});
check("answer returned", res.answer.length > 0);
check("grounded on corpus", res.grounded === true);
check("citations present", res.citations.length > 0, res.citations[0]?.title);
check("citation namespace is corpus", res.citations.every((c) => c.namespace === "corpus"));
check("no proposal on a question", res.proposal === null);
// calls[0] is the write router, calls[1] is the answer.
const answerCall = calls[1];
check("router ran first", contains(calls[0].body.messages[0].content, "classify"));
check("system prompt is discipline-adapted", contains(answerCall.body.messages[0].content, "structural engineer"));
check("sources block included", contains(answerCall.body.messages[0].content, "SOURCES:"));
check("temperature lowered when grounded", answerCall.body.temperature === 0.3, String(answerCall.body.temperature));
check("uses groq when only groq is keyed", answerCall.url.startsWith("https://api.groq.com"));

console.log("\n== consultant (ungrounded) ==");
const before = calls.length;
reply = () => "In general, offer applications usually run for a few weeks.";
res = await answerConsultant({ message: "How do I wire up a Kubernetes cluster?" });
check("not grounded", res.grounded === false);
check("no citations when ungrounded", res.citations.length === 0);
check("can still answer", res.can_answer === true);
check("tool is chat", res.tool === "chat");
const ungroundedCall = calls[before + 1];
check("prompt admits no sources", contains(ungroundedCall.body.messages[0].content, "no retrieved sources"));
check("no SOURCES block", !contains(ungroundedCall.body.messages[0].content, "SOURCES:"));
check("router + answer = 2 calls", calls.length === before + 2, `${calls.length - before} call(s)`);

console.log("\n== proposal (write intent) ==");
const w0 = calls.length;
reply = (p) =>
  contains(p, "classify a construction professional")
    ? '{"is_write": true, "action": "create_task", "title": "Order reinforcement bars", "priority": "high", "due_date": "2026-10-30"}'
    : "draft";
res = await answerConsultant({
  message: "add a high priority task to order reinforcement bars due 2026-10-30",
  projectId: "proj-1",
});
check("proposal emitted", res.proposal !== null);
check("routed by router", res.routed_by === "router");
check("tool is pm.create_task", res.tool === "pm.create_task", res.tool);
check("action matches the apply contract", res.proposal?.action === "create_task");
check("params carry the right keys", ["title", "priority", "dueDate", "projectId"].every((k) => k in (res.proposal?.params ?? {})),
  JSON.stringify(res.proposal?.params));
check("no generation call after a write", calls.length === w0 + 1, `${calls.length - w0} call(s)`);

console.log("\n== proposal (needs a project) ==");
reply = (p) => contains(p, "classify") ? '{"is_write": true, "action": "create_task", "title": "Pour concrete"}' : "x";
res = await answerConsultant({ message: "add a task to pour concrete" });
check("not ready without a project", res.proposal?.ready === false);
check("explains what is missing", contains(res.proposal?.summary ?? "", "project"), res.proposal?.summary);

console.log("\n== proposal (drops a bad date) ==");
reply = (p) => contains(p, "classify") ? '{"is_write": true, "action": "create_task", "title": "Snag walk", "due_date": "next Friday"}' : "x";
res = await answerConsultant({ message: "add a task called snag walk", projectId: "p1" });
check("non-ISO due date dropped", !("dueDate" in (res.proposal?.params ?? {})));
check("still ready", res.proposal?.ready === true);

console.log("\n== router false positives ==");
reply = (p) => contains(p, "classify") ? '{"is_write": false, "action": "none", "title": null, "priority": null, "due_date": null}' : "advice";
res = await answerConsultant({ message: "What is the role of a site manager?" });
check("question not routed to a write", res.proposal === null && res.routed_by === "retrieval");

console.log("\n== router failure is non-fatal ==");
reply = () => "I have no idea what you mean";
res = await answerConsultant({ message: "add a task to pour concrete" });
check("bad JSON falls through to a normal answer", res.proposal === null && res.answer.length > 0);

console.log("\n== guide ==");
reply = () => "Pro is built for working professionals and includes AI consultant access. You can see plans on the pricing page.";
const g = await answerGuide({ message: "What do I get on the Pro plan?" });
check("guide answers", g.answer.length > 0);
check("guide cites public knowledge", g.citations.length > 0, g.citations[0]?.title);
check("guide contract: navigate is null", g.navigate === null);
check("guide has no proposal field", !("proposal" in g));

console.log("\n== history handling ==");
reply = () => "sure";
await answerGuide({
  message: "and the free plan?",
  history: [
    { role: "user", content: "tell me about pro" },
    { role: "assistant", content: "pro is for professionals" },
  ],
});
const p = calls[calls.length - 1].body.messages[0].content;
check("history included in prompt", contains(p, "tell me about pro") && contains(p, "pro is for professionals"));

/* ── 3. provider failover ────────────────────────────────────────────────── */
console.log("\n== failover ==");
process.env.HELM_CEREBRAS_API_KEY = "test-key";
const realFetch = globalThis.fetch;
const attempted: string[] = [];
globalThis.fetch = (async (url: any, init: any) => {
  const body = JSON.parse(String(init.body));
  const host = new URL(String(url)).host;
  attempted.push(host);
  // Cerebras is down; Groq should pick up the turn.
  if (host.includes("cerebras")) return new Response("upstream exploded", { status: 500 });
  return new Response(
    JSON.stringify({ choices: [{ message: { content: "answered by groq" }, finish_reason: "stop" }] }),
    { status: 200, headers: { "Content-Type": "application/json" } },
  );
}) as any;

reply = () => '{"is_write": false, "action": "none"}';
const fo = await answerGuide({ message: "How do I sign up?" });
check("cerebras tried first", attempted[0]?.includes("cerebras"), attempted.join(" → "));
check("failed over to groq", attempted.some((h) => h.includes("groq")));
check("grok reply returned intact", fo.answer === "answered by groq", fo.answer);
check("sambanova not needed", !attempted.some((h) => h.includes("sambanova")));

console.log("\n== all providers down ==");
globalThis.fetch = (async () => new Response("down", { status: 503 })) as any;
const dead = await answerGuide({ message: "How do I sign up?" });
check("guide degrades to a message, not a throw", dead.answer.length > 0 && /offline|try again/i.test(dead.answer), dead.answer);
check("no citations invented on failure", dead.citations.length === 0);
const c = await answerConsultant({ message: "What is the defects liability period?" });
check("consultant degrades, does not throw", /isn't reachable|unavailable/i.test(c.answer), c.answer);
check("consultant marks itself unavailable", c.routed_by === "unavailable" && c.can_answer === false);

globalThis.fetch = realFetch;

console.log(fail === 0 ? "\nAll checks passed." : `\n${fail} check(s) FAILED.`);
process.exit(fail === 0 ? 0 : 1);
