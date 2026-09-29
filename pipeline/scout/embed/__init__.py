import hashlib
import logging
import re
from functools import lru_cache
from typing import Protocol

import numpy as np

from scout.config import get_settings
from scout.db.models import EMBED_DIM

logger = logging.getLogger(__name__)

QUERY_PREFIX = "Represent this sentence for searching relevant passages: "


class Embedder(Protocol):
    name: str

    def embed(self, texts: list[str]) -> np.ndarray: ...


class HashEmbedder:
    name = "fake-hash"

    def embed(self, texts: list[str]) -> np.ndarray:
        out = np.zeros((len(texts), EMBED_DIM), dtype=np.float32)
        for row, text in enumerate(texts):
            tokens = re.findall(r"[a-z0-9+#]+", text.lower())
            for token in tokens + [f"{a}_{b}" for a, b in zip(tokens, tokens[1:])]:
                digest = hashlib.blake2b(token.encode(), digest_size=8).digest()
                index = int.from_bytes(digest[:4], "little") % EMBED_DIM
                sign = 1.0 if digest[4] & 1 else -1.0
                out[row, index] += sign
            norm = np.linalg.norm(out[row])
            if norm:
                out[row] /= norm
        return out


class SentenceTransformerEmbedder:
    def __init__(self, model_name: str) -> None:
        self.name = model_name
        self._model = None

    def _load(self):
        if self._model is None:
            from sentence_transformers import SentenceTransformer

            logger.info("loading embedding model %s", self.name)
            self._model = SentenceTransformer(self.name, device="cpu")
            self._model.max_seq_length = 256
        return self._model

    def embed(self, texts: list[str]) -> np.ndarray:
        if not texts:
            return np.zeros((0, EMBED_DIM), dtype=np.float32)
        vectors = self._load().encode(texts, batch_size=64, normalize_embeddings=True, show_progress_bar=False)
        return np.asarray(vectors, dtype=np.float32)


@lru_cache
def get_embedder() -> Embedder:
    settings = get_settings()
    if settings.scout_fake_embed:
        return HashEmbedder()
    return SentenceTransformerEmbedder(settings.embed_model)


def job_text(title: str, company: str, location: str | None, description: str) -> str:
    return f"{title} at {company}. {location or ''}\n{description[:2000]}"


def embed_query(text: str) -> np.ndarray:
    embedder = get_embedder()
    prefix = QUERY_PREFIX if isinstance(embedder, SentenceTransformerEmbedder) else ""
    return embedder.embed([prefix + text[:4000]])[0]


def cosine(a: np.ndarray | list[float] | None, b: np.ndarray | list[float] | None) -> float:
    if a is None or b is None:
        return 0.0
    va, vb = np.asarray(a, dtype=np.float32), np.asarray(b, dtype=np.float32)
    denom = float(np.linalg.norm(va) * np.linalg.norm(vb))
    return float(va @ vb / denom) if denom else 0.0
