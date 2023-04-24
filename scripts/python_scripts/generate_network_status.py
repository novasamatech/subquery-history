#!/usr/bin/env python3

import asyncio
import json
import os
import requests
import yaml
from jinja2 import Template

from pytablewriter import MarkdownTableWriter
from subquery_api import SubQuery
from telegram_notifications import send_telegram_message

global telegram_message

telegram_message = "⚠️ SubQuery project error ⚠️"

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


def generate_networks_list():
    sub_query = SubQuery(auth_token=token, org=organisation)
    sub_query.collect_all_data()

    writer = MarkdownTableWriter(
        headers=["--", "Network", "Features", "Stage status",
                 "Prod status", "Stage commit", "Prod commit"],
        value_matrix=generate_value_matrix(sub_query),
        margin=1
    )
    writer.write_table()
    asyncio.run(send_telegram_message(telegram_message))
    return writer


def get_percentage(instance, network):
    global telegram_message
    processing_block = instance['syncStatus'].get('processingBlock')
    target_block = instance['syncStatus'].get('targetBlock')

    if processing_block != -1 and processing_block is not None:
        status = round((processing_block / target_block) * 100, 2)
        
        return str(status)
    else:
        telegram_message += f"\n\n*{network['network'].title()}* Indexer is unhealthy\!\nProject URL: [Link to project](https://managedservice.subquery.network/orgs/nova-wallet/projects/{instance['projectKey'].split('/')[1]}/deployments?slot={instance['type']})\nExplorer URL: [Link to explorer](https://explorer.subquery.network/subquery/{instance['projectKey']})\nEnvironment: {instance['type'].capitalize()}"

        return '0'


def generate_progress_status(project):
    prod, stage = None, None
    for deployment in project['deployments']:
        if deployment['type'] == 'primary':
            prod = deployment
        elif deployment['type'] == 'stage':
            stage = deployment
        else:
            raise Exception(
                f"Unknown deployment type: {deployment['type']} in project: {project}")

    def fill_status_bar(instance):
        if (instance):
            commit = instance.get('version')[0:8]
            if (instance.get('status') == 'processing'):
                progress_bar = '![0](https://progress-bar.dev/0?title=Processing...)'
            elif (instance.get('status') == 'error' and get_percentage(instance, project) == '0'):
                progress_bar = '![0](https://progress-bar.dev/0?title=Error)'
            else:
                percent = get_percentage(instance, project)
                progress_bar = '![%s](https://progress-bar.dev/%s?title=%s)' % (
                    percent, percent, instance.get('type').capitalize())
        else:
            progress_bar = '![0](https://progress-bar.dev/0?title=N/A)'
            commit = '-'
        return progress_bar, commit

    prod_status, prod_commit = fill_status_bar(prod)
    stage_status, stage_commit = fill_status_bar(stage)

    return prod_status, prod_commit, stage_status, stage_commit


def generate_value_matrix(subquery: SubQuery):
    network_list = generate_network_list(nova_network_list, subquery)
    returning_array = []
    for network in network_list:
        network_data_array = []
        network_data_array.append(
            "[%s](https://explorer.subquery.network/subquery/nova-wallet/nova-wallet-%s)" % (
                network.get('name').title(), network.get('name'))
        )
        prod_status, prod_commit, stage_status, stage_comit = generate_progress_status(
            next(filter(
                lambda project: project['name'] == network['name'], subquery.org_projects))
        )
        network_data_array.append(network.get('features'))
        network_data_array.append(stage_status)
        network_data_array.append(prod_status)
        network_data_array.append(stage_comit)
        network_data_array.append(prod_commit)
        returning_array.append(network_data_array)
        print('%s generated!' % network.get('name').title())
    returning_array.sort()
    increment = iter(range(1, len(returning_array)+1))
    [network.insert(0, next(increment)) for network in returning_array]
    return returning_array


def generate_network_list(chains_url, subquery: SubQuery):
    feature_list = []
    chains_list = send_http_request(chains_url)
    available_projects = subquery.org_projects
    for project in available_projects:
        try:
            prod_genesis = [deploy['configuration']['chainId'] for deploy in project[
                'deployments'] if deploy['type'] == 'primary']
        except:
            print(
                f"Network: {project['network']} has old deployment, need to redeploy")
        if len(prod_genesis) == 0:  # Skip undeployed projects
            continue
        project_genesis = remove_hex_prefix(prod_genesis[0])
        chain = next(iter([chain for chain in chains_list if chain.get(
            'chainId') == project_genesis]), None)
        feature_list.append({
            "name": project['name'],
            "genesis": project_genesis,
            "features": check_features(chain)
        })
    return feature_list


def check_features(chain):
    def has_transfer_history(chain):
        return True

    def has_orml_or_asset(chain):
        for asset in chain.get('assets'):
            if (asset.get('type') in ['orml', 'statemine']):
                return True
        return False

    def has_staking_analytics(chain):
        if (chain.get('assets')[0].get('staking') == 'relaychain'):
            return True
        return False

    def has_rewards_history(chain):
        if (chain.get('assets')[0].get('staking')):
            return True
        return False

    dict = {
        "📚 Operation History": has_transfer_history,
        "✨ Multi assets": has_orml_or_asset,
        "📈 Staking analytics": has_staking_analytics,
        "🥞 Staking rewards": has_rewards_history
    }

    if (chain == None):
        return list(dict.keys())[0]

    features = [feature for feature,
                criteria in dict.items() if criteria(chain) == True]

    return '<br />'.join(features)


def send_http_request(url):
    try:
        response = requests.get(url)
    except requests.exceptions.RequestException as e:
        raise SystemExit(e)

    return json.loads(response.text)


def remove_hex_prefix(hex_string):
    return hex_string[2:]


if __name__ == '__main__':

    dir_name = 'gh-pages-temp'
    try:
        os.makedirs(dir_name)
        print("Directory ", dir_name,  " Created ")
    except FileExistsError:
        print("Directory ", dir_name,  " already exists")

    with open("./gh-pages-temp/README.md", "w") as f:
        f.write(readme.render(
            dapps_table=generate_networks_list()
        ))
