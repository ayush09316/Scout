export const CITIES = ["Bengaluru", "Hyderabad", "Pune", "Mumbai", "Chennai", "Gurugram", "Noida", "Delhi", "Kolkata", "Ahmedabad"];

export function places(location: string | null, remote: boolean): string[] {
  const l = (location ?? "").toLowerCase();
  const out = CITIES.filter((c) => l.includes(c.toLowerCase()) || (c === "Bengaluru" && (l.includes("bangalore") || l.includes("blr"))));
  if (remote || l.includes("remote")) out.push(l.includes("india") || out.length ? "Remote · India" : "Remote · Global");
  return out.length ? out : [location ?? "Other"];
}

export const MIN_SALARY_OPTIONS = [0, 10, 15, 20, 25, 30, 40, 50].map((v) => ({ value: String(v), label: v === 0 ? "Any salary" : `≥ ₹${v} LPA` }));
