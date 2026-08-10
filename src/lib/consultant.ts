/**
 * ─────────────────────────────────────────────────────────────
 *  THE CONSULTANT
 *
 *  Decides what to say back, what to ask next, and which answers to
 *  offer as one-tap chips. It never asks about something already known,
 *  never asks two things at once, and stops asking entirely once the
 *  brief is strong enough — a form that keeps pushing after it has what
 *  it needs is the thing people hate most about forms.
 *
 *  `Consultant` is the seam. `localConsultant` runs the on-page engine;
 *  `remoteConsultant(url)` posts to a server that returns the identical
 *  shape. Moving to a hosted model means changing which one is
 *  constructed in studio.ts — nothing else in the app knows the
 *  difference.
 * ─────────────────────────────────────────────────────────────
 */

import {
  type AnswerKey, type BriefState, canSend, label as labelOf, fieldTitles,
  intents, buildTypes, industries, systems as systemOpts, integrations as integrationOpts,
  aiCapabilities, compliance as complianceOpts, projectTypes, durations, budgets,
  userCounts, startWhens, govProcurements, visibleFields, type Opt,
} from "../data/brief";
import { read, routeProse, type Hit } from "./understand";

export interface Chip {
  label: string;
  /** Set a field directly. Falls back to sending `label` as a message. */
  key?: AnswerKey;
  value?: string;
}

export interface Turn {
  reply: string;
  patch: Partial<BriefState>;
  hits: Hit[];
  chips: Chip[];
  /** Field the interface should scroll to and highlight, if any. */
  focus?: AnswerKey;
}

export interface Consultant {
  greet(): Turn;
  respond(message: string, state: BriefState, visible: Set<string>): Promise<Turn>;
}

/* ── The ask plan ───────────────────────────────────────────── */

interface Ask {
  key: AnswerKey;
  question: string;
  /** Only ask when this holds and the field is both visible and empty. */
  when?: (s: BriefState) => boolean;
  options?: Opt[];
  /** Free-text asks get suggestions rather than answers. */
  freeform?: boolean;
}

const wantsAi = (s: BriefState) =>
  s.intent === "ai" || s.builds.some((b) => ["ai-automation", "ai-agent", "voice-ai", "ai-in-product"].includes(b));

const sensitive = (s: BriefState) =>
  ["government", "enterprise", "nonprofit"].includes(s.projectType) ||
  s.industries.some((i) => ["healthcare", "fintech", "insurance", "legal", "government", "education"].includes(i)) ||
  ["regulated", "classified", "personal"].includes(s.dataSensitivity);

/**
 * Ordered by what a person can answer easily and what changes our advice
 * most. Money and timing sit late on purpose — asking early ends
 * conversations.
 */
const PLAN: Ask[] = [
  { key: "intent", question: "What would you say you're mainly after — building something new, adding AI, automating work, or connecting what you already run?", options: intents },
  { key: "builds", question: "Which of these is closest to what you have in mind?", options: buildTypes },
  { key: "problem", question: "What happens today? Who does this work, and roughly how often.", freeform: true },
  { key: "industries", question: "What industry are you in?", options: industries },
  {
    key: "systems", question: "What are you running today that this would sit alongside?",
    options: systemOpts,
    when: (s) => ["automate", "integrate", "improve"].includes(s.intent) || s.builds.includes("integration") || !!s.problem,
  },
  { key: "projectType", question: "What kind of project is this?", options: projectTypes },
  { key: "govProcurement", question: "Where are you in procurement? It changes how quickly we can move.", options: govProcurements, when: (s) => s.projectType === "government" },
  { key: "duration", question: "How long do you expect this to run?", options: durations },
  { key: "integrations", question: "What does it need to connect to?", options: integrationOpts },
  { key: "aiNeeds", question: "What should the AI actually do?", options: aiCapabilities, when: wantsAi },
  { key: "users", question: "Roughly how many people will use it?", options: userCounts },
  { key: "compliance", question: "Any compliance or security standards we should design around?", options: complianceOpts, when: sensitive },
  { key: "budget", question: "Roughly what budget are you working with? A range is fine — or I can tell you what this usually costs.", options: budgets },
  { key: "startWhen", question: "When would you like to start?", options: startWhens },
  { key: "successCriteria", question: "Last useful one: how would you know this had worked?", freeform: true },
];

/** Suggestions offered under a free-text ask, tailored to what's known. */
const PROSE_HINTS: Partial<Record<AnswerKey, (s: BriefState) => string[]>> = {
  problem: (s) => s.intent === "improve"
    ? ["It's slow under load", "We can't change it safely", "It keeps breaking"]
    : ["It's all manual today", "Things fall through the cracks", "It takes too many hours"],
  successCriteria: () => ["Hours saved each week", "Faster response times", "Fewer errors", "More revenue"],
};

/* ── Composing a reply ──────────────────────────────────────── */

const list = (items: string[]) =>
  items.length <= 1 ? items[0] ?? "" :
  items.length === 2 ? `${items[0]} and ${items[1]}` :
  `${items.slice(0, -1).join(", ")} and ${items[items.length - 1]}`;

/** "Got it — AI agent, connected to HubSpot." Names it back, briefly. */
const acknowledge = (hits: Hit[]): string => {
  if (!hits.length) return "";
  const named = hits
    .filter((h) => !["email", "name", "company"].includes(h.key as string))
    .slice(0, 3)
    .map((h) => labelOf(h.key as string, h.value).toLowerCase());
  if (!named.length) return "Noted.";
  return `Got that — ${list(named)}.`;
};

const openers = [
  "Right,", "Understood.", "That's clear.", "Makes sense.", "Good.",
];

/** Deterministic variety: same conversation position, same phrasing. */
const pick = <T,>(arr: T[], seed: number) => arr[seed % arr.length];

/**
 * The next thing worth asking. Visibility is recomputed from `s` rather
 * than taken as an argument: `s` is the state *after* this turn's patch, and
 * answering "government" has to make the procurement question askable in the
 * same breath.
 */
const nextAsk = (s: BriefState, asked: Set<string>): Ask | null => {
  const visible = visibleFields(s);
  for (const ask of PLAN) {
    if (asked.has(ask.key as string)) continue;
    if (!visible.has(ask.key as string)) continue;
    if (ask.when && !ask.when(s)) continue;
    const v = s[ask.key];
    const empty = Array.isArray(v) ? v.length === 0 : !String(v ?? "").trim();
    if (empty) return ask;
  }
  return null;
};

/** Answer chips for the ask, capped so the row stays readable. */
const chipsFor = (ask: Ask, s: BriefState): Chip[] => {
  if (ask.freeform) {
    const hints = PROSE_HINTS[ask.key]?.(s) ?? [];
    return hints.map((label) => ({ label }));
  }
  const opts = ask.options ?? [];
  return opts.slice(0, 7).map((o) => ({ label: o.label, key: ask.key, value: o.value }));
};

/** Said once the brief is genuinely good — the point at which we stop. */
const ENOUGH =
  "That's a properly useful brief — more than most projects start with. Send it whenever you're ready, and add anything else you think matters.";

const READY =
  "That's enough for us to come back to you with something specific. Add more if you'd like a sharper first call, or send it as it is.";

/* ── The on-page implementation ─────────────────────────────── */

class LocalConsultant implements Consultant {
  private asked = new Set<string>();
  private turn = 0;

  greet(): Turn {
    return {
      reply: "Tell me what you need — in your own words, or out loud with the microphone. I'll fill in the brief as we go so you don't have to work through it question by question.",
      patch: {},
      hits: [],
      chips: [
        { label: "Automate a manual process" },
        { label: "Build an AI assistant" },
        { label: "Connect our existing tools" },
        { label: "I just have a question" },
      ],
    };
  }

  async respond(message: string, state: BriefState, _visible: Set<string>): Promise<Turn> {
    this.turn += 1;

    /* Someone who only wants information gets a short answer, not a funnel. */
    if (/\b(?:just|only) (?:have|had|got) a question|price list|how much do you charge|are you hiring|is this (?:a )?(?:spam|bot)\b/i.test(message)) {
      return {
        reply: "Of course. Write the question below and add your name and email at the end — that's all we need to get you an answer. Nothing else on this page is required.",
        patch: routeProse(message, state),
        hits: [],
        chips: [{ label: "What does a project like this cost?" }, { label: "How long do these usually take?" }],
        focus: "name",
      };
    }

    const { patch, hits } = read(message, state);
    const prose = routeProse(message, { ...state, ...patch } as BriefState);
    const merged = { ...patch, ...prose };
    const after = { ...state, ...merged } as BriefState;

    /* Cost questions get an honest, non-committal answer and keep moving. */
    if (/\b(?:cost|price|pricing|how much|budget range|charge)\b/i.test(message) && !merged.budget) {
      const ask = nextAsk(after, this.asked);
      if (ask) this.asked.add(ask.key as string);
      return {
        reply:
          "It depends on scope, so I won't invent a number — but most projects here land between $10k and $100k, and multi-year programmes go well beyond that. " +
          (ask ? ask.question : "Tell me a bit more and we'll get you a real figure on the call."),
        patch: merged, hits,
        chips: ask ? chipsFor(ask, after) : [],
        focus: ask?.key,
      };
    }

    const ack = acknowledge(hits);
    const ask = nextAsk(after, this.asked);

    /* Nothing left worth asking — say so and stop. */
    if (!ask) {
      return {
        reply: `${ack} ${canSend(after) ? ENOUGH : "Add your name and email below and this is ready to send."}`.trim(),
        patch: merged, hits, chips: [],
        focus: canSend(after) ? undefined : "name",
      };
    }

    this.asked.add(ask.key as string);

    /* Understood nothing concrete — ask for detail rather than pretend. */
    if (!hits.length && !Object.keys(prose).length) {
      return {
        reply: `I didn't catch anything specific in that. ${ask.question}`,
        patch: merged, hits, chips: chipsFor(ask, after), focus: ask.key,
      };
    }

    const lead = ack || pick(openers, this.turn);
    return {
      reply: `${lead} ${ask.question}`,
      patch: merged,
      hits,
      chips: chipsFor(ask, after),
      focus: ask.key,
    };
  }

  /** Called when the visitor edits the brief directly, so we don't re-ask. */
  markAnswered(key: string) {
    this.asked.add(key);
  }

  /** Spoken once the meter crosses a threshold, rather than on every turn. */
  static milestone(tierId: string): string | null {
    if (tierId === "call") return READY;
    if (tierId === "strong") return ENOUGH;
    return null;
  }
}

export const localConsultant = () => new LocalConsultant();

/* ── The hosted implementation, for later ───────────────────── */

/**
 * Drop-in replacement once there's a server. The endpoint receives the
 * message plus the current brief, and returns `Turn` — the same contract
 * the local engine satisfies, so studio.ts is unchanged.
 *
 *   POST { message, state } → { reply, patch, hits, chips, focus }
 *
 * Falls back to the on-page engine on any failure, so a cold start, a
 * rate limit or a dropped connection degrades instead of breaking.
 */
export const remoteConsultant = (endpoint: string): Consultant => {
  const fallback = new LocalConsultant();
  return {
    greet: () => fallback.greet(),
    async respond(message, state, visible) {
      try {
        const res = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message, state }),
        });
        if (!res.ok) throw new Error(String(res.status));
        const turn = (await res.json()) as Partial<Turn>;
        if (!turn || typeof turn.reply !== "string") throw new Error("bad shape");
        return {
          reply: turn.reply,
          patch: turn.patch ?? {},
          hits: turn.hits ?? [],
          chips: turn.chips ?? [],
          focus: turn.focus,
        };
      } catch {
        return fallback.respond(message, state, visible);
      }
    },
  };
};

/** Re-exported so studio.ts can announce threshold crossings. */
export const milestoneFor = LocalConsultant.milestone;

/** Used by the read-back panel: what we believe, in plain sentences. */
export const readback = (s: BriefState, visible: Set<string>): string[] => {
  const lines: string[] = [];
  const say = (key: AnswerKey, prefix: string) => {
    if (!visible.has(key as string)) return;
    const v = s[key];
    const text = Array.isArray(v)
      ? v.map((x) => labelOf(key as string, x)).join(", ")
      : String(v ?? "").trim();
    if (text) lines.push(`${prefix} ${text}`);
  };

  say("intent", "You're looking to");
  say("builds", "Specifically:");
  say("industries", "Industry:");
  say("systems", "Already running:");
  say("integrations", "Needs to connect to:");
  say("aiNeeds", "The AI should handle:");
  say("projectType", "Project type:");
  say("duration", "Expected to run:");
  say("budget", "Budget:");
  say("compliance", "Must satisfy:");
  return lines;
};

/** Title for the summary rail. */
export const titleOf = (key: AnswerKey) => fieldTitles[key] ?? String(key);
