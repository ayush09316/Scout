from scout.sources.ats import AtsSource, ats_sources, probe_company
from scout.sources.base import CompanyRef, FetchResult, RawJob, Source
from scout.sources.boards import board_sources


def all_sources(companies: list[CompanyRef]) -> list[Source]:
    return [*ats_sources(companies), *board_sources()]


__all__ = ["AtsSource", "CompanyRef", "FetchResult", "RawJob", "Source", "all_sources", "ats_sources", "board_sources", "probe_company"]
