#!/usr/bin/env python3

import os

from jinja2 import Template

from table_representation import ProjectTableGenerator
from subquery_api import SubQueryDeploymentAPI
from telegram_notifications import TelegramNotifications

token = os.getenv("SUBQUERY_TOKEN")
organisation = "nova-wallet"
nova_network_list = "https://raw.githubusercontent.com/nova-wallet/nova-utils/master/chains/v11/chains_dev.json"

readme = Template("""
Projects' status is updated every 4 hours

SubQuery API data sources are grouped based on the following features:

📚 Operation History -  Transfers and Extrinsics for Utility (main) token of the network <br />
✨ Multi-asset transfers - Support for transfer history for tokens from ORML and Assets pallets <br />
🥞 Staking rewards - Rewards history and accumulated total rewards, supports both Staking and ParachainStaking pallets <br />
📈 Staking analytics - Queries for current stake, validators statistics, and stake change history

# List of deployed projects

{{dapps_table}}
""")


def generate_project_table():
    sub_query = SubQueryDeploymentAPI(auth_token=token, org=organisation)
    sub_query.collect_all_project_data()

    table_generator = ProjectTableGenerator(sub_query, nova_network_list)
    table = table_generator.generate_table()

    return table


if __name__ == '__main__':

    dir_name = 'gh-pages-temp'
    
    telegram = TelegramNotifications()
    try:
        os.makedirs(dir_name)
        print("Directory ", dir_name,  " Created ")
    except FileExistsError:
        print("Directory ", dir_name,  " already exists")

    with open("./gh-pages-temp/README.md", "w") as f:
        f.write(readme.render(
            dapps_table=generate_project_table()
        ))

    # TODO: Temp remove, waiting for https://app.clickup.com/t/862kc4b47
    # telegram.send_notification()
