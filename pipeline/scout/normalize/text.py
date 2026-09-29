import re

from markdownify import markdownify

TAG_RE = re.compile(r"<[a-zA-Z/][^>]*>")


def html_to_md(value: str) -> str:
    if not value:
        return ""
    if TAG_RE.search(value):
        value = markdownify(value, heading_style="ATX", strip=["img", "script", "style"])
    value = re.sub(r"[ \t]+\n", "\n", value)
    value = re.sub(r"\n{3,}", "\n\n", value)
    return value.strip()


def normalize_title(title: str) -> str:
    title = title.lower()
    title = re.sub(r"\(.*?\)|\[.*?\]", " ", title)
    title = re.sub(r"\b(sr|snr)\b\.?", "senior", title)
    title = re.sub(r"\bjr\b\.?", "junior", title)
    title = re.sub(r"\bswe\b", "software engineer", title)
    title = re.sub(r"\bsde\b", "software development engineer", title)
    title = re.sub(r"[^a-z0-9+#]+", " ", title)
    return re.sub(r"\s+", " ", title).strip()


def normalize_company(name: str) -> str:
    name = name.lower()
    name = re.sub(r"\b(inc|llc|ltd|limited|pvt|private|technologies|technology|labs|corp|corporation|co|gmbh|hq)\b\.?", " ", name)
    name = re.sub(r"[^a-z0-9]+", " ", name)
    return re.sub(r"\s+", " ", name).strip()
