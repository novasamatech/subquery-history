import os
import asyncio
import telegram

from subquery_api import SubQueryProject, DeploymentInstances


class TelegramNotifications():
    __instance = None
    telegram_message = "⚠️ SubQuery projects error ⚠️"
    need_to_send_notification = False

    def __init__(self) -> None:
        if not hasattr(self, 'initialized'):
            self.initialized = True
            self.token = os.getenv("TELEGRAM_BOT_TOKEN")
            self.chat_id = os.getenv("TELEGRAM_CHAT_ID")

    def __new__(cls):
        if cls.__instance is None:
            cls.__instance = super().__new__(cls)
        return cls.__instance

    async def send_telegram_message(self, message):
        bot = telegram.Bot(token=self.token)
        await bot.send_message(chat_id=self.chat_id, text=message, parse_mode="MarkdownV2")
        
    def send_notification(self):
        if self.need_to_send_notification:
            asyncio.run(self.send_telegram_message(self.telegram_message))
        else:
            pass

    def add_row_in_telegram_notification(self, project: SubQueryProject, instance: DeploymentInstances):
        self.need_to_send_notification = True
        self.telegram_message += f"\n\n*{project.network.title()}* Indexer is unhealthy\!\nProject URL: [Link to project](https://managedservice.subquery.network/orgs/nova-wallet/projects/{instance.projectKey.split('/')[1]}/deployments?slot={instance.type})\nExplorer URL: [Link to explorer](https://explorer.subquery.network/subquery/{instance.projectKey})\nEnvironment: {instance.type.capitalize()}"
