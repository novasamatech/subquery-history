import os
import asyncio
import telegram

from subquery_api import SubQueryProject, DeploymentInstance
from singleton import Singleton


class TelegramNotifications(metaclass=Singleton):
    notify_message_title = "⚠️ SubQuery projects error ⚠️"
    notify_projects_message = []

    def __init__(self) -> None:
        self.token = os.getenv("TELEGRAM_BOT_TOKEN")
        self.chat_id = os.getenv("TELEGRAM_CHAT_ID")

    async def send_telegram_message(self, message):
        bot = telegram.Bot(token=self.token)
        await bot.send_message(chat_id=self.chat_id, text=message, parse_mode="MarkdownV2")

    def send_notification(self):
        if len(self.notify_projects_message) != 0:
            notification_message = self.notify_message_title
            
            for project_message in self.notify_projects_message:
                notification_message += project_message
            
            shielded_message = notification_message.replace('-', '\-')
            asyncio.run(self.send_telegram_message(shielded_message)) 
        else:
            pass

    def add_row_in_telegram_notification(self, project: SubQueryProject, instance: DeploymentInstance):
        notify_project_name = project.name.title()

        self.notify_projects_message.append(
            f"\n\n*{notify_project_name}* Indexer is unhealthy\!\nProject URL: [Link to project](https://managedservice.subquery.network/orgs/nova-wallet/projects/{instance.project_key.split('/')[1]}/deployments?slot={instance.type})\nExplorer URL: [Link to explorer](https://explorer.subquery.network/subquery/{instance.project_key})\nEnvironment: {instance.type.capitalize()}"
        )
