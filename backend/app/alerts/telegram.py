import aiohttp
import logging
from typing import Dict, Any
from app.core.config import settings

logger = logging.getLogger("alerts.telegram")

class TelegramDispatcher:
    def __init__(self):
        self.bot_token = settings.TELEGRAM_BOT_TOKEN
        self.chat_id = settings.TELEGRAM_CHAT_ID

    async def send_alert(self, payload: Dict[str, Any]):
        """Formats and delivers the alert to the configured Telegram chat."""
        ex_badge = f"🟢 [{payload['exchange']}]" if payload['exchange'] == "HYPERLIQUID" else f"🟡 [{payload['exchange']}]"
        poa = payload.get("poa", {})

        msg = (
            f"🚨 <b>UNUSUAL MOVE ALERT</b> {ex_badge}\n\n"
            f"<b>Symbol:</b> #{payload['symbol']} (${payload['price']})\n"
            f"<b>Setup:</b> <code>{payload['bias']}</code> | Flow: <code>{payload['flow']}</code>\n"
            f"<b>Composite Score:</b> <b>{payload['score']} / 100</b>\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"📊 <b>Signals:</b>\n"
            f"• 1m Volume Surge: <b>{payload['vol_spike']}x</b>\n"
            f"• 5m OI Delta: <b>{payload['oi_5m']:+.2f}%</b>\n"
            f"• Funding Rate: <b>{payload['funding'] * 100:+.4f}%</b>\n"
            f"━━━━━━━━━━━━━━━━━━\n"
            f"🎯 <b>Auto Plan of Attack (POA):</b>\n"
            f"• Entry Zone: <code>${poa.get('entry_zone_low')} - ${poa.get('entry_zone_high')}</code>\n"
            f"• Invalidation (SL): <code>${poa.get('stop_loss')}</code>\n"
            f"• Target 1 (1.5R): <code>${poa.get('tp1')}</code>\n"
            f"• Target 2 (2.5R): <code>${poa.get('tp2')}</code>\n"
        )

        logger.info(f"[Alert Fired] {payload['exchange']} {payload['symbol']} (Score: {payload['score']})")

        if not self.bot_token or not self.chat_id:
            return

        try:
            url = f"https://api.telegram.org/bot{self.bot_token}/sendMessage"
            data = {
                "chat_id": self.chat_id,
                "text": msg,
                "parse_mode": "HTML"
            }
            async with aiohttp.ClientSession() as session:
                async with session.post(url, json=data, timeout=aiohttp.ClientTimeout(total=5)) as resp:
                    if resp.status != 200:
                        logger.error(f"Failed to send Telegram message: status {resp.status}")
        except Exception as e:
            logger.error(f"Telegram dispatch error: {e}")

telegram_dispatcher = TelegramDispatcher()
