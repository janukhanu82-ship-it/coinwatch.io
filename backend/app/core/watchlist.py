"""
Watchlist & Favorites store — in-memory management for tracked symbols.
"""
import time
from typing import Dict, List, Optional


def _key(symbol: str, exchange: str) -> str:
    return f"{exchange.lower()}:{symbol.upper()}"


class WatchlistStore:
    """In-memory watchlist + favorites manager."""

    def __init__(self):
        # key → entry dict
        self._watchlist: Dict[str, dict] = {}
        self._favorites: Dict[str, dict] = {}

    # ── Watchlist ────────────────────────────────────────────
    def add_to_watchlist(
        self, symbol: str, exchange: str, alert_threshold: float = 3.0
    ) -> dict:
        k = _key(symbol, exchange)
        entry = {
            "symbol": symbol.upper(),
            "exchange": exchange.lower(),
            "alert_threshold": alert_threshold,
            "armed": True,
            "added_at": int(time.time() * 1000),
        }
        self._watchlist[k] = entry
        return entry

    def remove_from_watchlist(self, symbol: str, exchange: str) -> bool:
        return self._watchlist.pop(_key(symbol, exchange), None) is not None

    def get_watchlist(self) -> List[dict]:
        return list(self._watchlist.values())

    def toggle_armed(self, symbol: str, exchange: str) -> Optional[dict]:
        k = _key(symbol, exchange)
        entry = self._watchlist.get(k)
        if entry is None:
            return None
        entry["armed"] = not entry["armed"]
        return entry

    # ── Favorites ───────────────────────────────────────────
    def add_favorite(self, symbol: str, exchange: str) -> dict:
        k = _key(symbol, exchange)
        entry = {
            "symbol": symbol.upper(),
            "exchange": exchange.lower(),
            "added_at": int(time.time() * 1000),
        }
        self._favorites[k] = entry
        return entry

    def remove_favorite(self, symbol: str, exchange: str) -> bool:
        return self._favorites.pop(_key(symbol, exchange), None) is not None

    def get_favorites(self) -> List[dict]:
        return list(self._favorites.values())

    def is_favorite(self, symbol: str, exchange: str) -> bool:
        return _key(symbol, exchange) in self._favorites


# Singleton
watchlist_store = WatchlistStore()
