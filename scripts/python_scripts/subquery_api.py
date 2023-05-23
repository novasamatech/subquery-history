from typing import List
import requests


class DeploymentInstance():

    def __init__(self, **kwargs) -> None:
        self.id = kwargs['id']
        self.project_key = kwargs['projectKey']
        self.version = kwargs['version']
        self.status = kwargs['status']
        self.type = kwargs['type']
        self.configuration = kwargs['configuration']


class SubQueryProject():

    def __init__(self, **kwargs) -> None:
        self.id = kwargs['id']
        self.key = kwargs['key']
        self.name = kwargs['name']
        self.network = kwargs['network']
        self.metadata = kwargs['metadata']
        self.query_url = kwargs['queryUrl']
        self.deployments: List[DeploymentInstance] = []

        deployments = kwargs.get('deployments')
        if deployments:
            for deployment in deployments:
                self.deployments.append(DeploymentInstance(**deployment))


class SubQueryDeploymentAPI():

    base_url = "https://api.subquery.network"

    def __init__(self, auth_token, org) -> None:
        self.org = org
        self.headers = {
            'authority': 'api.subquery.network',
            'accept': 'application/json, text/plain, */*',
            'accept-language': 'en-GB,en-US;q=0.9,en;q=0.8,ru;q=0.7',
            'origin': 'https://managedservice.subquery.network',
            'sec-ch-ua': '"Chromium";v="112", "Google Chrome";v="112", "Not:A-Brand";v="99"',
            'sec-ch-ua-mobile': '?0',
            'sec-ch-ua-platform': '"macOS"',
            'sec-fetch-dest': 'empty',
            'sec-fetch-mode': 'cors',
            'sec-fetch-site': 'same-site',
            'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/112.0.0.0 Safari/537.36',
            'Authorization': f'Bearer {auth_token}',
        }

    def _send_request(self, method, path, payload=None):
        try:
            response = requests.request(
                method, self.base_url + path, headers=self.headers, data=payload)
            if response.status_code == 401:
                raise Exception(f"Unautorised:\n{response}")

            return response
        except Exception as e:
            raise Exception(
                f"Can't request to: {path} by method: {method} and payload: {payload} \nException: {e}")

    def collect_all_project_data(self) -> List[SubQueryProject]:
        self.get_all_projects_for_organisation()
        print(
            f"Organisation: {self.org}\nHas {len(self.org_projects)} projects")
        print(f"Process of getting deployments have been started.")
        for project in self.org_projects:
            self.get_deployments_for_project(project)
            print(
                f"Project: {project.network} received: {len(project.deployments)} deployments.")
            for deployment in project.deployments:
                self.get_sync_status_for_deployment(deployment)
                print(
                    f"Deployment for {project.network} status: {deployment.sync_status}, env: {deployment.type}")

        return self.org_projects

    def get_all_projects_for_organisation(self) -> List[SubQueryProject]:
        projects = self._send_request(
            method="GET", path=f"/user/projects?account={self.org}").json()

        self.org_projects = [SubQueryProject(**project) for project in projects]

        return self.org_projects

    def get_sync_status_for_deployment(self, deployment: DeploymentInstance) -> DeploymentInstance:
        if len(self.org_projects) == 0:
            print("org_projects is empty, use get_all_projects_for_organisation first")

        sync_status = self._send_request(
            method="GET",
            path=f"/subqueries/{deployment.project_key}/deployments/{deployment.id}/sync-status"
        ).json()
        deployment.__setattr__('sync_status', sync_status)

        return deployment

    def get_deployments_for_project(self, project: SubQueryProject) -> List[DeploymentInstance]:
        if len(self.org_projects) == 0:
            print("org_projects is empty, use get_all_projects_for_organisation first")

        deployments = self._send_request(
            method="GET",
            path=f"/subqueries/{project.key}/deployments"
        ).json()

        project.deployments = [DeploymentInstance(**deployment) for deployment in deployments]

        return project.deployments

    def find_project_by_parameter(self, parameter_name, parameter_value):
        found_project = [project for project in self.org_projects if project.__getattribute__(
            parameter_name) == parameter_value]
        if found_project:
            print("Project found")
            for obj in found_project:
                return obj
        else:
            print("Project not found.")
