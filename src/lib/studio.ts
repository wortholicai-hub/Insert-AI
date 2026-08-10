/**
 * ─────────────────────────────────────────────────────────────
 *  BRIEF STUDIO — the controller.
 *
 *  One page, one form, one state object. The sections below the
 *  consultant are rendered from data/brief.ts and re-rendered only when
 *  the *set of visible fields* changes, so answering a chip never steals
 *  focus from a textarea someone is mid-sentence in.
 *
 *  Three rules the whole thing is built on:
 *   · Nothing is hidden behind a step. Every question that applies is on
 *     the page, and every question that doesn't isn't.
 *   · Sending is never blocked by an optional field. The button turns on
 *     the moment we could genuinely reply, and says what it will do.
 *   · Anything the consultant fills in is marked, explained and one tap
 *     from being undone. It's their brief, not ours.
 * ─────────────────────────────────────────────────────────────
 */

import {
  type AnswerKey, type BriefState, type Field, type Section, emptyBrief, sections,
  strength, tierFor, canSend, wantsLongCall, isAnswered, visibleFields as fieldsVisibleIn,
} from "../data/brief";
import { localConsultant, milestoneFor, readback, type Chip, type Consultant } from "./consultant";
import { buildExport } from "./brief-export";

const STORE_KEY = "insertai:brief:v1";

export interface StudioOptions {
  /** Where a finished brief is POSTed. Empty string keeps it local. */
  endpoint: string;
  /** Fallback address shown if the POST fails. */
  email: string;
}

export function mountStudio(root: HTMLElement, opts: StudioOptions) {
  /* ── State ────────────────────────────────────────────────── */
  let state: BriefState = restore();
  const touched = new Set<string>();      // edited by hand — the consultant won't overwrite
  const aiFilled = new Map<string, string>(); // key → the words that caused it
  const consultant: Consultant = localConsultant();
  let lastTier = "empty";
  let sent = false;
  let visibleSig = "";
  /** Last call length suggested to the calendar. Only re-sent when it changes:
      the calendar answers `funnel:recommend` by publishing a slot, which lands
      back here — announcing it unconditionally would ping-pong forever. */
  let lastRec = "";

  const $ = <T extends HTMLElement>(sel: string) => root.querySelector<T>(sel);
  const sectionHost = $("[data-studio-sections]")!;
  const thread = $("[data-con-thread]")!;
  const chipRow = $("[data-con-chips]")!;
  const conField = $<HTMLTextAreaElement>("[data-con-field]")!;
  const conForm = $<HTMLFormElement>("[data-con-form]")!;
  const conStatus = $("[data-con-status]")!;
  const micBtn = $<HTMLButtonElement>("[data-con-mic]")!;
  const meterFill = $("[data-meter-fill]")!;
  const meterPct = $("[data-meter-pct]")!;
  const meterLabel = $("[data-meter-label]")!;
  const meterNote = $("[data-meter-note]")!;
  const sendBtn = $<HTMLButtonElement>("[data-send]")!;
  const sendLabel = $("[data-send-label]")!;
  const sendHint = $("[data-send-hint]")!;
  const readbackHost = $("[data-readback]")!;
  const bookToggle = $<HTMLInputElement>("[data-book-toggle]")!;
  const bookBody = $("[data-book-body]")!;
  const donePanel = $("[data-done]")!;
  const formPanel = $("[data-form-panel]")!;

  /* ── Persistence ──────────────────────────────────────────── */
  function restore(): BriefState {
    try {
      const raw = sessionStorage.getItem(STORE_KEY);
      if (!raw) return emptyBrief();
      return { ...emptyBrief(), ...JSON.parse(raw) } as BriefState;
    } catch {
      return emptyBrief();
    }
  }
  const save = () => {
    try { sessionStorage.setItem(STORE_KEY, JSON.stringify(state)); } catch { /* private mode */ }
  };

  /* ── Which fields currently apply ─────────────────────────── */
  /** Shared with the consultant, so both agree on what's on screen. */
  const visibleFields = () => fieldsVisibleIn(state);

  /* ── Field rendering ──────────────────────────────────────── */

  const el = (tag: string, cls?: string, text?: string) => {
    const node = document.createElement(tag);
    if (cls) node.className = cls;
    if (text) node.textContent = text;
    return node;
  };

  /** The "AI filled this" badge, with its evidence and an undo. */
  const aiBadge = (key: string) => {
    const wrap = el("span", "bf-ai");
    wrap.title = `Filled from: "${aiFilled.get(key)}"`;
    wrap.append(el("i", "bf-ai-dot"), el("span", undefined, "From what you said"));
    const undo = el("button", "bf-ai-undo", "Undo") as HTMLButtonElement;
    undo.type = "button";
    undo.addEventListener("click", () => {
      (state as unknown as Record<string, unknown>)[key] = Array.isArray(state[key as AnswerKey]) ? [] : "";
      aiFilled.delete(key);
      touched.add(key);
      render();
    });
    wrap.appendChild(undo);
    return wrap;
  };

  const fieldHead = (f: Field) => {
    const head = el("div", "bf-head");
    const lbl = el("label", "bf-label", f.label);
    lbl.setAttribute("for", `f-${String(f.key)}`);
    head.appendChild(lbl);
    if (f.optional) head.appendChild(el("span", "bf-optional", "Optional"));
    if (aiFilled.has(f.key as string) && !touched.has(f.key as string)) head.appendChild(aiBadge(f.key as string));
    return head;
  };

  const renderChips = (f: Extract<Field, { kind: "chips" }>) => {
    const box = el("div", f.cards ? "bf-cards" : "bf-chips");
    const current = state[f.key];
    const selected = Array.isArray(current) ? current : current ? [current as string] : [];
    const known = new Set(f.options.map((o) => o.value));

    const toggle = (value: string) => {
      touched.add(f.key as string);
      aiFilled.delete(f.key as string);
      if (f.multi) {
        const list = [...(state[f.key] as string[])];
        const at = list.indexOf(value);
        if (at >= 0) list.splice(at, 1); else list.push(value);
        (state as unknown as Record<string, unknown>)[f.key] = list;
      } else {
        (state as unknown as Record<string, unknown>)[f.key] = state[f.key] === value ? "" : value;
      }
      render();
    };

    for (const o of f.options) {
      const on = selected.includes(o.value);
      const btn = el("button", (f.cards ? "bf-card" : "bf-chip") + (on ? " is-on" : "")) as HTMLButtonElement;
      btn.type = "button";
      btn.setAttribute("aria-pressed", String(on));
      if (f.cards) {
        btn.append(el("span", "bf-card-mark"));
        const body = el("span", "bf-card-body");
        body.append(el("span", "bf-card-title", o.label));
        if (o.desc) body.append(el("span", "bf-card-desc", o.desc));
        btn.appendChild(body);
      } else {
        btn.textContent = o.label;
      }
      btn.addEventListener("click", () => toggle(o.value));
      box.appendChild(btn);
    }

    /* Values they typed themselves, or that came from a sentence. */
    for (const v of selected.filter((s) => !known.has(s))) {
      const btn = el("button", "bf-chip is-on is-custom") as HTMLButtonElement;
      btn.type = "button";
      btn.append(document.createTextNode(v), el("span", "bf-chip-x", "×"));
      btn.setAttribute("aria-label", `Remove ${v}`);
      btn.addEventListener("click", () => toggle(v));
      box.appendChild(btn);
    }

    if (f.custom) {
      const add = el("button", "bf-chip bf-chip-add", "+ Add your own") as HTMLButtonElement;
      add.type = "button";
      add.addEventListener("click", () => {
        const form = el("form", "bf-custom") as HTMLFormElement;
        const input = el("input") as HTMLInputElement;
        input.type = "text";
        input.maxLength = 48;
        input.placeholder = "Type it and press Add";
        const go = el("button", undefined, "Add") as HTMLButtonElement;
        go.type = "submit";
        form.append(input, go);
        add.replaceWith(form);
        input.focus();
        form.addEventListener("submit", (e) => {
          e.preventDefault();
          const v = input.value.trim();
          if (v) toggle(v); else render();
        });
      });
      box.appendChild(add);
    }
    return box;
  };

  const renderText = (f: Extract<Field, { kind: "text" }>) => {
    const wrap = el("div", "bf-textwrap");
    const ta = el("textarea", "bf-textarea") as HTMLTextAreaElement;
    ta.id = `f-${String(f.key)}`;
    ta.rows = f.rows ?? 4;
    ta.placeholder = f.placeholder ?? "";
    ta.value = String(state[f.key] ?? "");
    ta.addEventListener("input", () => {
      (state as unknown as Record<string, unknown>)[f.key] = ta.value;
      touched.add(f.key as string);
      aiFilled.delete(f.key as string);
      onValueChange();
    });
    wrap.appendChild(ta);
    if (f.voice && speechAvailable()) wrap.appendChild(dictateButton(ta, f.key as string));
    return wrap;
  };

  const renderInput = (f: Extract<Field, { kind: "input" }>) => {
    const input = el("input", "bf-input") as HTMLInputElement;
    input.id = `f-${String(f.key)}`;
    input.type = f.type ?? "text";
    input.placeholder = f.placeholder ?? "";
    if (f.autocomplete) input.setAttribute("autocomplete", f.autocomplete);
    input.value = String(state[f.key] ?? "");
    input.addEventListener("input", () => {
      (state as unknown as Record<string, unknown>)[f.key] = input.value;
      touched.add(f.key as string);
      aiFilled.delete(f.key as string);
      onValueChange();
    });
    return input;
  };

  const renderField = (f: Field) => {
    const box = el("div", "bf-field" + (f.kind === "input" && f.half ? " bf-half" : ""));
    box.dataset.field = String(f.key);
    box.appendChild(fieldHead(f));
    if (f.hint) box.appendChild(el("p", "bf-hint", f.hint));
    if (f.kind === "chips") box.appendChild(renderChips(f));
    else if (f.kind === "text") box.appendChild(renderText(f));
    else box.appendChild(renderInput(f));
    return box;
  };

  const renderSection = (sec: Section) => {
    const node = el("section", "bf-section");
    node.dataset.section = sec.id;

    const head = el("header", "bf-section-head");
    head.append(el("span", "bf-eyebrow", sec.eyebrow));
    head.append(el("h2", "bf-section-title", sec.title));
    head.append(el("p", "bf-section-blurb", sec.blurb));
    node.appendChild(head);

    const body = el("div", "bf-section-body");
    let shown = 0;
    for (const f of sec.fields) {
      if (f.when && !f.when(state)) continue;
      body.appendChild(renderField(f));
      shown++;
    }
    if (!shown) return null;
    node.appendChild(body);
    return node;
  };

  /* ── Full render ──────────────────────────────────────────── */

  /** Cheap signature of "which fields are on screen right now". */
  const signature = () => {
    const parts: string[] = [];
    for (const sec of sections) {
      if (sec.when && !sec.when(state)) continue;
      for (const f of sec.fields) {
        if (f.when && !f.when(state)) continue;
        parts.push(String(f.key));
      }
    }
    return parts.join("|");
  };

  const rebuild = () => {
    const focused = document.activeElement as HTMLElement | null;
    const focusKey = focused?.closest<HTMLElement>("[data-field]")?.dataset.field;
    const caret = (focused as HTMLTextAreaElement | HTMLInputElement | null)?.selectionStart ?? null;

    sectionHost.innerHTML = "";
    for (const sec of sections) {
      if (sec.when && !sec.when(state)) continue;
      const node = renderSection(sec);
      if (node) sectionHost.appendChild(node);
    }
    visibleSig = signature();

    /* Put the cursor back where it was — a re-render must be invisible. */
    if (focusKey) {
      const back = sectionHost.querySelector<HTMLElement>(`[data-field="${focusKey}"] textarea, [data-field="${focusKey}"] input`);
      if (back) {
        back.focus();
        if (caret != null && "setSelectionRange" in back) {
          try { (back as HTMLTextAreaElement).setSelectionRange(caret, caret); } catch { /* type doesn't support it */ }
        }
      }
    }
  };

  /**
   * Typing must never cost a rebuild — the caret would jump mid-sentence.
   * But answering "government" has to make the procurement questions appear
   * while they're still in the box above, so structure is re-checked on every
   * keystroke and only rebuilt when the *set* of questions has actually moved.
   */
  const syncStructure = () => {
    if (signature() !== visibleSig) rebuild();
  };

  /** Selections live in class names, so choosing a chip always rebuilds. */
  const render = () => {
    rebuild();
    onValueChange();
  };

  /* ── Meter, read-back and the send button ─────────────────── */

  const onValueChange = () => {
    syncStructure();
    const visible = visibleFields();
    const score = strength(state, visible);
    const ready = canSend(state);
    const tier = tierFor(score, ready);

    meterFill.style.width = `${Math.max(ready ? 6 : 2, score)}%`;
    meterFill.dataset.tier = tier.id;
    meterPct.textContent = `${score}%`;
    meterLabel.textContent = tier.label;
    meterNote.textContent = tier.note;

    sendBtn.disabled = !ready;
    sendLabel.textContent = bookToggle.checked && state.slot ? "Send and confirm the call" : tier.cta;
    sendHint.textContent = ready
      ? "You can stop here. Everything above this is optional."
      : "We need a name, an email, and one line about what you need.";

    /* Read-back: proof we understood, in their own terms. */
    const lines = readback(state, visible);
    readbackHost.innerHTML = "";
    if (lines.length) {
      readbackHost.appendChild(el("p", "bf-readback-head", "What we've understood so far"));
      const ul = el("ul", "bf-readback-list");
      for (const line of lines) ul.appendChild(el("li", undefined, line));
      readbackHost.appendChild(ul);
      readbackHost.hidden = false;
    } else {
      readbackHost.hidden = true;
    }

    /* Announce a threshold once, not on every keystroke. */
    if (tier.id !== lastTier) {
      const note = milestoneFor(tier.id);
      if (note && lastTier !== "empty") say("consultant", note);
      lastTier = tier.id;
    }

    const rec = wantsLongCall(state) ? "detail" : "intro";
    if (rec !== lastRec) {
      lastRec = rec;
      window.dispatchEvent(new CustomEvent("funnel:recommend", { detail: { id: rec } }));
    }
    save();
  };

  /* ── The conversation ─────────────────────────────────────── */

  const say = (role: "you" | "consultant", text: string) => {
    const msg = el("div", `bf-msg bf-msg-${role}`);
    msg.appendChild(el("p", undefined, text));
    thread.appendChild(msg);
    thread.scrollTop = thread.scrollHeight;
    state.transcript.push({ role, text });
    save();
  };

  const showChips = (chips: Chip[]) => {
    chipRow.innerHTML = "";
    for (const c of chips) {
      const btn = el("button", "bf-quick", c.label) as HTMLButtonElement;
      btn.type = "button";
      btn.addEventListener("click", () => {
        if (c.key && c.value) {
          /* A chip that answers a question answers it — no round trip. */
          const cur = state[c.key];
          if (Array.isArray(cur)) {
            if (!cur.includes(c.value)) (state as unknown as Record<string, unknown>)[c.key] = [...cur, c.value];
          } else {
            (state as unknown as Record<string, unknown>)[c.key] = c.value;
          }
          touched.add(c.key as string);
          say("you", c.label);
          chipRow.innerHTML = "";
          render();
          void advance("");
        } else {
          void send(c.label);
        }
      });
      chipRow.appendChild(btn);
    }
  };

  const typing = () => {
    const dots = el("div", "bf-typing");
    dots.append(el("i"), el("i"), el("i"));
    thread.appendChild(dots);
    thread.scrollTop = thread.scrollHeight;
    return dots;
  };

  /** Applies a consultant turn to the brief, respecting hand edits. */
  const applyTurn = async (message: string) => {
    const visible = visibleFields();
    const turn = await consultant.respond(message, state, visible);

    for (const [k, v] of Object.entries(turn.patch)) {
      if (touched.has(k)) continue;                    // they edited it; leave it alone
      (state as unknown as Record<string, unknown>)[k] = v;
    }
    for (const hit of turn.hits) {
      if (touched.has(hit.key as string)) continue;
      aiFilled.set(hit.key as string, hit.evidence);
    }
    render();
    return turn;
  };

  const advance = async (message: string) => {
    const dots = typing();
    const turn = await applyTurn(message);
    await new Promise((r) => setTimeout(r, 260));
    dots.remove();
    say("consultant", turn.reply);
    showChips(turn.chips);
    if (turn.focus) highlight(turn.focus as string);
  };

  let busy = false;
  const send = async (text: string) => {
    const value = text.trim();
    if (!value || busy) return;
    busy = true;
    conStatus.textContent = "Reading that…";
    say("you", value);
    conField.value = "";
    conField.style.height = "auto";
    chipRow.innerHTML = "";
    await advance(value);
    conStatus.textContent = "Type, or hold the microphone to talk";
    busy = false;
  };

  /** Draws the eye to the field just filled or just asked about. */
  const highlight = (key: string) => {
    const target = sectionHost.querySelector<HTMLElement>(`[data-field="${key}"]`);
    if (!target) return;
    target.classList.remove("is-lit");
    void target.offsetWidth; // restart the animation
    target.classList.add("is-lit");
    const rect = target.getBoundingClientRect();
    if (rect.top < 80 || rect.bottom > window.innerHeight - 40) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  };

  conForm.addEventListener("submit", (e) => { e.preventDefault(); void send(conField.value); });
  conField.addEventListener("keydown", (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); void send(conField.value); }
  });
  conField.addEventListener("input", () => {
    conField.style.height = "auto";
    conField.style.height = `${Math.min(conField.scrollHeight, 120)}px`;
  });

  /* ── Voice ────────────────────────────────────────────────── */

  const SpeechCtor: any =
    (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition || null;

  function speechAvailable() { return !!SpeechCtor; }

  /**
   * Dictation for any text control. Interim results appear live so people
   * can see it working; the field is only committed on a final result.
   */
  function listen(onText: (text: string, final: boolean) => void, onEnd: () => void) {
    const rec = new SpeechCtor();
    rec.lang = navigator.language || "en-US";
    rec.continuous = true;
    rec.interimResults = true;

    rec.onresult = (e: any) => {
      let interim = "";
      let done = "";
      for (let i = e.resultIndex; i < e.results.length; i++) {
        const chunk = e.results[i][0].transcript;
        if (e.results[i].isFinal) done += chunk; else interim += chunk;
      }
      if (done) onText(done.trim(), true);
      else if (interim) onText(interim.trim(), false);
    };
    rec.onerror = onEnd;
    rec.onend = onEnd;
    rec.start();
    return rec;
  }

  /** Small mic attached to a specific textarea in the brief. */
  function dictateButton(target: HTMLTextAreaElement, key: string) {
    const btn = el("button", "bf-mic-small") as HTMLButtonElement;
    btn.type = "button";
    btn.title = "Dictate";
    btn.setAttribute("aria-label", "Dictate this answer");
    btn.innerHTML = MIC_SVG;

    let rec: any = null;
    let base = "";
    btn.addEventListener("click", () => {
      if (rec) { rec.stop(); return; }
      base = target.value;
      btn.classList.add("is-live");
      rec = listen(
        (text, final) => {
          target.value = (base ? base.replace(/\s*$/, " ") : "") + text;
          if (final) base = target.value;
          (state as unknown as Record<string, unknown>)[key] = target.value;
          touched.add(key);
          onValueChange();
        },
        () => { rec = null; btn.classList.remove("is-live"); }
      );
    });
    return btn;
  }

  /* Consultant microphone — speak a whole brief in one go. */
  let conRec: any = null;
  if (speechAvailable()) {
    micBtn.addEventListener("click", () => {
      if (conRec) { conRec.stop(); return; }
      micBtn.classList.add("is-live");
      conStatus.textContent = "Listening — speak naturally, then press the mic again";
      let base = "";
      conRec = listen(
        (text, final) => {
          conField.value = (base ? base + " " : "") + text;
          if (final) base = conField.value;
          conField.style.height = "auto";
          conField.style.height = `${Math.min(conField.scrollHeight, 120)}px`;
        },
        () => {
          conRec = null;
          micBtn.classList.remove("is-live");
          conStatus.textContent = "Type, or hold the microphone to talk";
          if (conField.value.trim()) void send(conField.value);
        }
      );
    });
  } else {
    micBtn.hidden = true;
    conStatus.textContent = "Type your answer — this browser doesn't support voice input";
  }

  /* ── Booking (optional, inline) ───────────────────────────── */

  /* Markup ships it checked, so honour that on load rather than assuming. */
  bookBody.hidden = !bookToggle.checked;

  bookToggle.addEventListener("change", () => {
    bookBody.hidden = !bookToggle.checked;
    if (!bookToggle.checked) state.slot = null;
    onValueChange();
    if (bookToggle.checked) bookBody.scrollIntoView({ behavior: "smooth", block: "nearest" });
  });

  window.addEventListener("funnel:slot", (e) => {
    state.slot = (e as CustomEvent).detail;
    onValueChange();
  });

  /* ── Sending ──────────────────────────────────────────────── */

  sendBtn.addEventListener("click", async () => {
    if (sent || sendBtn.disabled) return;
    const visible = visibleFields();
    const out = buildExport(state, visible);

    sendBtn.disabled = true;
    sendLabel.textContent = "Sending…";

    let ok = true;
    if (opts.endpoint) {
      try {
        const res = await fetch(opts.endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(out.payload),
        });
        ok = res.ok;
      } catch {
        ok = false;
      }
    }

    sent = true;
    formPanel.hidden = true;
    donePanel.hidden = false;

    const whenEl = donePanel.querySelector<HTMLElement>("[data-done-when]")!;
    const summaryEl = donePanel.querySelector<HTMLElement>("[data-done-summary]")!;
    const warnEl = donePanel.querySelector<HTMLElement>("[data-done-warn]")!;

    whenEl.textContent = state.slot
      ? `${state.slot.when} · ${state.slot.meeting}`
      : "We'll reply by email, usually within one working day.";

    summaryEl.textContent = out.markdown;
    warnEl.hidden = ok;
    if (!ok) {
      warnEl.textContent =
        `We couldn't reach our inbox just now. Copy the brief below and email it to ${opts.email} — nothing you typed is lost.`;
    }

    try { sessionStorage.removeItem(STORE_KEY); } catch { /* ignore */ }
    donePanel.scrollIntoView({ behavior: "smooth", block: "start" });
  });

  donePanel.querySelector("[data-copy]")?.addEventListener("click", async () => {
    const text = donePanel.querySelector<HTMLElement>("[data-done-summary]")?.textContent ?? "";
    try {
      await navigator.clipboard.writeText(text);
      const btn = donePanel.querySelector<HTMLElement>("[data-copy]")!;
      const was = btn.textContent;
      btn.textContent = "Copied";
      setTimeout(() => { btn.textContent = was; }, 1600);
    } catch { /* clipboard blocked */ }
  });

  /* ── Boot ─────────────────────────────────────────────────── */

  const first = consultant.greet();
  say("consultant", first.reply);
  showChips(first.chips);
  state.transcript = [];       // the greeting isn't part of what they told us
  render();

  /* A brief restored from a refresh is already theirs — mark it as edited by
     hand so the consultant treats it as settled rather than filling over it. */
  for (const key of visibleFields()) {
    if (isAnswered(state, key as AnswerKey)) touched.add(key);
  }
}

const MIC_SVG =
  '<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3z"/><path d="M19 10v2a7 7 0 0 1-14 0v-2"/><path d="M12 19v3"/></svg>';

export { MIC_SVG };
