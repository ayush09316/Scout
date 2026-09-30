export const ROLES = ["Backend", "Full-stack", "Frontend", "Data/ML", "DevOps/SRE", "Other"] as const;
export const EXPERIENCE = ["0–2 yrs", "3–5 yrs", "6–9 yrs", "10+ yrs"] as const;
export const WOULD_PAY = ["No, free only", "₹99–199/mo", "₹299/mo", "₹499+/mo"] as const;
export const PAYING = ["₹299/mo", "₹499+/mo"] as const;
export const REF_RE = /^[a-z0-9]{6,12}$/;
export const EMAIL_RE = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,63}$/;
export const SOCIAL_THRESHOLD = 25;
