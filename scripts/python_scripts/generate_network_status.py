#!/usr/bin/env python3

import asyncio
import json
import os
import requests
import yaml
from jinja2 import Template

from os import listdir
from os.path import isfile, join
from pytablewriter import MarkdownTableWriter
from telegram_notifications import send_telegram_message
from subquery_cli import use_subquery_cli

subquery_cli_version = '0.2.10'
token = os.getenv("SUBQUERY_TOKEN")
nova_network_list = "https://raw.githubusercontent.com/nova-wallet/nova-utils/master/chains/v7/chains_dev.json"
skip_projects_list = [] # use to skip projects from telegram notifications

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
    writer = MarkdownTableWriter(
        headers=["--", "Network", "Features", "Stage status",
                 "Prod status", "Stage commit", "Prod commit"],
        value_matrix=generate_value_matrix(),
        margin=1
    )
    writer.write_table()
    return writer


def get_networks_list(folder):
    onlyfiles = [f for f in listdir(folder) if isfile(join(folder, f))]
    network_array = [name.split('.')[0] for name in onlyfiles if '.yaml' in name and 'project.yaml' not in name]
    return network_array


def get_deployments_list(network: str):
    deployments = use_subquery_cli(subquery_cli_version, '--token', token, 'deployment',
                                   'list', '--key', 'nova-wallet-'+network, '--org', 'nova-wallet', '-o', 'json')
    production_instance = None
    stage_instance = None

    for instance in json.loads(deployments):
        if (instance.get('type') == 'primary'):
            if (production_instance): continue
            production_instance = instance
        else:
            if (stage_instance): continue
            stage_instance = instance

    return production_instance, stage_instance


def get_percentage(network, project_id):
    try:
        percentage = use_subquery_cli(subquery_cli_version, '--token', token, 'deployment',
                                  'sync-status', '--id', str(project_id), '--key', 'nova-wallet-'+network, '--org', 'nova-wallet')
        status = percentage.split("percent: ")[1:]
        return status[0].split('%')[0:][0].split('.')[0]
    except:
        return '0'


def generate_progress_status(network):
    prod, stage = get_deployments_list(network)

    def fill_status_bar(instance):
        if (instance):
            commit = instance.get('version')[0:8]
            if (instance.get('status') == 'processing'):
                progress_bar = '![0](https://progress-bar.dev/0?title=Processing...)'
            elif (instance.get('status') == 'error' and get_percentage(network, instance.get('id')) == '0'):
                progress_bar = '![0](https://progress-bar.dev/0?title=Error)'
                if network not in skip_projects_list:
                    asyncio.run(send_telegram_message(
                            f"⚠️ SubQuery project error ⚠️\n{network.title()} indexer is unhealthy\!\nProject URL: [Link to project](https://project.subquery.network/orgs/nova-wallet/projects/{instance['projectKey'].split('/')[1]}/deployments?slot={instance['type']})\nExplorer URL: [Link to explorer](https://explorer.subquery.network/subquery/{instance['projectKey']})\nEnvironment: {instance['type'].capitalize()}\n"
                        ))
            else:
                percent = get_percentage(network, instance.get('id'))
                progress_bar = '![%s](https://progress-bar.dev/%s?title=%s)' % (
                    percent, percent, instance.get('type').capitalize())
        else:
            progress_bar = '![0](https://progress-bar.dev/0?title=N/A)'
            commit = '-'
        return progress_bar, commit

    prod_status, prod_commit = fill_status_bar(prod)
    stage_status, stage_commit = fill_status_bar(stage)

    return prod_status, prod_commit, stage_status, stage_commit


def generate_value_matrix():
    network_list = generate_network_list(nova_network_list)
    returning_array = []
    for network in network_list:
        network_data_array = []
        network_data_array.append(
            "[%s](https://explorer.subquery.network/subquery/nova-wallet/nova-wallet-%s)" % (
                network.get('name').title(), network.get('name'))
        )
        prod_status, prod_commit, stage_status, stage_comit = generate_progress_status(
            network.get('name'))
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


def generate_network_list(url):
    feature_list = []
    chains_list = send_http_request(url)
    available_projects = get_networks_list(folder="./")
    for project in available_projects:
        with open("./%s.yaml" % project, 'r') as stream:
            project_data = yaml.safe_load(stream)
        project_genesis = remove_hex_prefix(project_data.get('network').get('chainId'))
        chain = next(iter([chain for chain in chains_list if chain.get('chainId') == project_genesis]), None)
        feature_list.append({
                "name": project,
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
		"📚 Operation History" : has_transfer_history,
		"✨ Multi assets" : has_orml_or_asset,
		"📈 Staking analytics" : has_staking_analytics,
		"🥞 Staking rewards": has_rewards_history
	}

	if (chain == None):
		return list(dict.keys())[0]

	features = [feature for feature, criteria in dict.items() if criteria(chain) == True]

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

    dir_name = 'gh-pages'
    try:
        os.makedirs(dir_name)
        print("Directory ", dir_name,  " Created ")
    except FileExistsError:
        print("Directory ", dir_name,  " already exists")

    with open("./gh-pages/README.md", "w") as f:
        f.write(readme.render(
            dapps_table=generate_networks_list()
        ))
