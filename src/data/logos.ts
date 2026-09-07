// Real brand logos (official Simple Icons glyphs), tinted via CSS mask.
// Grouped for the integrations section.
export const logoGroups = [
  {
    label: "Accounting & Finance",
    items: [
      { slug: "quickbooks", name: "QuickBooks" },
      { slug: "xero", name: "Xero" },
      { slug: "stripe", name: "Stripe" },
    ],
  },
  {
    label: "CRM & Marketing",
    items: [
      { slug: "hubspot", name: "HubSpot" },
      { slug: "mailchimp", name: "Mailchimp" },
      { slug: "zoho", name: "Zoho" },
    ],
  },
  {
    label: "Comms & Scheduling",
    items: [
      { slug: "gmail", name: "Gmail" },
      { slug: "calendly", name: "Calendly" },
      { slug: "googlecalendar", name: "Google Calendar" },
    ],
  },
  {
    label: "Ops, Data & Automation",
    items: [
      { slug: "notion", name: "Notion" },
      { slug: "airtable", name: "Airtable" },
      { slug: "zapier", name: "Zapier" },
      { slug: "make", name: "Make" },
      { slug: "clickup", name: "ClickUp" },
      { slug: "asana", name: "Asana" },
    ],
  },
  {
    label: "Commerce & Storage",
    items: [
      { slug: "shopify", name: "Shopify" },
      { slug: "googlesheets", name: "Google Sheets" },
      { slug: "googledrive", name: "Google Drive" },
      { slug: "dropbox", name: "Dropbox" },
      { slug: "trello", name: "Trello" },
    ],
  },
  {
    label: "AI & LLM Platforms",
    items: [
      { slug: "anthropic", name: "Anthropic" },
      { slug: "googlegemini", name: "Google Gemini" },
      { slug: "huggingface", name: "Hugging Face" },
      { slug: "langchain", name: "LangChain" },
      { slug: "mistralai", name: "Mistral AI" },
    ],
  },
];

// Flat list for the marquee strip.
export const allLogos = logoGroups.flatMap((g) => g.items);
