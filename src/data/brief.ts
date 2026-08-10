/**
 * ─────────────────────────────────────────────────────────────
 *  PROJECT BRIEF — single source of truth.
 *
 *  Every question, option, conditional rule and piece of copy in the
 *  contact experience is declared here. The renderer, the understanding
 *  engine and the team export all read from this file, so a question can
 *  never drift out of sync with the value it accepts.
 *
 *  Two ideas run through the whole schema:
 *
 *   1. Almost nothing is required. Only `name`, `email` and one sentence
 *      of context are. Everything else carries `optional: true` and says
 *      so on screen — a visitor who only wants an answer can leave in
 *      twenty seconds, and one with a real project can keep going.
 *
 *   2. A field is only ever shown when its `when()` returns true. Nobody
 *      sees a procurement question unless they said "government", and
 *      nobody sees a model-hosting question unless they asked for AI.
 * ─────────────────────────────────────────────────────────────
 */

export interface Opt {
  value: string;
  label: string;
  desc?: string;
}

/** The answers, as held in memory. Keys match every `Field.key` below. */
export interface BriefState {
  /* Part 1 — what they need */
  intent: string;
  builds: string[];
  pitch: string;
  /* Part 2 — the situation */
  problem: string;
  industries: string[];
  systems: string[];
  users: string;
  /* Part 3 — shape */
  projectType: string;
  duration: string;
  budget: string;
  businessSize: string;
  startWhen: string;
  /* Part 3b — conditional on projectType */
  govLevel: string;
  govProcurement: string;
  govFunding: string;
  govApproval: string;
  entProcurement: string[];
  entSignoff: string;
  npFunding: string;
  npDeadline: string;
  startupStage: string;
  startupGoal: string;
  internalDept: string;
  strategicShape: string;
  /* Part 4 — requirements */
  integrations: string[];
  aiNeeds: string[];
  technical: string[];
  compliance: string[];
  dataSensitivity: string;
  successCriteria: string;
  constraints: string;
  stakeholders: string;
  /* Part 5 — contact */
  name: string;
  email: string;
  company: string;
  phone: string;
  role: string;
  /* Meeting */
  slot: { iso: string; when: string; timezone: string; meeting: string; mins: number } | null;
  /* Captured, not asked */
  transcript: { role: "you" | "consultant"; text: string }[];
}

/**
 * The keys that hold an *answer* — everything except the meeting slot and
 * the transcript, which are captured rather than asked. Generic code
 * (rendering, scoring, export) works over these, so `s[key]` is always
 * `string | string[]` and never needs a cast.
 */
export type AnswerKey = Exclude<keyof BriefState, "slot" | "transcript">;

export const emptyBrief = (): BriefState => ({
  intent: "", builds: [], pitch: "",
  problem: "", industries: [], systems: [], users: "",
  projectType: "", duration: "", budget: "", businessSize: "", startWhen: "",
  govLevel: "", govProcurement: "", govFunding: "", govApproval: "",
  entProcurement: [], entSignoff: "",
  npFunding: "", npDeadline: "",
  startupStage: "", startupGoal: "",
  internalDept: "", strategicShape: "",
  integrations: [], aiNeeds: [], technical: [], compliance: [],
  dataSensitivity: "", successCriteria: "", constraints: "", stakeholders: "",
  name: "", email: "", company: "", phone: "", role: "",
  slot: null, transcript: [],
});

/* ══ Option lists ═══════════════════════════════════════════ */

/** Part 1 · why they're here. Drives which later parts appear at all. */
export const intents: Opt[] = [
  { value: "build", label: "Build something new", desc: "A product, platform or system that doesn't exist yet." },
  { value: "ai", label: "Add AI to my business", desc: "Agents, assistants, voice, or intelligence over our documents." },
  { value: "automate", label: "Automate manual work", desc: "Remove the repetitive steps the team does by hand." },
  { value: "integrate", label: "Connect our tools", desc: "Make the systems we already run talk to each other." },
  { value: "improve", label: "Fix or scale what we run", desc: "Something is live and it isn't holding up." },
  { value: "advice", label: "I'm exploring options", desc: "I know the problem, not the solution. Point me somewhere." },
];

/** Part 1 · what to build. Shown for every intent — the list is the prompt. */
export const buildTypes: Opt[] = [
  { value: "ai-automation", label: "AI automation", desc: "Decisions and steps handled without a person" },
  { value: "ai-agent", label: "AI agent", desc: "Takes actions across your systems on its own" },
  { value: "voice-ai", label: "Voice AI", desc: "Inbound or outbound calls that do real work" },
  { value: "workflow-automation", label: "Workflow automation", desc: "Rules-based, end to end, no hand-offs" },
  { value: "custom-saas", label: "Custom SaaS", desc: "A multi-tenant product you sell" },
  { value: "web-app", label: "Web application", desc: "A portal or app built around your logic" },
  { value: "mobile-app", label: "Mobile application", desc: "iOS, Android, or both" },
  { value: "internal-tool", label: "Internal business tool", desc: "Something only your team uses" },
  { value: "data-platform", label: "Data / analytics platform", desc: "Pipelines, warehouse, dashboards" },
  { value: "integration", label: "Systems integration", desc: "Joining tools that don't speak to each other" },
  { value: "ai-in-product", label: "AI inside our product", desc: "Features for your own customers" },
  { value: "not-sure", label: "Not sure — advise me", desc: "Describe the problem, we'll name the shape" },
];

export const industries: Opt[] = [
  { value: "healthcare", label: "Healthcare" },
  { value: "fintech", label: "FinTech & banking" },
  { value: "insurance", label: "Insurance" },
  { value: "real-estate", label: "Real estate" },
  { value: "ecommerce", label: "E-commerce & retail" },
  { value: "saas", label: "SaaS & technology" },
  { value: "legal", label: "Legal" },
  { value: "logistics", label: "Logistics & supply chain" },
  { value: "manufacturing", label: "Manufacturing" },
  { value: "education", label: "Education" },
  { value: "government", label: "Public sector" },
  { value: "nonprofit", label: "Non-profit" },
  { value: "marketing", label: "Marketing & agencies" },
  { value: "recruitment", label: "Recruitment & HR" },
  { value: "professional", label: "Professional services" },
  { value: "hospitality", label: "Hospitality & travel" },
  { value: "energy", label: "Energy & utilities" },
  { value: "construction", label: "Construction & trades" },
];

export const systems: Opt[] = [
  { value: "salesforce", label: "Salesforce" },
  { value: "hubspot", label: "HubSpot" },
  { value: "pipedrive", label: "Pipedrive" },
  { value: "dynamics", label: "Microsoft Dynamics" },
  { value: "sap", label: "SAP" },
  { value: "netsuite", label: "NetSuite" },
  { value: "quickbooks", label: "QuickBooks" },
  { value: "xero", label: "Xero" },
  { value: "shopify", label: "Shopify" },
  { value: "stripe", label: "Stripe" },
  { value: "slack", label: "Slack" },
  { value: "teams", label: "Microsoft Teams" },
  { value: "google-workspace", label: "Google Workspace" },
  { value: "m365", label: "Microsoft 365" },
  { value: "notion", label: "Notion" },
  { value: "airtable", label: "Airtable" },
  { value: "monday", label: "Monday / Asana / ClickUp" },
  { value: "zendesk", label: "Zendesk / Intercom" },
  { value: "twilio", label: "Twilio" },
  { value: "zapier", label: "Zapier / Make" },
  { value: "aws", label: "AWS" },
  { value: "azure", label: "Azure" },
  { value: "gcp", label: "Google Cloud" },
  { value: "own-db", label: "Our own database" },
  { value: "legacy", label: "A legacy in-house system" },
  { value: "spreadsheets", label: "Spreadsheets, mostly" },
  { value: "none", label: "Nothing yet — greenfield" },
];

/** Deliberately separate from `systems`: what it must *talk to*, not what they run. */
export const integrations: Opt[] = [
  { value: "crm", label: "Our CRM" },
  { value: "erp", label: "ERP / finance system" },
  { value: "payments", label: "Payments & billing" },
  { value: "email-cal", label: "Email & calendar" },
  { value: "telephony", label: "Phone system" },
  { value: "helpdesk", label: "Helpdesk / ticketing" },
  { value: "ecommerce-plat", label: "E-commerce platform" },
  { value: "warehouse", label: "Warehouse / inventory" },
  { value: "hris", label: "HR & payroll" },
  { value: "docs", label: "Document storage" },
  { value: "esign", label: "E-signature" },
  { value: "bi", label: "BI / reporting" },
  { value: "sso", label: "SSO / identity provider" },
  { value: "custom-api", label: "A custom internal API" },
  { value: "third-party-api", label: "A third-party API" },
  { value: "none-yet", label: "Nothing — it stands alone" },
];

export const aiCapabilities: Opt[] = [
  { value: "chat", label: "Chat assistant" },
  { value: "voice", label: "Voice calls" },
  { value: "rag", label: "Answers from our documents" },
  { value: "doc-extract", label: "Reading & extracting from documents" },
  { value: "classify", label: "Classifying or routing" },
  { value: "summarise", label: "Summarising" },
  { value: "draft", label: "Drafting replies or content" },
  { value: "agentic", label: "Taking actions in our systems" },
  { value: "predict", label: "Forecasting & prediction" },
  { value: "search", label: "Semantic search" },
  { value: "vision", label: "Images or video" },
  { value: "translate", label: "Translation" },
  { value: "human-loop", label: "Human review before it acts" },
  { value: "not-sure-ai", label: "Not sure — advise us" },
];

export const technical: Opt[] = [
  { value: "sso", label: "SSO / SAML login" },
  { value: "rbac", label: "Roles & permissions" },
  { value: "multi-tenant", label: "Multi-tenant" },
  { value: "offline", label: "Works offline" },
  { value: "realtime", label: "Real-time updates" },
  { value: "high-volume", label: "High volume / high throughput" },
  { value: "white-label", label: "White-label" },
  { value: "api", label: "A public API" },
  { value: "on-prem", label: "On-premise or private cloud" },
  { value: "data-residency", label: "Data must stay in a region" },
  { value: "migration", label: "Migrating existing data" },
  { value: "accessibility", label: "Accessibility (WCAG)" },
  { value: "i18n", label: "Multiple languages" },
  { value: "audit-log", label: "Full audit trail" },
];

export const compliance: Opt[] = [
  { value: "soc2", label: "SOC 2" },
  { value: "hipaa", label: "HIPAA" },
  { value: "gdpr", label: "GDPR" },
  { value: "ccpa", label: "CCPA / CPRA" },
  { value: "pci", label: "PCI DSS" },
  { value: "iso27001", label: "ISO 27001" },
  { value: "fedramp", label: "FedRAMP" },
  { value: "stateramp", label: "StateRAMP" },
  { value: "cjis", label: "CJIS" },
  { value: "nist", label: "NIST 800-171 / CMMC" },
  { value: "ferpa", label: "FERPA" },
  { value: "section508", label: "Section 508 / WCAG" },
  { value: "sox", label: "SOX" },
  { value: "none", label: "None that we know of" },
  { value: "unsure", label: "Not sure — need advice" },
];

export const projectTypes: Opt[] = [
  { value: "commercial", label: "Commercial", desc: "A business paying for a business outcome." },
  { value: "enterprise", label: "Enterprise", desc: "Procurement, security review and legal are involved." },
  { value: "government", label: "Government / public sector", desc: "Federal, state, local or an agency." },
  { value: "nonprofit", label: "Non-profit / NGO", desc: "Grant, donor or restricted funding." },
  { value: "internal", label: "Internal company project", desc: "Built for our own teams, not customers." },
  { value: "startup", label: "Startup", desc: "Pre-launch or early, moving fast." },
  { value: "strategic", label: "Long-term strategic initiative", desc: "Multi-phase, ongoing partnership." },
  { value: "other", label: "Something else" },
];

/** Exactly the ranges asked for — long engagements are first-class here. */
export const durations: Opt[] = [
  { value: "under-1m", label: "Less than 1 month" },
  { value: "1-3m", label: "1 – 3 months" },
  { value: "3-6m", label: "3 – 6 months" },
  { value: "6-12m", label: "6 – 12 months" },
  { value: "1-2y", label: "1 – 2 years" },
  { value: "multi-year", label: "Multi-year / ongoing" },
  { value: "unsure", label: "Not sure yet" },
];

export const startWhens: Opt[] = [
  { value: "now", label: "Immediately" },
  { value: "1m", label: "Within a month" },
  { value: "quarter", label: "This quarter" },
  { value: "6m", label: "Within 6 months" },
  { value: "next-year", label: "Next budget year" },
  { value: "scoping", label: "Still scoping" },
];

/** Reaches high enough for multi-year and retained work. */
export const budgets: Opt[] = [
  { value: "under-10k", label: "Under $10k" },
  { value: "10-25k", label: "$10k – $25k" },
  { value: "25-50k", label: "$25k – $50k" },
  { value: "50-100k", label: "$50k – $100k" },
  { value: "100-250k", label: "$100k – $250k" },
  { value: "250-500k", label: "$250k – $500k" },
  { value: "500k-plus", label: "$500k+" },
  { value: "retainer", label: "Ongoing monthly retainer" },
  { value: "unsure", label: "Not sure yet" },
  { value: "guide-me", label: "Tell me what this usually costs" },
];

export const businessSizes: Opt[] = [
  { value: "solo", label: "Just me" },
  { value: "2-10", label: "2 – 10" },
  { value: "11-50", label: "11 – 50" },
  { value: "51-200", label: "51 – 200" },
  { value: "201-1000", label: "201 – 1,000" },
  { value: "1000-plus", label: "1,000+" },
];

export const userCounts: Opt[] = [
  { value: "under-10", label: "Under 10" },
  { value: "10-100", label: "10 – 100" },
  { value: "100-1k", label: "100 – 1,000" },
  { value: "1k-10k", label: "1,000 – 10,000" },
  { value: "10k-plus", label: "10,000+" },
  { value: "unknown", label: "Don't know yet" },
];

export const dataSensitivities: Opt[] = [
  { value: "public", label: "Public / non-sensitive" },
  { value: "internal", label: "Internal business data" },
  { value: "personal", label: "Personal data (customers, staff)" },
  { value: "regulated", label: "Regulated (health, financial, legal)" },
  { value: "classified", label: "Classified / controlled" },
];

/* ══ Conditional option sets ════════════════════════════════ */

export const govLevels: Opt[] = [
  { value: "federal", label: "Federal / national" },
  { value: "state", label: "State / provincial" },
  { value: "local", label: "Local / municipal" },
  { value: "agency", label: "Agency or authority" },
  { value: "defence", label: "Defence / public safety" },
  { value: "edu-public", label: "Public education" },
];

export const govProcurements: Opt[] = [
  { value: "not-started", label: "Haven't started — exploring" },
  { value: "market-research", label: "Market research / RFI stage" },
  { value: "rfp", label: "RFP or RFQ is coming" },
  { value: "rfp-open", label: "An RFP is open now" },
  { value: "vehicle", label: "We have a contract vehicle" },
  { value: "sole-source", label: "Sole-source possible" },
  { value: "under-threshold", label: "Under the bid threshold" },
];

export const govFundings: Opt[] = [
  { value: "appropriated", label: "Funded and appropriated" },
  { value: "grant", label: "Grant-funded" },
  { value: "requested", label: "Requested, awaiting approval" },
  { value: "next-cycle", label: "Next budget cycle" },
  { value: "unfunded", label: "Not funded yet" },
];

export const govApprovals: Opt[] = [
  { value: "dept-head", label: "Department head" },
  { value: "cio", label: "CIO / IT governance" },
  { value: "board", label: "Board or council vote" },
  { value: "legal", label: "Legal & procurement review" },
  { value: "multi", label: "Several of the above" },
];

export const entProcurements: Opt[] = [
  { value: "security-review", label: "Security review" },
  { value: "legal", label: "Legal & contract review" },
  { value: "vendor-onboard", label: "Vendor onboarding" },
  { value: "msa", label: "MSA already in place" },
  { value: "insurance", label: "Insurance & indemnity" },
  { value: "dpa", label: "Data processing agreement" },
  { value: "pen-test", label: "Penetration test evidence" },
  { value: "none-ent", label: "None — we can just start" },
];

export const entSignoffs: Opt[] = [
  { value: "me", label: "Me" },
  { value: "my-manager", label: "My manager" },
  { value: "exec", label: "An executive sponsor" },
  { value: "committee", label: "A committee or board" },
  { value: "unclear", label: "Not yet clear" },
];

export const npFundings: Opt[] = [
  { value: "operating", label: "Operating budget" },
  { value: "grant-secured", label: "Grant already secured" },
  { value: "grant-applying", label: "Applying for a grant" },
  { value: "donor", label: "A specific donor" },
  { value: "seeking", label: "Still seeking funding" },
];

export const startupStages: Opt[] = [
  { value: "idea", label: "Idea stage" },
  { value: "pre-seed", label: "Pre-seed / bootstrapped" },
  { value: "seed", label: "Seed funded" },
  { value: "series-a", label: "Series A+" },
  { value: "revenue", label: "Revenue-generating" },
];

export const startupGoals: Opt[] = [
  { value: "mvp", label: "MVP to test the market" },
  { value: "demo", label: "Something to show investors" },
  { value: "first-customers", label: "Ready for first paying customers" },
  { value: "scale", label: "Scale what already works" },
];

export const strategicShapes: Opt[] = [
  { value: "phased", label: "Phased programme with milestones" },
  { value: "dedicated", label: "A dedicated ongoing team" },
  { value: "roadmap", label: "Roadmap partner, scope evolves" },
  { value: "transformation", label: "Company-wide transformation" },
];

/* ══ Field & section schema ═════════════════════════════════ */

type When = (s: BriefState) => boolean;

export type Field =
  | { kind: "chips"; key: AnswerKey; label: string; hint?: string; options: Opt[]; multi: boolean; cards?: boolean; custom?: boolean; optional?: boolean; when?: When }
  | { kind: "text"; key: AnswerKey; label: string; hint?: string; placeholder?: string; rows?: number; optional?: boolean; voice?: boolean; when?: When }
  | { kind: "input"; key: AnswerKey; label: string; hint?: string; placeholder?: string; type?: string; autocomplete?: string; optional?: boolean; half?: boolean; when?: When };

export interface Section {
  id: string;
  eyebrow: string;
  title: string;
  blurb: string;
  fields: Field[];
  when?: When;
}

/** True once they've told us enough that later parts are worth showing. */
const started: When = (s) => !!(s.intent || s.builds.length || s.pitch.trim().length > 12);

/** Anything AI-shaped, whether they said it or picked it. */
const wantsAi: When = (s) =>
  s.intent === "ai" ||
  s.builds.some((b) => ["ai-automation", "ai-agent", "voice-ai", "ai-in-product"].includes(b));

const isSoftwareBuild: When = (s) =>
  s.builds.some((b) => ["custom-saas", "web-app", "mobile-app", "internal-tool", "data-platform", "ai-in-product"].includes(b)) ||
  s.intent === "build";

/** Regulated industries get the compliance block without having to ask for it. */
const sensitive: When = (s) =>
  ["government", "enterprise", "nonprofit"].includes(s.projectType) ||
  s.industries.some((i) => ["healthcare", "fintech", "insurance", "legal", "government", "education"].includes(i)) ||
  ["regulated", "classified", "personal"].includes(s.dataSensitivity);

export const sections: Section[] = [
  {
    id: "need",
    eyebrow: "Part 1",
    title: "What do you need?",
    blurb: "Pick whatever is closest. You can change it at any point, and the questions below will follow along.",
    fields: [
      { kind: "chips", key: "intent", label: "What brings you here?", options: intents, multi: false, cards: true },
      {
        kind: "chips", key: "builds", label: "What are you looking to build?",
        hint: "Choose as many as apply — or none, if you'd rather just describe it.",
        options: buildTypes, multi: true, custom: true, optional: true, when: started,
      },
      {
        kind: "text", key: "pitch", label: "Describe it in your own words",
        hint: "One or two sentences is plenty. This is the part we actually read.",
        placeholder: "For example: we need an AI support assistant that answers order questions from our help centre and Shopify data, and hands anything unusual to a person.",
        rows: 4, voice: true,
      },
    ],
  },
  {
    id: "situation",
    eyebrow: "Part 2",
    title: "Where you are today",
    blurb: "Context beats specification. What happens now tells us more than a feature list does.",
    when: started,
    fields: [
      {
        kind: "text", key: "problem", label: "What happens today, and what's wrong with it?",
        hint: "Who does the work, how often, and where it breaks down.",
        placeholder: "For example: three people copy leads from email into HubSpot by hand. Around 15 hours a week, and leads go cold before anyone follows up.",
        rows: 4, optional: true, voice: true,
      },
      { kind: "chips", key: "industries", label: "What industry are you in?", options: industries, multi: true, custom: true, optional: true },
      {
        kind: "chips", key: "systems", label: "What are you running today?",
        hint: "The systems already in place — we'd rather work with them than around them.",
        options: systems, multi: true, custom: true, optional: true,
      },
      { kind: "chips", key: "users", label: "How many people will use this?", options: userCounts, multi: false, optional: true },
    ],
  },
  {
    id: "shape",
    eyebrow: "Part 3",
    title: "The shape of the project",
    blurb: "This is what tells us who should be on the call and how to scope it properly.",
    when: started,
    fields: [
      { kind: "chips", key: "projectType", label: "What kind of project is this?", options: projectTypes, multi: false, cards: true, optional: true },

      /* ── Government follow-ups ───────────────────────────── */
      { kind: "chips", key: "govLevel", label: "Which level of government?", options: govLevels, multi: false, optional: true, when: (s) => s.projectType === "government" },
      { kind: "chips", key: "govProcurement", label: "Where are you in procurement?", hint: "It changes how we can respond, and how fast.", options: govProcurements, multi: false, optional: true, when: (s) => s.projectType === "government" },
      { kind: "chips", key: "govFunding", label: "Is funding in place?", options: govFundings, multi: false, optional: true, when: (s) => s.projectType === "government" },
      { kind: "chips", key: "govApproval", label: "Who has to approve it?", options: govApprovals, multi: false, optional: true, when: (s) => s.projectType === "government" },

      /* ── Enterprise follow-ups ───────────────────────────── */
      { kind: "chips", key: "entProcurement", label: "What will we need to clear?", hint: "Knowing early stops it becoming the thing that delays delivery.", options: entProcurements, multi: true, optional: true, when: (s) => s.projectType === "enterprise" },
      { kind: "chips", key: "entSignoff", label: "Who signs this off?", options: entSignoffs, multi: false, optional: true, when: (s) => s.projectType === "enterprise" },

      /* ── Non-profit follow-ups ───────────────────────────── */
      { kind: "chips", key: "npFunding", label: "How is it funded?", options: npFundings, multi: false, optional: true, when: (s) => s.projectType === "nonprofit" },
      { kind: "input", key: "npDeadline", label: "Any grant or reporting deadline we should work back from?", placeholder: "e.g. grant report due 31 March", optional: true, when: (s) => s.projectType === "nonprofit" },

      /* ── Startup follow-ups ──────────────────────────────── */
      { kind: "chips", key: "startupStage", label: "What stage are you at?", options: startupStages, multi: false, optional: true, when: (s) => s.projectType === "startup" },
      { kind: "chips", key: "startupGoal", label: "What does this need to reach?", options: startupGoals, multi: false, optional: true, when: (s) => s.projectType === "startup" },

      /* ── Internal follow-ups ─────────────────────────────── */
      { kind: "input", key: "internalDept", label: "Which team or department is it for?", placeholder: "e.g. Operations, Finance, Field service", optional: true, when: (s) => s.projectType === "internal" },

      /* ── Strategic follow-ups ────────────────────────────── */
      { kind: "chips", key: "strategicShape", label: "What shape should the engagement take?", options: strategicShapes, multi: false, optional: true, when: (s) => s.projectType === "strategic" },

      /* ── Everyone ────────────────────────────────────────── */
      { kind: "chips", key: "duration", label: "How long do you expect this to run?", hint: "A guess is fine. Long engagements are normal here.", options: durations, multi: false, optional: true },
      { kind: "chips", key: "startWhen", label: "When would you like to start?", options: startWhens, multi: false, optional: true },
      { kind: "chips", key: "budget", label: "Roughly what budget are you working with?", hint: "A range tells us what's realistic to propose. \"Tell me what this usually costs\" is a real answer.", options: budgets, multi: false, optional: true },
      { kind: "chips", key: "businessSize", label: "How big is your organisation?", options: businessSizes, multi: false, optional: true },
    ],
  },
  {
    id: "requirements",
    eyebrow: "Part 4",
    title: "Requirements",
    blurb: "All optional. Anything you add here is a question we won't have to spend the call on.",
    when: started,
    fields: [
      { kind: "chips", key: "integrations", label: "What does it need to connect to?", options: integrations, multi: true, custom: true, optional: true },
      { kind: "chips", key: "aiNeeds", label: "What should the AI actually do?", options: aiCapabilities, multi: true, optional: true, when: wantsAi },
      { kind: "chips", key: "technical", label: "Any technical requirements?", options: technical, multi: true, custom: true, optional: true, when: isSoftwareBuild },
      { kind: "chips", key: "dataSensitivity", label: "What kind of data is involved?", options: dataSensitivities, multi: false, optional: true },
      { kind: "chips", key: "compliance", label: "Any compliance or security standards?", hint: "We'd rather design for these from the start than retrofit them.", options: compliance, multi: true, custom: true, optional: true, when: sensitive },
      {
        kind: "text", key: "successCriteria", label: "How will you know this worked?",
        hint: "The number or outcome that would make this a success.",
        placeholder: "e.g. first response under 5 minutes, 15 hours a week back, no lead untouched for 24 hours.",
        rows: 3, optional: true, voice: true,
      },
      {
        kind: "text", key: "constraints", label: "Anything that could get in the way?",
        hint: "Deadlines, a system nobody can touch, a team mid-migration, a hard budget ceiling.",
        placeholder: "e.g. the ERP is being replaced in Q3 and can't change before then.",
        rows: 3, optional: true, voice: true,
      },
      { kind: "input", key: "stakeholders", label: "Who else should be in the room?", hint: "Names or roles — we'll make sure the call suits them.", placeholder: "e.g. Head of Ops, our IT lead", optional: true },
    ],
  },
  {
    id: "you",
    eyebrow: "Part 5",
    title: "Where do we send this?",
    blurb: "The only part we genuinely need. Everything above is optional.",
    fields: [
      { kind: "input", key: "name", label: "Your name", placeholder: "Jane Smith", autocomplete: "name", half: true },
      { kind: "input", key: "email", label: "Work email", placeholder: "jane@company.com", type: "email", autocomplete: "email", half: true },
      { kind: "input", key: "company", label: "Company or organisation", placeholder: "Acme Inc.", autocomplete: "organization", optional: true, half: true },
      { kind: "input", key: "role", label: "Your role", placeholder: "Head of Operations", autocomplete: "organization-title", optional: true, half: true },
      { kind: "input", key: "phone", label: "Phone", hint: "Only if you'd rather we called.", placeholder: "+1 555 010 2025", type: "tel", autocomplete: "tel", optional: true, half: true },
    ],
  },
];

/**
 * Which fields apply right now. Shared, because the renderer and the
 * consultant must agree exactly: if one thinks a question is on screen
 * and the other doesn't, the assistant either nags about something that
 * isn't there or falls silent while questions are still visible.
 */
export const visibleFields = (s: BriefState): Set<string> => {
  const set = new Set<string>();
  for (const sec of sections) {
    if (sec.when && !sec.when(s)) continue;
    for (const f of sec.fields) {
      if (f.when && !f.when(s)) continue;
      set.add(f.key as string);
    }
  }
  return set;
};

/* ══ Brief strength ═════════════════════════════════════════ */

/**
 * The meter that replaces "step 3 of 7".
 *
 * Three named thresholds, each unlocking the same submit button with a
 * different promise attached. Crossing the first one is enough to send —
 * that is the whole point. Nobody is ever blocked behind part four.
 */
export interface Tier {
  at: number;
  id: string;
  label: string;
  note: string;
  cta: string;
}

export const tiers: Tier[] = [
  { at: 0, id: "empty", label: "Nothing yet", note: "Tell us anything at all and we can take it from there.", cta: "Send to the team" },
  { at: 1, id: "reply", label: "Enough to reply", note: "We can answer you from this. Add more only if you want a sharper first call.", cta: "Send to the team" },
  { at: 45, id: "call", label: "Enough for a good call", note: "We can prepare properly and come with a point of view rather than questions.", cta: "Send and book a call" },
  { at: 78, id: "strong", label: "Strong brief", note: "This is more than most projects start with. Expect specifics on the call, not discovery.", cta: "Send and book a call" },
];

/** What each answered field contributes. Contact details are the floor, not the goal. */
const weights: Partial<Record<AnswerKey, number>> = {
  intent: 6, builds: 7, pitch: 14,
  problem: 12, industries: 4, systems: 6, users: 3,
  projectType: 5, duration: 4, budget: 5, businessSize: 2, startWhen: 3,
  integrations: 5, aiNeeds: 5, technical: 4, compliance: 4, dataSensitivity: 2,
  successCriteria: 7, constraints: 4, stakeholders: 2,
  govLevel: 2, govProcurement: 3, govFunding: 2, govApproval: 2,
  entProcurement: 3, entSignoff: 2, npFunding: 2, npDeadline: 1,
  startupStage: 2, startupGoal: 2, internalDept: 2, strategicShape: 2,
};

export const isAnswered = (s: BriefState, k: AnswerKey): boolean => {
  const v = s[k];
  if (Array.isArray(v)) return v.length > 0;
  return v.trim().length > 0;
};

/** 0–100. Only counts fields that are currently *visible* — no phantom progress. */
export const strength = (s: BriefState, visible: Set<string>): number => {
  let got = 0;
  let possible = 0;
  for (const [k, w] of Object.entries(weights) as [AnswerKey, number][]) {
    if (!visible.has(k)) continue;
    possible += w;
    if (isAnswered(s, k)) got += w;
  }
  if (!possible) return 0;
  return Math.round((got / possible) * 100);
};

export const tierFor = (score: number, canSend: boolean): Tier => {
  if (!canSend) return tiers[0];
  let hit = tiers[1];
  for (const t of tiers) if (score >= t.at && t.at > 0) hit = t;
  return hit;
};

/** The genuine floor: who you are, and one line about why. Nothing else. */
export const canSend = (s: BriefState): boolean =>
  s.name.trim().length > 1 &&
  /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.email.trim()) &&
  (s.pitch.trim().length > 10 || s.problem.trim().length > 10 || s.builds.length > 0 || !!s.intent);

/** Longer call suggested when the answers say the project warrants one. */
export const wantsLongCall = (s: BriefState): boolean =>
  ["100-250k", "250-500k", "500k-plus", "retainer"].includes(s.budget) ||
  ["1-2y", "multi-year", "6-12m"].includes(s.duration) ||
  ["government", "enterprise", "strategic"].includes(s.projectType);

/* ══ Labels, for the summary and the export ═════════════════ */

const index = (opts: Opt[]) => Object.fromEntries(opts.map((o) => [o.value, o.label]));

export const labels: Record<string, Record<string, string>> = {
  intent: index(intents), builds: index(buildTypes), industries: index(industries),
  systems: index(systems), users: index(userCounts), projectType: index(projectTypes),
  duration: index(durations), startWhen: index(startWhens), budget: index(budgets),
  businessSize: index(businessSizes), integrations: index(integrations),
  aiNeeds: index(aiCapabilities), technical: index(technical), compliance: index(compliance),
  dataSensitivity: index(dataSensitivities), govLevel: index(govLevels),
  govProcurement: index(govProcurements), govFunding: index(govFundings),
  govApproval: index(govApprovals), entProcurement: index(entProcurements),
  entSignoff: index(entSignoffs), npFunding: index(npFundings),
  startupStage: index(startupStages), startupGoal: index(startupGoals),
  strategicShape: index(strategicShapes),
};

/** Human wording for every key, used by the read-back and the team export. */
export const fieldTitles: Partial<Record<AnswerKey, string>> = {
  intent: "Looking to", builds: "Wants built", pitch: "In their words",
  problem: "Current process & pain", industries: "Industry", systems: "Current systems",
  users: "Expected users", projectType: "Project type", duration: "Expected duration",
  startWhen: "Wants to start", budget: "Budget", businessSize: "Organisation size",
  integrations: "Must integrate with", aiNeeds: "AI requirements",
  technical: "Technical requirements", compliance: "Compliance & security",
  dataSensitivity: "Data sensitivity", successCriteria: "Success criteria",
  constraints: "Constraints", stakeholders: "Other stakeholders",
  govLevel: "Government level", govProcurement: "Procurement stage",
  govFunding: "Funding status", govApproval: "Approval route",
  entProcurement: "Procurement gates", entSignoff: "Signs off",
  npFunding: "Funding source", npDeadline: "Deadline",
  startupStage: "Stage", startupGoal: "Goal", internalDept: "Department",
  strategicShape: "Engagement shape",
  name: "Name", email: "Email", company: "Company", role: "Role", phone: "Phone",
};

export const label = (key: string, value: string): string => labels[key]?.[value] ?? value;
