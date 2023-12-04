import json
import requests

from pytablewriter import MarkdownTableWriter
from telegram_notifications import TelegramNotifications
from subquery_api import SubQueryDeploymentAPI, SubQueryProject, DeploymentInstance


class ProjectTableGenerator():

    def generate_table(self, sub_query: SubQueryDeploymentAPI, nova_network_list_url: str):

        writer = MarkdownTableWriter(
            headers=["--", "Network", "Features", "Stage status",
                     "Prod status", "Stage commit", "Prod commit"],
            value_matrix=self.generate_value_matrix_for_table(
                nova_network_list_url, sub_query),
            margin=1
        )
        writer.write_table()

        return writer

    def generate_value_matrix_for_table(self, nova_network_list_url: str, subquery: SubQueryDeploymentAPI):
        network_list = self.generate_network_list(
            nova_network_list_url, subquery)
        returning_array = []
        for network in network_list:
            network_data_array = []
            subquery_project_data = subquery.find_project_by_parameter('name', network.get('name'))
            network_data_array.append(
                "[%s](https://explorer.subquery.network/subquery/%s)" % (
                    network.get('name').title(), subquery_project_data.key)
            )
            prod_status, prod_commit, stage_status, stage_comit = self.generate_progress_status(
                next(filter(
                    lambda project: project.name == network['name'], subquery.org_projects)),
                subquery=subquery
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

    def generate_network_list(self, chains_url: str, subquery: SubQueryDeploymentAPI):
        feature_list = []
        chains_list = self._send_http_request(chains_url)
        available_projects = subquery.org_projects
        for project in available_projects:
            try:
                prod_genesis = [deploy.configuration['chainId']
                                for deploy in project.deployments if deploy.type == 'primary']
            except:
                print(
                    f"Network: {project.network} has old deployment, need to redeploy")

            if len(prod_genesis) == 0:  # Skip undeployed projects
                continue
            project_genesis = self._remove_hex_prefix(prod_genesis[0])
            chain = next(iter([chain for chain in chains_list if chain.get(
                'chainId') == project_genesis]), None)
            feature_list.append({
                "name": project.name,
                "genesis": project_genesis,
                "features": self.check_features(chain)
            })
        return feature_list

    def generate_progress_status(self, project: SubQueryProject, subquery: SubQueryDeploymentAPI):
        prod, stage = None, None
        for deployment in project.deployments:
            if deployment.type == 'primary':
                prod = deployment
            elif deployment.type == 'stage':
                stage = deployment
            else:
                raise Exception(
                    f"Unknown deployment type: {deployment.type} in project: {project}")

        prod_status, prod_commit = self.fill_status_bar(prod, project, subquery)
        stage_status, stage_commit = self.fill_status_bar(stage, project, subquery)

        return prod_status, prod_commit, stage_status, stage_commit

    def fill_status_bar(self, instance: DeploymentInstance, project: SubQueryProject, subquery: SubQueryDeploymentAPI):
        if not instance:
            return '![0](https://progress-bar.dev/0?title=N/A)', '-'

        commit = instance.version[0:8]

        if instance.status == 'processing':
            return '![0](https://progress-bar.dev/0?title=Processing...)', commit

        if instance.status == 'error' and self.get_sync_percentage(instance, project, subquery) == '0':
            return '![0](https://progress-bar.dev/0?title=Error)', commit

        percent = self.get_sync_percentage(instance, project, subquery)
        return f'![{percent}](https://progress-bar.dev/{percent}?title={instance.type.capitalize()})', commit

    def is_sync_status_valid(self, sync_status):
        if sync_status is None:
            return False
        return all(key in sync_status and sync_status[key] is not None for key in ['processingBlock', 'targetBlock'])

    def get_sync_percentage(self, instance: DeploymentInstance, project: SubQueryProject, subquery: SubQueryDeploymentAPI) -> str:
        if not self.is_sync_status_valid(instance.sync_status):
            logs = subquery.get_logs(project.key, instance.id)
            target_block, processing_block = subquery.parse_logs(logs)
        else:
            processing_block = instance.sync_status.get('processingBlock')
            target_block = instance.sync_status.get('targetBlock')

        telegram = TelegramNotifications()

        if processing_block and target_block:
            if processing_block != -1:
                return str(int((processing_block / target_block) * 100))
            else:
                telegram.add_row_in_telegram_notification(project=project, instance=instance)
                return '0'
        else:
            telegram.add_row_in_telegram_notification(project=project, instance=instance)
            return '0'

    def check_features(self, chain: json):
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

    def _send_http_request(self, url: str):
        try:
            response = requests.get(url)
        except requests.exceptions.RequestException as e:
            raise SystemExit(e)

        return json.loads(response.text)

    def _remove_hex_prefix(self, hex_string):
        return hex_string[2:]
