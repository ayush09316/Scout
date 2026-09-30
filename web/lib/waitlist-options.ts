export const ROLES = ["Backend", "Full-stack", "Frontend", "Mobile", "Data / ML", "DevOps / SRE", "Other"] as const;
export const EXPERIENCE = ["0–2 yrs", "3–5 yrs", "6–9 yrs", "10+ yrs"] as const;
export const STAGES = ["Actively applying", "Casually looking", "Open to the right offer", "Not looking yet"] as const;
export const LOCATIONS = ["Bengaluru", "Hyderabad", "Pune", "Mumbai", "Delhi NCR", "Chennai", "Remote (India)", "Remote (global)"] as const;
export const PAINS = [
  "Too many irrelevant postings",
  "Missing new openings until it's too late",
  "Tailoring my resume for each job",
  "Keeping track of applications and follow-ups",
  "Not knowing what a role pays",
  "Preparing for interviews",
] as const;
export const TOOLS = ["LinkedIn", "Naukri", "Instahyre", "Wellfound", "Company career pages", "Referrals", "Other"] as const;
export const LIKELIHOOD = [1, 2, 3, 4, 5] as const;
export const LIKELIHOOD_LABELS: Record<number, string> = { 1: "Not at all", 3: "Maybe", 5: "Definitely" };
export const MAX_ROLES = 2;
export const MAX_PAINS = 3;
export const MAX_REASON = 500;
export const SURVEY_STEPS = 5;
export const HOT_STAGE = "Actively applying";
export const REF_RE = /^[a-z0-9]{6,12}$/;
export const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,63}$/;
export const SOCIAL_THRESHOLD = 25;
