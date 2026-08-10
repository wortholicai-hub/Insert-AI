/**
 * ─────────────────────────────────────────────────────────────
 *  BOOKING FUNNEL — single source of truth.
 *
 *  Seven steps. Every option list below is either fixed or derived from an
 *  earlier answer, so a visitor never sees a choice that doesn't apply to
 *  them. The AI assistant's field contract is generated from the same data,
 *  so the model can't emit a value the funnel doesn't accept.
 * ─────────────────────────────────────────────────────────────
 */

export interface Option {
  value: string;
  label: string;
  desc?: string;
}

/* ── Step 1 · What are you looking for? ─────────────────────── */

export const goals: Option[] = [
  { value: "build", label: "Build something new", desc: "A product, platform or internal system that doesn't exist yet." },
  { value: "ai", label: "Add AI to my business", desc: "Agents, assistants, voice, or intelligence over your documents." },
  { value: "automate", label: "Automate manual work", desc: "Remove the repetitive steps your team does by hand." },
  { value: "integrate", label: "Connect my tools", desc: "Make the systems you already run talk to each other." },
  { value: "improve", label: "Improve what we already run", desc: "Fix, scale or extend something that's already live." },
  { value: "advice", label: "I'm not sure yet", desc: "Describe the problem and we'll recommend the approach." },
];

/* ── Step 2 · Services, filtered by the step 1 answer ───────── */

export const servicesByGoal: Record<string, Option[]> = {
  build: [
    { value: "web-app", label: "Web application" },
    { value: "saas", label: "SaaS platform" },
    { value: "mobile-app", label: "Mobile app" },
    { value: "dashboard", label: "Internal dashboard" },
    { value: "custom-software", label: "Custom software" },
    { value: "ecommerce", label: "E-commerce platform" },
    { value: "api-backend", label: "API & backend" },
    { value: "mvp", label: "MVP / prototype" },
  ],
  ai: [
    { value: "ai-agents", label: "AI agents" },
    { value: "ai-chat", label: "AI chat assistant" },
    { value: "voice-ai", label: "Voice AI" },
    { value: "rag", label: "Knowledge base / RAG" },
    { value: "doc-ai", label: "Document processing" },
    { value: "ai-in-product", label: "AI inside our product" },
    { value: "predictive", label: "Predictive analytics" },
  ],
  automate: [
    { value: "workflow", label: "Workflow automation" },
    { value: "crm-automation", label: "CRM automation" },
    { value: "lead-routing", label: "Lead capture & routing" },
    { value: "data-entry", label: "Data entry & documents" },
    { value: "reporting", label: "Reporting & dashboards" },
    { value: "support-automation", label: "Customer support automation" },
  ],
  integrate: [
    { value: "crm-integration", label: "CRM integration" },
    { value: "api-integration", label: "API integration" },
    { value: "payments", label: "Payments & billing" },
    { value: "data-sync", label: "Data sync between tools" },
    { value: "ai-integration", label: "Third-party AI integration" },
    { value: "legacy", label: "Legacy system integration" },
  ],
  improve: [
    { value: "fix", label: "Fix & stabilise" },
    { value: "scaling", label: "Performance & scaling" },
    { value: "rebuild", label: "Redesign / rebuild" },
    { value: "add-ai", label: "Add AI features" },
    { value: "migrate", label: "Migrate stack or cloud" },
    { value: "security", label: "Security & compliance" },
  ],
  advice: [
    { value: "ai-automation", label: "AI & automation" },
    { value: "custom-software", label: "Custom software" },
    { value: "integrations", label: "Integrations" },
    { value: "data", label: "Data & analytics" },
    { value: "unsure", label: "Genuinely not sure" },
  ],
};

/* ── Step 3 · Industry ──────────────────────────────────────── */

export const industries: Option[] = [
  { value: "healthcare", label: "Healthcare" },
  { value: "real-estate", label: "Real estate" },
  { value: "ecommerce", label: "E-commerce" },
  { value: "saas", label: "SaaS & technology" },
  { value: "fintech", label: "FinTech" },
  { value: "insurance", label: "Insurance" },
  { value: "legal", label: "Legal" },
  { value: "logistics", label: "Logistics" },
  { value: "education", label: "Education" },
  { value: "marketing", label: "Marketing & agencies" },
  { value: "recruitment", label: "Recruitment & HR" },
  { value: "professional", label: "Professional services" },
  { value: "hospitality", label: "Hospitality" },
  { value: "manufacturing", label: "Manufacturing" },
];

/* ── Step 4 · Tools, shown only when existing systems matter ── */

export const tools: Option[] = [
  { value: "hubspot", label: "HubSpot" },
  { value: "salesforce", label: "Salesforce" },
  { value: "pipedrive", label: "Pipedrive" },
  { value: "slack", label: "Slack" },
  { value: "teams", label: "Microsoft Teams" },
  { value: "notion", label: "Notion" },
  { value: "airtable", label: "Airtable" },
  { value: "google-workspace", label: "Google Workspace" },
  { value: "shopify", label: "Shopify" },
  { value: "stripe", label: "Stripe" },
  { value: "quickbooks", label: "QuickBooks" },
  { value: "zapier", label: "Zapier / Make" },
  { value: "twilio", label: "Twilio" },
  { value: "aws", label: "AWS" },
  { value: "openai", label: "OpenAI / Claude" },
  { value: "own-db", label: "Our own database" },
];

/** Goals where asking about an existing stack is worth the extra step. */
export const goalsNeedingTools = ["automate", "integrate", "improve"];

/** Step 4's wording adapts to what they came for. */
export const detailPrompts: Record<string, { label: string; placeholder: string }> = {
  build: {
    label: "What are you building, and who is it for?",
    placeholder: "For example: a portal where our 400 franchisees submit weekly sales figures and see their performance against target. Today it's a spreadsheet emailed around every Monday.",
  },
  ai: {
    label: "What should the AI do, and what does it need to know?",
    placeholder: "For example: answer customer questions about order status and returns, using our help centre and Shopify order data. It handles about 300 tickets a week today.",
  },
  automate: {
    label: "What does your team do by hand today?",
    placeholder: "For example: three people copy new leads from email and our web form into HubSpot. It takes about 15 hours a week and leads often go cold before anyone follows up.",
  },
  integrate: {
    label: "Which systems need to talk, and what should move between them?",
    placeholder: "For example: orders from Shopify need to reach our warehouse system and QuickBooks automatically. Right now someone re-enters them twice a day.",
  },
  improve: {
    label: "What's running today, and what isn't working?",
    placeholder: "For example: a Laravel app built four years ago by an agency we no longer work with. It slows to a crawl above 200 concurrent users and we can't add features safely.",
  },
  advice: {
    label: "What problem are you trying to solve?",
    placeholder: "Describe it however you like — what's happening today, who it affects, and what you wish were different.",
  },
};

/* ── Step 5 · Timeline & budget ─────────────────────────────── */

export const timelines: Option[] = [
  { value: "asap", label: "As soon as possible" },
  { value: "1-month", label: "Within a month" },
  { value: "1-3-months", label: "In 1 – 3 months" },
  { value: "3-6-months", label: "In 3 – 6 months" },
  { value: "exploring", label: "Just exploring for now" },
];

export const budgets: Option[] = [
  { value: "under-10k", label: "Under $10k" },
  { value: "10-25k", label: "$10k – $25k" },
  { value: "25-50k", label: "$25k – $50k" },
  { value: "50-100k", label: "$50k – $100k" },
  { value: "100k-plus", label: "$100k+" },
  { value: "unsure", label: "Not sure yet" },
];

/* ── Step 6 · Contact ───────────────────────────────────────── */

export const companySizes: Option[] = [
  { value: "solo", label: "Just me" },
  { value: "2-10", label: "2 – 10" },
  { value: "11-50", label: "11 – 50" },
  { value: "51-200", label: "51 – 200" },
  { value: "200-plus", label: "200+" },
];

/* ── Step 7 · Meeting length, recommended from the answers ──── */

export const meetingTypes = [
  { id: "intro", label: "Intro call", mins: 30, desc: "A first conversation about what you need." },
  { id: "detail", label: "Detailed review", mins: 45, desc: "A deeper look at scope, approach and cost." },
];

/** Bigger or vaguer projects get the longer slot suggested by default. */
export const longCallBudgets = ["50-100k", "100k-plus"];
export const longCallGoals = ["build", "improve", "advice"];

/* ── Human-readable labels for the summary and confirmation ─── */

export const stepTitles = [
  "What you're looking for",
  "Services",
  "Industry",
  "Project details",
  "Timeline & budget",
  "Your details",
  "Date & time",
];

/* ── AI assistant system instruction ────────────────────────── */

function optionList(opts: Option[]) {
  return opts.map((o) => o.value).join(" | ");
}

export const AI_SYSTEM_PROMPT = `You are the booking assistant for InsertAI — an AI, automation and software development company. You sit beside a seven-step booking funnel on the Contact page and your job is to complete it on the visitor's behalf.

# Your job
Have a short, plain-spoken conversation, then fill in the funnel so the visitor only has to check the answers and choose a time. A good outcome is a completed funnel in four or five exchanges.

You do one thing only: understand the project and fill in the funnel. You are not a support bot or a general assistant.

# How to talk
- Clear, friendly and professional. Plain English — no jargon, no marketing language, no emoji.
- ONE question per message. Never stack two questions.
- Two short sentences maximum, plus the question. No preambles like "Great question!", and don't summarise what they just said.
- Assume no technical knowledge unless they show it. Match their level.
- Never ask for something they've already told you or that is already filled in (you are given the current funnel state on every turn).
- If an answer is vague ("we need AI"), ask what someone on their team does manually today, or what isn't working.
- If they ask about cost, say honestly that it depends on scope, note that most projects fall between $10k and $100k, and move on. Never quote a firm price.
- If they go off-topic, answer in one line and return to the funnel.

# Conversation order
Open by asking what they'd like to build, automate or improve — nothing else. Then work through, skipping anything you already know:
1. The problem in practical terms — what happens today, who does it, how often.
2. Their industry, if it isn't obvious from what they've said.
3. Which tools or systems are involved (only if relevant to their goal).
4. When they'd like to start, then their budget range. Ask these last; asking early ends conversations.
5. Name, work email and company.

Once every required field is filled, stop asking questions. Tell them their answers are ready to review and that they can choose a time.

# Filling the funnel
After every user message, call the tool \`update_funnel\` with ONLY the fields you learned or corrected in that message. Never resend unchanged fields. Never guess — if a value isn't clearly supported by what they said, leave it out and ask instead.

Field contract (exact keys and allowed values — nothing else is valid):
- goal (one of: ${optionList(goals)}) [required] — what they're looking for
- services (array) [required] — allowed values depend on \`goal\`:
${Object.entries(servicesByGoal).map(([g, o]) => `    · goal "${g}" → ${optionList(o)}`).join("\n")}
- industries (array) — ${optionList(industries)}
- details (string, 2–4 sentences in their own words) [required] — the project description
- tools (array) — ${optionList(tools)}. Only relevant when goal is ${goalsNeedingTools.join(", ")}.
- timeline (one of: ${optionList(timelines)}) [required]
- budget (one of: ${optionList(budgets)}) [required]
- name (string) [required]
- email (string) [required]
- company (string) [required]
- companySize (one of: ${optionList(companySizes)})

Rules for extraction:
- \`services\` values MUST come from the list matching the \`goal\` you set. If you change \`goal\`, re-select \`services\` from the new list.
- \`industries\` and \`tools\` accept custom free-text values when nothing in the list fits — send the plain label, e.g. "Veterinary clinics". Use a listed value whenever one applies.
- \`details\`: write 2–4 clear sentences using their own specifics. Don't embellish and don't add benefits they didn't mention.
- \`timeline\` / \`budget\`: only set these when they actually say something. "We don't know yet" maps to \`exploring\` / \`unsure\` — that is a real answer, record it.
- \`goal\`: infer from intent — something new is \`build\`, anything with agents, chat, voice or document AI is \`ai\`, removing manual steps is \`automate\`, joining systems is \`integrate\`, fixing something live is \`improve\`.
- If a visitor corrects something you filled, overwrite it and acknowledge in four words or fewer.
- Never overwrite a field the visitor has edited themselves unless they explicitly change it in conversation.

# Boundaries
- Never promise delivery dates, team size, or a fixed price.
- Never say a meeting is booked — only the calendar does that.
- Don't ask for passwords, API keys, card details or anything confidential. If offered, say to save it for the call.
- If asked how you work, say plainly that you're an assistant that fills in the form so their call starts with context.`;
