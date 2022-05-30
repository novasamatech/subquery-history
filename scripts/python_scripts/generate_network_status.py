#!/usr/bin/env python3


import json
import os
from jinja2 import Template
from pytablewriter import MarkdownTableWriter
from subquery_cli import use_subquery_cli

subquery_cli_version = '0.2.5'
token = os.environ['SUBQUERY_TOKEN']

readme = Template("""
Projects' status is updated every 4 hours
# List of deployed projects

{{dapps_table}}
""")


def generate_networks_list():
    writer = MarkdownTableWriter(
        headers=["--", "Network", "Stage status",
                 "Prod status", "Stage commit", "Prod commit"],
        value_matrix=generate_value_matrix(),
        margin=1
    )
    writer.write_table()
    return writer


def get_networks_list(folder):
    sub_folders = [name for name in os.listdir(
        folder) if os.path.isdir(os.path.join(folder, name))]
    return sub_folders


def get_deployments_list(network: str):
    deployments = use_subquery_cli(subquery_cli_version, '--token', token, 'deployment',
                                   'list', '--key', 'nova-wallet-'+network, '--org', 'nova-wallet', '-o', 'json')
    production_instance = None
    stage_instance = None

    for instance in json.loads(deployments):
        if (instance.get('type') == 'primary'):
            production_instance = instance
        else:
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
            else:
                percent = get_percentage(network, instance.get('id'))
                progress_bar = '![%s](https://progress-bar.dev/%s?title=%s)' % (
                    percent, percent, instance.get('type').capitalize())
        else:
            progress_bar = '![0](https://progress-bar.dev/0?title=Not%20Deployed)'
            commit = '-'
        return progress_bar, commit

    prod_status, prod_commit = fill_status_bar(prod)
    stage_status, stage_commit = fill_status_bar(stage)

    return prod_status, prod_commit, stage_status, stage_commit


def generate_value_matrix():
    network_list = get_networks_list(folder="./networks")
    returning_array = []
    for network in network_list:
        network_data_array = []
        network_data_array.append(
            "[%s](https://explorer.subquery.network/subquery/nova-wallet/nova-wallet-%s)" % (
                network.title(), network)
        )
        prod_status, prod_commit, stage_status, stage_comit = generate_progress_status(
            network)
        network_data_array.append(stage_status)
        network_data_array.append(prod_status)
        network_data_array.append(stage_comit)
        network_data_array.append(prod_commit)
        returning_array.append(network_data_array)
        print('%s generated!' % network.title())
    returning_array.sort()
    increment = iter(range(1, len(returning_array)+1))
    [network.insert(0, next(increment)) for network in returning_array]
    return returning_array


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
