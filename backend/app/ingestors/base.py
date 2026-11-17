from abc import ABC, abstractmethod
import asyncio
import logging

logger = logging.getLogger(__name__)

class BaseExchangeIngestor(ABC):
    def __init__(self, exchange_name: str):
        self.exchange_name = exchange_name.lower()
        self.is_running = False
        self._task: asyncio.Task = None

    @abstractmethod
    async def start(self):
        """Start WebSocket connections and polling loops."""
        pass

    @abstractmethod
    async def stop(self):
        """Gracefully disconnect and cleanup resources."""
        pass
