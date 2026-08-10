/**
 * ─────────────────────────────────────────────────────────────
 *  TEAM EXPORT
 *
 *  Turns the answers into the two things the team actually needs:
 *
 *   · `payload` — structured JSON, for a CRM, a webhook, or a database.
 *   · `markdown` — the brief as a person would write it, ready to paste
 *     into a ticket or read on the way to the call.
 *
 *  The markdown leads with a five-line summary, because whoever takes
 *  the call will read the first screen and skim the rest.
 * ─────────────────────────────────────────────────────────────
 */

import {
  type AnswerKey, type BriefState, fieldTitles, label as labelOf, isAnswered, strength, tierFor, canSend,
} from "../data/brief";

/** Order the brief reads in — grouped the way a person would ask. */
const GROUPS: { title: string; keys: AnswerKey[] }[] = [
  { title: "What they want", keys: ["intent", "builds", "pitch"] },
  { title: "Where they are today", keys: ["problem", "industries", "systems", "users", "businessSize"] },
  { title: "Shape of the project", keys: ["projectType", "duration", "startWhen", "budget"] },
  {
    title: "Project-type specifics",
    keys: ["govLevel", "govProcurement", "govFunding", "govApproval", "entProcurement", "entSignoff",
      "npFunding", "npDeadline", "startupStage", "startupGoal", "internalDept", "strategicShape"],
  },
  { title: "Requirements", keys: ["integrations", "aiNeeds", "technical", "dataSensitivity", "compliance"] },
  { title: "Outcome & risk", keys: ["successCriteria", "constraints", "stakeholders"] },
  { title: "Contact", keys: ["name", "email", "company", "role", "phone"] },
];

const render = (s: BriefState, key: AnswerKey): string => {
  const v = s[key];
  if (Array.isArray(v)) return v.map((x) => labelOf(key as string, x)).join(", ");
  return labelOf(key as string, String(v ?? "")).trim();
};

/** The line at the top: who, wanting what, at what size, by when. */
const headline = (s: BriefState): string => {
  const who = [s.company, s.role].filter(Boolean).join(" · ") || "Unknown company";
  const what = s.builds.length
    ? s.builds.map((b) => labelOf("builds", b)).join(" + ")
    : s.intent ? labelOf("intent", s.intent) : "Unspecified";
  const bits = [
    s.projectType && labelOf("projectType", s.projectType),
    s.duration && labelOf("duration", s.duration),
    s.budget && labelOf("budget", s.budget),
  ].filter(Boolean);
  return `${who} — ${what}${bits.length ? ` (${bits.join(", ")})` : ""}`;
};

/** Things worth flagging before anyone picks up the call. */
const flags = (s: BriefState): string[] => {
  const out: string[] = [];
  if (s.projectType === "government") out.push("Public sector — procurement rules apply, check the route before quoting.");
  if (s.projectType === "nonprofit") out.push("Non-profit — funding may be restricted or deadline-bound.");
  if (s.projectType === "enterprise") out.push("Enterprise — expect security and legal review in the path.");
  if (["1-2y", "multi-year"].includes(s.duration)) out.push("Long engagement — scope as a programme, not a project.");
  if (s.budget === "guide-me") out.push("Asked us to guide on cost — bring indicative ranges.");
  if (s.budget === "unsure" && s.duration && s.duration !== "unsure") out.push("Timeline known, budget not set — likely needs a business case.");
  if (s.compliance.some((c) => !["none", "unsure"].includes(c))) out.push(`Compliance in scope: ${s.compliance.map((c) => labelOf("compliance", c)).join(", ")}.`);
  if (s.dataSensitivity === "classified") out.push("Classified or controlled data — clearance and hosting questions come first.");
  if (s.startWhen === "now") out.push("Wants to start immediately.");
  if (!s.problem.trim() && !s.pitch.trim()) out.push("Very little context given — treat as a discovery call.");
  return out;
};

export interface BriefExport {
  payload: Record<string, unknown>;
  markdown: string;
  headline: string;
  flags: string[];
  score: number;
}

export function buildExport(s: BriefState, visible: Set<string>): BriefExport {
  const score = strength(s, visible);
  const tier = tierFor(score, canSend(s));
  const flagged = flags(s);

  /* ── Markdown ─────────────────────────────────────────────── */
  const md: string[] = [];
  md.push(`# ${headline(s)}`);
  md.push("");
  md.push(`**Brief strength:** ${score}% — ${tier.label}`);
  if (s.slot) md.push(`**Meeting:** ${s.slot.when} (${s.slot.meeting}, ${s.slot.timezone})`);
  md.push(`**Reply to:** ${s.name || "—"} <${s.email || "—"}>${s.phone ? ` · ${s.phone}` : ""}`);
  md.push("");

  if (flagged.length) {
    md.push("## Before the call");
    for (const f of flagged) md.push(`- ${f}`);
    md.push("");
  }

  for (const group of GROUPS) {
    const rows = group.keys
      .filter((k) => visible.has(k as string) && isAnswered(s, k))
      .map((k) => ({ title: fieldTitles[k] ?? String(k), value: render(s, k) }));
    if (!rows.length) continue;

    md.push(`## ${group.title}`);
    for (const r of rows) {
      // Long prose reads better as a block than as a table cell.
      if (r.value.length > 90 || r.value.includes("\n")) {
        md.push(`**${r.title}**`);
        md.push("");
        md.push(r.value.split("\n").map((l) => `> ${l}`).join("\n> \n"));
      } else {
        md.push(`- **${r.title}:** ${r.value}`);
      }
    }
    md.push("");
  }

  if (s.transcript.length) {
    md.push("## Conversation");
    for (const t of s.transcript) {
      md.push(`**${t.role === "you" ? "Them" : "Assistant"}:** ${t.text}`);
      md.push("");
    }
  }

  /* ── Structured payload ───────────────────────────────────── */
  const answers: Record<string, unknown> = {};
  for (const group of GROUPS) {
    for (const k of group.keys) {
      if (!visible.has(k as string) || !isAnswered(s, k)) continue;
      const raw = s[k];
      answers[k] = Array.isArray(raw)
        ? raw.map((v) => ({ value: v, label: labelOf(k as string, v) }))
        : { value: raw, label: labelOf(k as string, String(raw)) };
    }
  }

  const payload = {
    source: "contact-brief",
    submittedAt: new Date().toISOString(),
    headline: headline(s),
    briefStrength: score,
    tier: tier.id,
    flags: flagged,
    contact: {
      name: s.name, email: s.email, company: s.company, role: s.role, phone: s.phone,
    },
    meeting: s.slot,
    answers,
    raw: { ...s, transcript: undefined },
    transcript: s.transcript,
    markdown: md.join("\n"),
  };

  return { payload, markdown: md.join("\n"), headline: headline(s), flags: flagged, score };
}
