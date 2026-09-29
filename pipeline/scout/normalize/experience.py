import re

RANGE_RE = re.compile(r"(\d{1,2})\s*(?:\+\s*)?(?:-|–|to)\s*(\d{1,2})\s*\+?\s*(?:years?|yrs?)", re.I)
MIN_RE = re.compile(r"(?:(?:at least|minimum(?: of)?|min\.?)\s*)?(\d{1,2})\s*\+?\s*(?:years?|yrs?)(?:\s+of)?(?:\s+\w+){0,4}\s+(?:experience|exp)", re.I)
PLUS_RE = re.compile(r"(\d{1,2})\s*\+\s*(?:years?|yrs?)", re.I)

SENIORITY_RULES: list[tuple[str, re.Pattern[str]]] = [
    ("intern", re.compile(r"\bintern(ship)?\b", re.I)),
    ("executive", re.compile(r"\b(vp|vice president|chief|cto|ceo|head of|director)\b", re.I)),
    ("principal", re.compile(r"\b(principal|distinguished|fellow)\b", re.I)),
    ("staff", re.compile(r"\bstaff\b", re.I)),
    ("lead", re.compile(r"\b(lead|manager|architect)\b", re.I)),
    ("senior", re.compile(r"\b(senior|sr\.?|snr|sde[- ]?(iii|3)|l5|engineer (iii|3))\b", re.I)),
    ("junior", re.compile(r"\b(junior|jr\.?|entry[- ]level|graduate|new grad|fresher|associate|sde[- ]?(i|1)|engineer (i|1))\b", re.I)),
    ("mid", re.compile(r"\b(sde[- ]?(ii|2)|engineer (ii|2)|mid[- ]level|intermediate)\b", re.I)),
]


def parse_experience(text: str) -> tuple[int | None, int | None]:
    if not text:
        return None, None
    best: tuple[int | None, int | None] = (None, None)
    for match in RANGE_RE.finditer(text):
        low, high = int(match.group(1)), int(match.group(2))
        if low <= high <= 30:
            return low, high
    candidates = [int(m.group(1)) for m in MIN_RE.finditer(text)] + [int(m.group(1)) for m in PLUS_RE.finditer(text)]
    candidates = [c for c in candidates if 0 < c <= 25]
    if candidates:
        best = (min(candidates), None)
    return best


def seniority_from_title(title: str) -> str:
    for label, pattern in SENIORITY_RULES:
        if pattern.search(title):
            return label
    return "mid"
