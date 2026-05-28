import json
import os
import urllib.parse
import urllib.request
from typing import Optional

from dotenv import load_dotenv

load_dotenv()
TELEGRAM_BOT_TOKEN = os.getenv("TELEGRAM_BOT_TOKEN")
TELEGRAM_CHAT_ID = os.getenv("TELEGRAM_CHAT_ID")


def send_telegram_alert(image_name: Optional[str], critical_count: int, high_count: int, is_test: bool = False) -> bool:
    if is_test:
        text = (
            "🔔 *DevSecOps Test Alert* 🔔\n\n"
            "Đây là tin nhắn thử nghiệm từ Hệ thống Docker Security Scanner!\n"
            "Kết nối tới Telegram đã thành công. 🚀"
        )
    else:
        text = (
            "🚨 *CRITICAL SECURITY ALERT* 🚨\n\n"
            f"Phát hiện lỗ hổng nghiêm trọng trong Image: `{image_name}`\n"
            f"❌ *Critical*: {critical_count} lỗ hổng\n"
            f"⚠️ *High*: {high_count} lỗ hổng\n\n"
            "Vui lòng truy cập hệ thống DevSecOps để xem báo cáo chi tiết và tiến hành vá lỗi (Auto-remediate) ngay lập tức!"
        )

    url = f"https://api.telegram.org/bot{TELEGRAM_BOT_TOKEN}/sendMessage"

    data = {"chat_id": TELEGRAM_CHAT_ID, "text": text, "parse_mode": "Markdown"}

    req = urllib.request.Request(
        url, data=json.dumps(data).encode("utf-8"), headers={"Content-Type": "application/json"}
    )

    try:
        urllib.request.urlopen(req)
        return True
    except Exception as e:
        print(f"Failed to send Telegram alert: {e}")
        return False
