import os
import telegram

from subquery_api import SubQueryProject, DeploymentInstances

telegram_message = "⚠️ SubQuery projects error ⚠️"


async def send_telegram_message(message):
    bot = telegram.Bot(token=os.getenv("TELEGRAM_BOT_TOKEN"))
    await bot.send_message(chat_id=os.getenv("TELEGRAM_CHAT_ID"), text=message, parse_mode="MarkdownV2")


def add_row_in_telegram_notification(project: SubQueryProject, instance: DeploymentInstances):
    telegram_message += f"\n\n*{project.network.title()}* Indexer is unhealthy\!\nProject URL: [Link to project](https://managedservice.subquery.network/orgs/nova-wallet/projects/{instance.projectKey.split('/')[1]}/deployments?slot={instance['type']})\nExplorer URL: [Link to explorer](https://explorer.subquery.network/subquery/{instance.projectKey})\nEnvironment: {instance.type.capitalize()}"
