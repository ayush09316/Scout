import re

from scout.config import get_settings

LAKH = 100_000
CRORE = 10_000_000
FX_TO_INR = {"EUR": 90.0, "GBP": 105.0, "CAD": 61.0, "AUD": 55.0, "SGD": 62.0}

NUM = r"(\d+(?:\.\d+)?)"
DASH = r"\s*(?:-|–|—|to)\s*"
INR_SIGN = r"(?:₹|inr|rs\.?)"
LAKH_UNIT = r"(?:lpa|lakhs?|lacs?|l\b|lakh per annum)"
CRORE_UNIT = r"(?:crores?|cr\b)"

LAKH_RANGE = re.compile(rf"(?:{INR_SIGN}\s*)?{NUM}{DASH}(?:{INR_SIGN}\s*)?{NUM}\s*{LAKH_UNIT}", re.I)
LAKH_SINGLE = re.compile(rf"(?:{INR_SIGN}\s*)?{NUM}\s*{LAKH_UNIT}", re.I)
CRORE_RANGE = re.compile(rf"(?:{INR_SIGN}\s*)?{NUM}{DASH}(?:{INR_SIGN}\s*)?{NUM}\s*{CRORE_UNIT}", re.I)
CRORE_SINGLE = re.compile(rf"(?:{INR_SIGN}\s*)?{NUM}\s*{CRORE_UNIT}", re.I)
INR_FULL = re.compile(rf"{INR_SIGN}\s*(\d[\d,]{{4,}}){DASH}(?:{INR_SIGN}\s*)?(\d[\d,]{{4,}})", re.I)
USD_RANGE = re.compile(r"(?:\$|usd\s*)\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?" + DASH + r"(?:\$|usd\s*)?\s*(\d[\d,]*(?:\.\d+)?)\s*(k)?", re.I)
USD_SINGLE_K = re.compile(r"(?:\$|usd\s*)\s*(\d{2,3})\s*k\b", re.I)
TRAILING_CODE = re.compile(r"^\s*(usd|cad|aud|sgd|nzd|eur|gbp)\b", re.I)
HOURLY = re.compile(r"^\s*(?:/|per\s*)\s*(?:hr|hour|h\b|month|mo\b|week|wk|day)", re.I)


def _num(value: str) -> float:
    return float(value.replace(",", ""))


def _sane_inr(low: float, high: float) -> bool:
    return 100_000 <= low <= high <= 500_000_000


def parse_salary_text(text: str | None) -> tuple[int, int, str] | None:
    if not text:
        return None
    text = text[:20000]
    for pattern, unit in ((CRORE_RANGE, CRORE), (LAKH_RANGE, LAKH)):
        for m in pattern.finditer(text):
            low, high = _num(m.group(1)) * unit, _num(m.group(2)) * unit
            if _sane_inr(low, high):
                return int(low), int(high), "INR"
    for m in INR_FULL.finditer(text):
        low, high = _num(m.group(1)), _num(m.group(2))
        if _sane_inr(low, high):
            return int(low), int(high), "INR"
    for m in USD_RANGE.finditer(text):
        if HOURLY.match(text[m.end():m.end() + 12]):
            continue
        low = _num(m.group(1)) * (1000 if m.group(2) or m.group(4) and _num(m.group(1)) < 1000 else 1)
        high = _num(m.group(3)) * (1000 if m.group(4) else 1)
        if 10_000 <= low <= high <= 1_500_000:
            code = TRAILING_CODE.match(text[m.end():m.end() + 8])
            return int(low), int(high), code.group(1).upper() if code else "USD"
    for pattern, unit in ((CRORE_SINGLE, CRORE), (LAKH_SINGLE, LAKH)):
        for m in pattern.finditer(text):
            value = _num(m.group(1)) * unit
            if _sane_inr(value, value):
                return int(value), int(value), "INR"
    for m in USD_SINGLE_K.finditer(text):
        if HOURLY.match(text[m.end():m.end() + 12]):
            continue
        value = int(m.group(1)) * 1000
        return value, value, "USD"
    return None


def to_inr(amount: float | None, currency: str | None) -> float | None:
    if amount is None:
        return None
    code = (currency or "INR").upper()
    if code == "INR":
        return float(amount)
    if code == "USD":
        return float(amount) * get_settings().usd_inr_rate
    rate = FX_TO_INR.get(code)
    return float(amount) * rate if rate else None


def inr_band(salary_min: int | None, salary_max: int | None, currency: str | None) -> tuple[float, float] | None:
    low = to_inr(salary_min if salary_min is not None else salary_max, currency)
    high = to_inr(salary_max if salary_max is not None else salary_min, currency)
    if low is None or high is None or low <= 0:
        return None
    low, high = min(low, high), max(low, high)
    if not 50_000 <= low <= 500_000_000:
        return None
    return low, high
