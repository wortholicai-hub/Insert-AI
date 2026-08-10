/**
 * ─────────────────────────────────────────────────────────────
 *  UNDERSTANDING ENGINE
 *
 *  Turns a sentence a person actually typed (or spoke) into values the
 *  brief accepts. Runs entirely in the browser: no key, no request, no
 *  latency, nothing leaves the page until they press send.
 *
 *  It reads intent, not keywords in isolation — "we don't need voice"
 *  must not select Voice AI, and "about 50k" must become a budget band
 *  rather than a user count. Every hit carries the phrase that caused it,
 *  so the interface can show its working and offer a one-tap undo.
 *
 *  The public shape here is the same one a model-backed provider returns
 *  (see lib/consultant.ts), so swapping in a hosted model changes which
 *  function is called and nothing else.
 * ─────────────────────────────────────────────────────────────
 */

import type { AnswerKey, BriefState } from "../data/brief";

export interface Hit {
  key: AnswerKey;
  value: string;
  /** The words in their message that caused it — shown in the receipt. */
  evidence: string;
}

export interface Reading {
  patch: Partial<BriefState>;
  hits: Hit[];
}

/* ── Matching helpers ───────────────────────────────────────── */

/** Word-boundary alternation. `\b` is wrong next to symbols, so guard both sides. */
const rx = (...terms: string[]) =>
  new RegExp(`(?:^|[^a-z0-9])(${terms.join("|")})(?:[^a-z0-9]|$)`, "i");

/**
 * Clauses the writer is ruling *out*. We split on these and ignore what
 * follows, so "automation yes, but no voice calls" doesn't select voice.
 */
const NEGATION = /\b(?:no|not|never|without|don'?t need|do not need|dont need|rather not|avoid|except|excluding|other than|instead of|nothing to do with)\b/i;

/** Everything before the first negation — the part they're actually asking for. */
const affirmative = (text: string) => {
  const at = text.search(NEGATION);
  return at === -1 ? text : text.slice(0, at);
};

/** Everything from the first negation on — used to *remove* values. */
const negative = (text: string) => {
  const at = text.search(NEGATION);
  return at === -1 ? "" : text.slice(at);
};

interface Rule {
  key: AnswerKey;
  value: string;
  multi: boolean;
  test: RegExp;
}

const one = (key: AnswerKey, value: string, ...terms: string[]): Rule =>
  ({ key, value, multi: false, test: rx(...terms) });
const many = (key: AnswerKey, value: string, ...terms: string[]): Rule =>
  ({ key, value, multi: true, test: rx(...terms) });

/* ── Lexicon ────────────────────────────────────────────────── */

const RULES: Rule[] = [
  /* Intent — what they want done */
  one("intent", "ai", "add ai", "use ai", "ai[- ]powered", "ai powered", "artificial intelligence", "llm", "gpt", "chatbot", "ai assistant", "ai agent"),
  one("intent", "automate", "automat\\w*", "manual process", "by hand", "repetitive", "streamline", "save time", "stop doing"),
  one("intent", "integrate", "integrat\\w*", "connect \\w+ (?:to|with)", "sync", "talk to each other", "two[- ]way", "middleware", "api between"),
  one("intent", "improve", "fix", "broken", "slow", "legacy", "rebuild", "refactor", "migrat\\w*", "scale up", "falling over", "outgrown", "technical debt"),
  one("intent", "build", "build", "develop", "create", "from scratch", "greenfield", "new (?:app|platform|product|system|tool)", "mvp"),
  one("intent", "advice", "not sure", "unsure", "no idea", "advice", "advise", "explor\\w*", "where to start", "recommend"),

  /* Build types */
  many("builds", "ai-agent", "ai agent", "agentic", "autonomous agent", "agent that", "multi[- ]agent"),
  many("builds", "voice-ai", "voice ai", "voice agent", "phone (?:agent|bot|calls?|system)", "call centre", "call center", "inbound calls?", "outbound calls?", "ivr", "receptionist"),
  many("builds", "ai-automation", "ai automation", "intelligent automation", "smart automation", "ai[- ]driven"),
  many("builds", "workflow-automation", "workflow", "business process", "bpa", "rpa", "approval flow", "handoffs?", "routing"),
  many("builds", "custom-saas", "saas (?:platform|product|app)", "build (?:a|our own) saas", "multi[- ]tenant", "subscription (?:product|platform)", "software product", "sell(?:ing)? (?:it|the software)"),
  many("builds", "web-app", "web app\\w*", "web platform", "portal", "website with", "browser[- ]based", "customer portal", "client portal"),
  many("builds", "mobile-app", "mobile app\\w*", "ios", "android", "iphone", "app store", "native app", "react native", "flutter"),
  many("builds", "internal-tool", "internal tool", "internal system", "back[- ]?office", "admin panel", "internal dashboard", "for our (?:team|staff|employees)"),
  many("builds", "data-platform", "data platform", "analytics", "dashboard", "reporting", "data warehouse", "bi\\b", "business intelligence", "etl", "pipeline", "metrics"),
  many("builds", "integration", "integration", "connector", "webhook", "api integration", "middleware"),
  many("builds", "ai-in-product", "ai (?:feature|features) (?:in|inside|for) our", "ai in our product", "embed ai", "ai for our (?:customers|users)"),

  /* AI capabilities */
  many("aiNeeds", "chat", "chatbot", "chat assistant", "chat widget", "conversational", "answer questions", "customer support", "support tickets", "service desk", "customer service"),
  many("aiNeeds", "voice", "voice", "speech", "phone call", "spoken", "transcri\\w*"),
  many("aiNeeds", "rag", "knowledge base", "our documents", "our docs", "rag", "company knowledge", "help ?cent(?:re|er)", "over our (?:content|files|pdfs)"),
  many("aiNeeds", "doc-extract", "extract", "invoices?", "receipts?", "ocr", "parse (?:documents?|pdfs?|forms?)", "data entry from", "read (?:documents?|pdfs?|contracts?)"),
  many("aiNeeds", "classify", "classif\\w*", "categoris\\w*", "categoriz\\w*", "tagging", "triage", "prioritis\\w*", "prioritiz\\w*"),
  many("aiNeeds", "summarise", "summar\\w*", "tl;?dr", "digest", "brief\\w* of"),
  many("aiNeeds", "draft", "draft\\w*", "write replies", "generate content", "compose", "copywriting", "auto[- ]reply"),
  many("aiNeeds", "agentic", "take actions?", "act on", "do things in", "update (?:the )?crm", "book (?:appointments?|meetings?)", "end[- ]to[- ]end"),
  many("aiNeeds", "predict", "predict\\w*", "forecast\\w*", "churn", "propensity", "scoring", "anomal\\w*"),
  many("aiNeeds", "search", "semantic search", "search across", "find anything", "vector search"),
  many("aiNeeds", "vision", "image\\w*", "photo\\w*", "video", "computer vision", "scan\\w* (?:photos?|images?)"),
  many("aiNeeds", "translate", "translat\\w*", "multilingual", "other languages"),
  many("aiNeeds", "human-loop", "human in the loop", "human review", "approv\\w* before", "person checks"),

  /* Existing systems */
  many("systems", "salesforce", "salesforce", "sfdc"),
  many("systems", "hubspot", "hubspot"),
  many("systems", "pipedrive", "pipedrive"),
  many("systems", "dynamics", "dynamics", "microsoft crm"),
  many("systems", "sap", "sap"),
  many("systems", "netsuite", "netsuite"),
  many("systems", "quickbooks", "quickbooks", "qbo"),
  many("systems", "xero", "xero"),
  many("systems", "shopify", "shopify"),
  many("systems", "stripe", "stripe"),
  many("systems", "slack", "slack"),
  many("systems", "teams", "microsoft teams", "ms teams"),
  many("systems", "google-workspace", "google workspace", "gsuite", "g suite", "google sheets", "gmail", "google drive"),
  many("systems", "m365", "microsoft 365", "office 365", "o365", "outlook", "sharepoint", "excel"),
  many("systems", "notion", "notion"),
  many("systems", "airtable", "airtable"),
  many("systems", "monday", "monday\\.com", "asana", "clickup", "jira", "trello"),
  many("systems", "zendesk", "zendesk", "intercom", "freshdesk", "helpscout"),
  many("systems", "twilio", "twilio"),
  many("systems", "zapier", "zapier", "make\\.com", "integromat", "n8n"),
  many("systems", "aws", "aws", "amazon web services", "ec2", "s3\\b", "lambda"),
  many("systems", "azure", "azure"),
  many("systems", "gcp", "google cloud", "gcp", "bigquery"),
  many("systems", "own-db", "our own database", "postgres", "mysql", "mongo\\w*", "sql server"),
  many("systems", "legacy", "legacy system", "old system", "in[- ]house system", "built years ago", "as ?400", "mainframe"),
  many("systems", "spreadsheets", "spreadsheets?", "excel files?", "google sheets"),
  many("systems", "none", "greenfield", "from scratch", "nothing yet", "starting fresh", "no systems?"),

  /* Integration targets */
  many("integrations", "crm", "\\bcrm\\b"),
  many("integrations", "erp", "\\berp\\b", "accounting system", "finance system"),
  many("integrations", "payments", "payments?", "billing", "invoicing", "stripe", "checkout"),
  many("integrations", "email-cal", "calendar", "email inbox", "outlook", "gmail", "scheduling"),
  many("integrations", "telephony", "phone system", "telephony", "voip", "sip"),
  many("integrations", "helpdesk", "helpdesk", "ticket\\w*", "support inbox"),
  many("integrations", "ecommerce-plat", "shopify", "woocommerce", "magento", "bigcommerce", "online store"),
  many("integrations", "warehouse", "warehouse", "inventory", "\\bwms\\b", "stock levels?", "fulfil\\w*"),
  many("integrations", "hris", "payroll", "\\bhris\\b", "\\bhr system"),
  many("integrations", "docs", "sharepoint", "google drive", "dropbox", "document storage", "file store"),
  many("integrations", "esign", "docusign", "e[- ]?sign\\w*", "signature"),
  many("integrations", "bi", "power ?bi", "tableau", "looker", "metabase"),
  many("integrations", "sso", "\\bsso\\b", "single sign[- ]on", "okta", "entra", "active directory", "\\bsaml\\b", "\\boidc\\b"),
  many("integrations", "custom-api", "our api", "internal api", "our own api"),
  many("integrations", "third-party-api", "third[- ]party api", "external api", "vendor api"),

  /* Industry */
  many("industries", "healthcare", "healthcare", "health ?care", "hospital", "clinic", "patients?", "medical", "dental", "pharma\\w*", "nhs"),
  many("industries", "fintech", "fintech", "banking", "\\bbank\\b", "lending", "loans?", "payments company", "wealth", "trading"),
  many("industries", "insurance", "insurance", "insurer", "claims", "underwrit\\w*", "broker"),
  many("industries", "real-estate", "real estate", "property", "properties", "lettings?", "realtor", "landlord", "tenants?"),
  many("industries", "ecommerce", "e[- ]?commerce", "online store", "retail", "\\bdtc\\b", "d2c", "merchandis\\w*"),
  many("industries", "saas", "\\bsaas\\b", "software company", "tech company", "startup"),
  many("industries", "legal", "law firm", "legal", "solicitors?", "attorneys?", "paralegal", "litigation", "contracts? review"),
  many("industries", "logistics", "logistics", "shipping", "freight", "haulage", "supply chain", "courier", "fleet", "3pl"),
  many("industries", "manufacturing", "manufactur\\w*", "factory", "production line", "\\bplant\\b", "\\bmrp\\b"),
  many("industries", "education", "education", "school", "universit\\w*", "college", "students?", "\\blms\\b", "training provider"),
  many("industries", "government", "government", "public sector", "council", "municipal\\w*", "federal", "state agency", "\\bdefen[cs]e\\b"),
  many("industries", "nonprofit", "non[- ]?profit", "charity", "charitable", "\\bngo\\b", "not[- ]for[- ]profit", "foundation"),
  // Not a bare "agency": "government agency" and "state agency" are public sector.
  many("industries", "marketing", "marketing", "advertis\\w*", "(?:marketing|creative|digital|ad|media|branding) agency", "agencies", "\\bseo\\b", "campaigns?"),
  many("industries", "recruitment", "recruit\\w*", "staffing", "talent", "candidates?", "\\bhr\\b", "hiring"),
  many("industries", "professional", "consult\\w*", "accountan\\w*", "professional services", "advisory"),
  many("industries", "hospitality", "hospitality", "hotel", "restaurant", "booking\\w* (?:for|system)", "travel", "tourism"),
  many("industries", "energy", "energy", "utilit\\w*", "solar", "\\bgrid\\b", "renewables?", "oil and gas"),
  many("industries", "construction", "construction", "contractors?", "builders?", "trades", "site works?", "\\bhvac\\b", "plumbing"),

  /* Project type */
  one("projectType", "government", "government", "public sector", "federal", "state agency", "municipal\\w*", "\\bcity of\\b", "county", "council", "\\bdefen[cs]e\\b", "\\brfp\\b", "\\brfq\\b", "procurement", "gsa", "fedramp"),
  one("projectType", "nonprofit", "non[- ]?profit", "charity", "charitable", "\\bngo\\b", "not[- ]for[- ]profit", "grant[- ]funded", "foundation"),
  one("projectType", "enterprise", "enterprise", "\\bfortune \\d+", "large organisation", "large organization", "our procurement", "security review", "legal review", "\\bmsa\\b", "vendor onboarding"),
  one("projectType", "startup", "startup", "start[- ]up", "pre[- ]seed", "seed round", "series [abc]\\b", "\\bmvp\\b", "founders?", "\\bvc\\b", "investors?"),
  one("projectType", "internal", "internal (?:project|tool|system|use)", "for our own (?:team|staff)", "in[- ]house use", "employees only"),
  one("projectType", "strategic", "multi[- ]year", "long[- ]term partner\\w*", "roadmap", "transformation", "ongoing programme", "ongoing program", "strategic initiative"),
  one("projectType", "commercial", "commercial project", "for our customers", "revenue"),

  /* Duration */
  one("duration", "multi-year", "multi[- ]year", "several years", "ongoing", "indefinit\\w*", "no end date", "\\d+\\+? years"),
  one("duration", "1-2y", "(?:1|one|a) (?:to|-|–) ?(?:2|two) years?", "(?:1|one|two|2) years?", "12 ?(?:-|to|–) ?24 months", "18 months"),
  one("duration", "6-12m", "6 ?(?:-|to|–) ?12 months", "six (?:to|-) ?twelve months", "under a year", "less than a year", "most of (?:the|next) year"),
  one("duration", "3-6m", "3 ?(?:-|to|–) ?6 months", "three (?:to|-) ?six months", "a (?:few|couple of) quarters", "one quarter"),
  one("duration", "1-3m", "1 ?(?:-|to|–) ?3 months", "one (?:to|-) ?three months", "(?:a )?couple of months", "(?:two|2|three|3) months"),
  one("duration", "under-1m", "(?:less than|under) (?:a|one|1) month", "(?:a )?few weeks", "(?:two|2|three|3|four|4) weeks", "by (?:next|the end of the) month"),

  /* Start */
  one("startWhen", "now", "immediat\\w*", "asap", "as soon as possible", "right away", "yesterday", "urgent\\w*", "start now"),
  one("startWhen", "1m", "within (?:a|one|1) month", "next month", "in a few weeks"),
  one("startWhen", "quarter", "this quarter", "next quarter", "\\bq[1-4]\\b"),
  one("startWhen", "6m", "within six months", "within 6 months", "later this year", "second half"),
  one("startWhen", "next-year", "next year", "next (?:budget|fiscal) year", "\\bfy ?\\d+", "next financial year"),
  one("startWhen", "scoping", "still scoping", "just (?:looking|exploring|researching)", "no timeline", "early days", "planning stage"),

  /* Users */
  one("users", "unknown", "don'?t know how many", "not sure how many", "no idea how many"),

  /* Business size */
  one("businessSize", "solo", "just me", "solo", "one[- ]person", "sole trader", "freelanc\\w*", "i'?m the only"),
  one("businessSize", "1000-plus", "thousands of (?:staff|employees)", "\\d{4,}\\+? (?:staff|employees)", "enterprise[- ]scale"),

  /* Data sensitivity */
  one("dataSensitivity", "classified", "classified", "controlled unclassified", "\\bcui\\b", "security clearance", "top secret", "\\bitar\\b"),
  one("dataSensitivity", "regulated", "\\bphi\\b", "patient (?:data|records)", "medical records", "financial records", "regulated data", "health data", "card (?:data|details)"),
  one("dataSensitivity", "personal", "personal data", "\\bpii\\b", "customer data", "employee data", "gdpr"),
  one("dataSensitivity", "internal", "internal data", "business data", "commercially sensitive"),
  one("dataSensitivity", "public", "public data", "nothing sensitive", "no sensitive"),

  /* Compliance */
  many("compliance", "hipaa", "hipaa"),
  many("compliance", "gdpr", "gdpr", "data protection", "\\bdpa\\b"),
  many("compliance", "ccpa", "ccpa", "cpra", "california privacy"),
  many("compliance", "soc2", "soc ?2", "soc ?ii"),
  many("compliance", "pci", "pci[- ]?dss", "\\bpci\\b", "card data"),
  many("compliance", "iso27001", "iso ?27001", "iso27k"),
  many("compliance", "fedramp", "fedramp"),
  many("compliance", "stateramp", "stateramp"),
  many("compliance", "cjis", "cjis", "criminal justice"),
  many("compliance", "nist", "nist", "800-171", "\\bcmmc\\b"),
  many("compliance", "ferpa", "ferpa", "student records"),
  many("compliance", "section508", "section ?508", "\\bwcag\\b", "accessib\\w*", "\\bada\\b compliance"),
  many("compliance", "sox", "\\bsox\\b", "sarbanes"),

  /* Technical */
  many("technical", "sso", "\\bsso\\b", "single sign[- ]on", "\\bsaml\\b", "okta", "active directory"),
  many("technical", "rbac", "roles? and permissions?", "\\brbac\\b", "permission levels?", "access control", "user roles?"),
  many("technical", "multi-tenant", "multi[- ]tenant", "several clients", "each customer gets"),
  many("technical", "offline", "offline", "no (?:internet|signal|connectivity)", "in the field"),
  many("technical", "realtime", "real[- ]?time", "live updates?", "instant\\w*", "websockets?", "push notifications?"),
  many("technical", "high-volume", "high volume", "millions of", "thousands per (?:day|hour|minute)", "at scale", "throughput"),
  many("technical", "white-label", "white[- ]?label", "our branding", "rebrand\\w*"),
  many("technical", "api", "public api", "open api", "api for (?:our )?(?:customers|partners)"),
  many("technical", "on-prem", "on[- ]?prem\\w*", "private cloud", "our own servers", "self[- ]hosted", "air[- ]?gapped"),
  many("technical", "data-residency", "data residency", "data must stay", "stay in (?:the )?(?:eu|uk|us|country)", "sovereign\\w*"),
  many("technical", "migration", "migrat\\w*", "import (?:our|existing) data", "move (?:our )?data", "years of data"),
  many("technical", "accessibility", "accessib\\w*", "\\bwcag\\b", "screen readers?"),
  many("technical", "i18n", "multiple languages", "multilingual", "localis\\w*", "localiz\\w*", "\\bi18n\\b"),
  many("technical", "audit-log", "audit (?:trail|log)", "who changed what", "full history", "traceab\\w*"),

  /* Government follow-ups */
  one("govLevel", "federal", "federal", "\\bgsa\\b", "national government"),
  one("govLevel", "state", "state (?:agency|government|of)", "provincial"),
  one("govLevel", "local", "city of", "county", "municipal\\w*", "town council", "local authority", "borough"),
  one("govLevel", "defence", "\\bdefen[cs]e\\b", "military", "police", "public safety", "first responders?"),
  one("govLevel", "edu-public", "public (?:school|university)", "school district", "state college"),
  one("govProcurement", "rfp-open", "rfp is open", "open rfp", "responding to an rfp", "bid is live", "solicitation is open"),
  one("govProcurement", "rfp", "\\brfp\\b", "\\brfq\\b", "tender", "solicitation", "competitive bid"),
  one("govProcurement", "vehicle", "contract vehicle", "\\bgsa schedule", "\\bidiq\\b", "\\bbpa\\b", "existing contract"),
  one("govProcurement", "sole-source", "sole[- ]source", "single source", "direct award"),
  one("govProcurement", "market-research", "market research", "\\brfi\\b", "request for information"),
  one("govProcurement", "under-threshold", "under the threshold", "below threshold", "micro[- ]purchase", "small purchase"),
  one("govFunding", "appropriated", "appropriated", "funding is (?:in place|secured|approved)", "budget is approved"),
  one("govFunding", "grant", "grant[- ]funded", "grant funding", "federal grant"),
  one("govFunding", "next-cycle", "next (?:budget|fiscal) cycle", "next fiscal year"),
  one("govFunding", "unfunded", "not funded", "no funding yet", "seeking funding"),

  /* Enterprise follow-ups */
  many("entProcurement", "security-review", "security review", "security assessment", "infosec", "vendor security"),
  many("entProcurement", "legal", "legal review", "contract review", "our lawyers"),
  many("entProcurement", "vendor-onboard", "vendor onboarding", "supplier onboarding", "vendor registration"),
  many("entProcurement", "msa", "\\bmsa\\b", "master service", "existing agreement"),
  many("entProcurement", "insurance", "insurance", "indemnit\\w*", "liability cover"),
  many("entProcurement", "dpa", "data processing agreement", "\\bdpa\\b"),
  many("entProcurement", "pen-test", "pen(?:etration)? test", "security testing evidence"),

  /* Non-profit / startup follow-ups */
  one("npFunding", "grant-secured", "grant (?:is )?secured", "we have (?:a|the) grant", "grant awarded", "grant[- ]funded"),
  one("npFunding", "grant-applying", "applying for a grant", "grant application", "grant proposal"),
  one("npFunding", "donor", "a donor", "donor[- ]funded", "philanthrop\\w*"),
  one("npFunding", "operating", "operating budget", "our own budget"),
  one("npFunding", "seeking", "seeking funding", "fundrais\\w*", "no funding yet"),
  one("startupStage", "idea", "idea stage", "just an idea", "concept stage", "napkin"),
  one("startupStage", "pre-seed", "pre[- ]seed", "bootstrapp\\w*", "self[- ]funded"),
  one("startupStage", "seed", "seed (?:round|funded|stage)", "raised a seed"),
  one("startupStage", "series-a", "series [abc]\\b", "\\bvc[- ]backed"),
  one("startupStage", "revenue", "revenue[- ]generating", "paying customers", "we're profitable"),
  one("startupGoal", "mvp", "\\bmvp\\b", "test the market", "validate", "proof of concept", "\\bpoc\\b", "prototype"),
  one("startupGoal", "demo", "show investors", "investor demo", "pitch deck", "fundrais\\w*"),
  one("startupGoal", "first-customers", "first (?:paying )?customers", "go to market", "launch"),
  one("startupGoal", "scale", "scale (?:up|what)", "growth", "handle more"),

  /* Strategic */
  one("strategicShape", "dedicated", "dedicated team", "embedded team", "our own squad"),
  one("strategicShape", "phased", "phase[ds]?", "milestones?", "in stages"),
  one("strategicShape", "roadmap", "roadmap", "evolving scope", "as we go"),
  one("strategicShape", "transformation", "transformation", "company[- ]wide", "digital transformation"),

  /* Budget — words rather than numbers; numbers handled separately */
  one("budget", "guide-me", "what does (?:this|it) (?:usually )?cost", "how much (?:does|would) (?:this|it)", "ballpark", "rough (?:idea of )?cost", "price range", "give me a range"),
  one("budget", "retainer", "retainer", "monthly (?:fee|budget)", "per month ongoing", "ongoing support budget"),
  one("budget", "unsure", "no budget set", "budget (?:isn'?t|is not) (?:set|decided)", "haven'?t set a budget", "not sure (?:on|about) budget"),
];

/* ── Numeric extraction ─────────────────────────────────────── */

/** "$50k", "50,000 dollars", "half a million", "£25k" → a budget band. */
const readBudget = (text: string): { value: string; evidence: string } | null => {
  const m = text.match(
    /(?:budget|spend|invest|cost|around|about|up to|roughly|approx\w*|between)?\s*[$£€]?\s*(\d[\d,.]*)\s*(k|m|thousand|million)?\b/gi
  );
  if (!m) return null;

  // Only trust a number that sits near money language — "400 franchisees" is not a budget.
  const near = /[$£€]|budget|spend|invest|cost|price|fee|pay|worth|k\b|thousand|million/i;

  let best: { n: number; evidence: string } | null = null;
  for (const raw of m) {
    if (!near.test(raw)) continue;
    const digits = raw.match(/(\d[\d,.]*)/);
    if (!digits) continue;
    let n = Number(digits[1].replace(/,/g, ""));
    if (!Number.isFinite(n) || n <= 0) continue;
    if (/\b(k|thousand)\b/i.test(raw) || /\dk\b/i.test(raw)) n *= 1_000;
    else if (/\b(m|million)\b/i.test(raw)) n *= 1_000_000;
    if (n < 1_000) continue; // "$50" is not a project budget
    if (!best || n > best.n) best = { n, evidence: raw.trim() };
  }
  if (/half a million/i.test(text)) best = { n: 500_000, evidence: "half a million" };
  if (!best) return null;

  const n = best.n;
  const value =
    n < 10_000 ? "under-10k" :
    n < 25_000 ? "10-25k" :
    n < 50_000 ? "25-50k" :
    n < 100_000 ? "50-100k" :
    n < 250_000 ? "100-250k" :
    n < 500_000 ? "250-500k" : "500k-plus";
  return { value, evidence: best.evidence };
};

/**
 * "400 franchisees", "about 2,000 users", "10k customers" → a user band.
 *
 * Headcount nouns are deliberately excluded: "a SaaS company with 40 staff
 * and 2,000 customers" describes a 40-person business with 2,000 users, and
 * matching "staff" first would report the company's size as its audience.
 * They only count when the sentence says they'll *use* the thing.
 */
const readUsers = (text: string): { value: string; evidence: string } | null => {
  const m =
    text.match(
      /(\d[\d,.]*)\s*(k|thousand|million)?\s*(?:\+\s*)?(?:users?|customers?|clients?|members?|subscribers?|franchisees?|students?|patients?|seats?|tenants?)/i
    ) ??
    text.match(
      /(\d[\d,.]*)\s*(k|thousand|million)?\s*(?:people|staff|employees?|agents?|technicians?|drivers?)\s+(?:will\s+|would\s+)?(?:use|using|access|be on|log)/i
    );
  if (!m) return null;
  let n = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  if (/k|thousand/i.test(m[2] || "")) n *= 1_000;
  else if (/million/i.test(m[2] || "")) n *= 1_000_000;

  const value =
    n < 10 ? "under-10" :
    n < 100 ? "10-100" :
    n < 1_000 ? "100-1k" :
    n < 10_000 ? "1k-10k" : "10k-plus";
  return { value, evidence: m[0].trim() };
};

/** Same phrasing, but read as headcount when the noun says so. */
const readCompanySize = (text: string): { value: string; evidence: string } | null => {
  const m = text.match(
    /(?:we(?:'re| are| have)?|team of|company of|with|of|around|about|roughly)\s*(\d[\d,.]*)\s*(k|thousand)?\s*(?:people|staff|employees?|strong|headcount)/i
  );
  if (!m) return null;
  let n = Number(m[1].replace(/,/g, ""));
  if (!Number.isFinite(n)) return null;
  if (/k|thousand/i.test(m[2] || "")) n *= 1_000;

  const value =
    n <= 1 ? "solo" :
    n <= 10 ? "2-10" :
    n <= 50 ? "11-50" :
    n <= 200 ? "51-200" :
    n <= 1_000 ? "201-1000" : "1000-plus";
  return { value, evidence: m[0].trim() };
};

/** An email or a phone number, if they simply typed one at us. */
const readContact = (text: string) => {
  const out: { key: AnswerKey; value: string; evidence: string }[] = [];
  const email = text.match(/[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}/i);
  if (email) out.push({ key: "email", value: email[0], evidence: email[0] });
  return out;
};

/* ── Public API ─────────────────────────────────────────────── */

/**
 * Read one message. Existing answers are respected: multi-value fields are
 * added to, single-value fields are only set when still empty — except where
 * the visitor is plainly correcting themselves ("actually, make it…").
 */
export function read(message: string, current: BriefState): Reading {
  const text = " " + message.toLowerCase().replace(/\s+/g, " ") + " ";
  const yes = affirmative(text);
  const no = negative(text);

  const correcting = /\b(?:actually|instead|change (?:that|it) to|scratch that|i meant|correction|rather)\b/i.test(text);

  const patch: Partial<BriefState> = {};
  const hits: Hit[] = [];
  const claimed = new Set<string>(); // one winner per single-value field

  const evidenceOf = (re: RegExp, src: string) => {
    const m = src.match(re);
    return (m?.[1] || m?.[0] || "").trim();
  };

  for (const rule of RULES) {
    /* `yes` already stops at the first negation, so a match here is something
       they asked for rather than something they ruled out. */
    if (!rule.test.test(yes)) continue;

    const evidence = evidenceOf(rule.test, yes);

    if (rule.multi) {
      const existing = (patch[rule.key] as string[]) ?? (current[rule.key] as string[]) ?? [];
      if (existing.includes(rule.value)) continue;
      (patch as Record<string, unknown>)[rule.key] = [...existing, rule.value];
      hits.push({ key: rule.key, value: rule.value, evidence });
    } else {
      if (claimed.has(rule.key)) continue;                       // earlier rule wins — list order is priority
      if (current[rule.key] && !correcting) continue;             // never silently overwrite
      claimed.add(rule.key);
      (patch as Record<string, unknown>)[rule.key] = rule.value;
      hits.push({ key: rule.key, value: rule.value, evidence });
    }
  }

  /* Values that come from numbers rather than words. */
  const numeric: [AnswerKey, ReturnType<typeof readBudget>][] = [
    ["budget", readBudget(yes)],
    ["users", readUsers(yes)],
    ["businessSize", readCompanySize(yes)],
  ];
  for (const [key, found] of numeric) {
    if (!found) continue;
    if (current[key] && !correcting) continue;
    (patch as Record<string, unknown>)[key] = found.value;
    hits.push({ key, value: found.value, evidence: found.evidence });
  }

  for (const c of readContact(message)) {
    if (current[c.key]) continue;
    (patch as Record<string, unknown>)[c.key] = c.value;
    hits.push(c);
  }

  /* Remove anything they explicitly ruled out. */
  if (no) {
    for (const rule of RULES) {
      if (!rule.multi || !rule.test.test(no)) continue;
      const list = (patch[rule.key] as string[]) ?? (current[rule.key] as string[]) ?? [];
      if (!list.includes(rule.value)) continue;
      (patch as Record<string, unknown>)[rule.key] = list.filter((v) => v !== rule.value);
    }
  }

  return { patch, hits };
}

/**
 * The free-text fields. Whatever they say lands in the brief verbatim —
 * we never paraphrase a person's own description of their problem.
 */
export function routeProse(message: string, current: BriefState): Partial<BriefState> {
  const trimmed = message.trim();
  if (trimmed.length < 25) return {};

  const soundsLikeProblem =
    /\b(?:today|currently|at the moment|right now|by hand|manual\w*|takes? (?:us|about|around)|hours? a (?:week|day)|problem|struggl\w*|pain|bottleneck|wrong|broken|slow|we have to|end up)\b/i
      .test(trimmed);

  if (soundsLikeProblem && !current.problem.trim()) return { problem: trimmed };
  if (!current.pitch.trim()) return { pitch: trimmed };
  if (!current.problem.trim()) return { problem: trimmed };

  // Both filled — append rather than discard. Nothing a person says is thrown away.
  return { problem: `${current.problem}\n\n${trimmed}` };
}
