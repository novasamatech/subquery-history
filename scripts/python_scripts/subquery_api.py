from typing import List
import requests
import json


class DeploymentInstance():

    def __init__(self, **kwargs) -> None:

        for key, value in kwargs.items():
            setattr(self, key, value)


class SubQueryProject():

    deployments = List[DeploymentInstance]

    def __init__(self, **kwargs) -> None:

        self.deployments = []
        for key, value in kwargs.items():
            if key == 'deployments':
                deployments = []
                for deployment in value:
                    deployments.append(DeploymentInstance(**deployment))
                setattr(self, key, deployments)

            setattr(self, key, value)

    def add_deployment(self, item):
        # Append the item to the deployments list
        self.deployments.append(item)


class SubQueryDeploymentAPI():

    org_projects = [SubQueryProject]
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
            path=f"/subqueries/{deployment.projectKey}/deployments/{deployment.id}/sync-status"
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

        for deployment in deployments:
            project.add_deployment(DeploymentInstance(**deployment))

        return project.deployments
