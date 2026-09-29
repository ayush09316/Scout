import re
from dataclasses import dataclass

CITY_ALIASES: dict[str, list[str]] = {
    "Bengaluru": ["bengaluru", "bangalore", "blr", "banglore", "bengalore"],
    "Gurugram": ["gurugram", "gurgaon", "ggn"],
    "Delhi NCR": ["delhi ncr", "ncr", "new delhi", "delhi", "noida", "greater noida", "faridabad", "ghaziabad"],
    "Mumbai": ["mumbai", "bombay", "navi mumbai", "thane"],
    "Pune": ["pune", "poona"],
    "Hyderabad": ["hyderabad", "hyd", "secunderabad"],
    "Chennai": ["chennai", "madras"],
    "Kolkata": ["kolkata", "calcutta"],
    "Ahmedabad": ["ahmedabad"],
    "Jaipur": ["jaipur"],
    "Kochi": ["kochi", "cochin"],
    "Indore": ["indore"],
    "Coimbatore": ["coimbatore"],
    "Chandigarh": ["chandigarh", "mohali"],
    "San Francisco": ["san francisco", "sf bay area", "bay area"],
    "New York": ["new york", "nyc"],
    "London": ["london"],
    "Singapore": ["singapore"],
    "Berlin": ["berlin"],
    "Toronto": ["toronto"],
    "Dublin": ["dublin"],
    "Amsterdam": ["amsterdam"],
    "Seattle": ["seattle"],
}
INDIAN_CITIES = {"Bengaluru", "Gurugram", "Delhi NCR", "Mumbai", "Pune", "Hyderabad", "Chennai", "Kolkata", "Ahmedabad", "Jaipur", "Kochi", "Indore", "Coimbatore", "Chandigarh"}

_ALIAS_PATTERNS = [
    (city, re.compile(r"(?<![a-z])" + re.escape(alias) + r"(?![a-z])"))
    for city, aliases in CITY_ALIASES.items()
    for alias in sorted(aliases, key=len, reverse=True)
]
REMOTE_RE = re.compile(r"\b(remote|work from home|wfh|anywhere|worldwide|distributed|fully[- ]remote)\b", re.I)
NOT_REMOTE_RE = re.compile(r"\b(not remote|no remote|on[- ]?site only|in[- ]office only)\b", re.I)
INDIA_RE = re.compile(r"\bindia\b", re.I)
INDIA_CODE_RE = re.compile(r"(?:^|[\s,(\-/])(IN|IND)(?:$|[\s,)\-/])")


@dataclass
class Location:
    display: str | None
    cities: list[str]
    remote: bool
    india: bool

    @property
    def primary_city(self) -> str:
        if self.cities:
            return self.cities[0]
        return "remote" if self.remote else ""


def canonical_cities(raw: str) -> list[str]:
    text = raw.lower()
    found: list[str] = []
    for city, pattern in _ALIAS_PATTERNS:
        if city not in found and pattern.search(text):
            found.append(city)
    return found


def canonicalize_location(raw: str | None, remote_hint: bool | None = None, title: str = "") -> Location:
    raw = (raw or "").strip()
    cities = canonical_cities(raw)
    remote = bool(remote_hint) or bool(REMOTE_RE.search(raw)) or bool(REMOTE_RE.search(title))
    if NOT_REMOTE_RE.search(raw):
        remote = False
    india = bool(INDIA_RE.search(raw)) or bool(INDIA_CODE_RE.search(raw)) or any(c in INDIAN_CITIES for c in cities)
    if cities:
        display = ", ".join(cities + (["Remote"] if remote else []))
    elif remote:
        display = "Remote-India" if india else (raw if raw and raw.lower() != "remote" else "Remote")
    else:
        display = raw or None
    return Location(display=display, cities=cities, remote=remote, india=india)
