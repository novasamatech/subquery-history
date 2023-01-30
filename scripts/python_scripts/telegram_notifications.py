import os
import telegram

async def send_telegram_message(message):
    bot = telegram.Bot(token=os.getenv("TELEGRAM_BOT_TOKEN"))
    await bot.send_message(chat_id=os.getenv("TELEGRAM_CHAT_ID"), text=message, parse_mode="MarkdownV2")
