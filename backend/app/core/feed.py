"""
Feed / events logging system — stores recent scanner events for the UI activity feed.
"""
import threading
import time
from collections import deque
from typing import Dict, List, Optional


class FeedStore:
    """In-memory rolling event store (max 500 events)."""

    def __init__(self, maxlen: int = 500):
        self._events: deque = deque(maxlen=maxlen)
        self._next_id: int = 1
        self._lock = threading.Lock()

    def add_event(
        self,
        type: str,
        symbol: str,
        exchange: str,
        message: str,
        data: Optional[Dict] = None,
    ) -> Dict:
        """Append a new event and return it."""
        with self._lock:
            event = {
                "id": self._next_id,
                "ts": int(time.time() * 1000),
                "type": type,           # "ALERT" | "SIGNAL" | "INFO"
                "symbol": symbol,
                "exchange": exchange,
                "message": message,
                "data": data or {},
            }
            self._next_id += 1
            self._events.append(event)
        return event

    def get_events(self, since_id: int = 0, limit: int = 50) -> List[Dict]:
        """Return up to *limit* events whose id > since_id."""
        with self._lock:
            result = [e for e in self._events if e["id"] > since_id]
        return result[-limit:]


# Singleton
feed_store = FeedStore()
