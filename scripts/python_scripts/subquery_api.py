import requests
import json


class SubQueryDeploymentAPI():

    org_projects = []
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

    def collect_all_data(self) -> None:
        self.get_all_projects_for_organisation()
        self.get_deployments()
        self.get_sync_status_for_all_projects()

    def read_data_from_file(self, file_path):
        with open(file_path, encoding='UTF-8') as fin:
            self.org_projects = json.load(fin)

    def write_all_data_in_file(self, name):
        with open(name, "w") as file:
            file.write(json.dumps(self.org_projects))

    def get_all_projects_for_organisation(self):
        projects = self._send_request(
            method="GET", path=f"/user/projects?account={self.org}")
        self.org_projects = projects.json()
        print(
            f"Organisation: {self.org}\nHas {len(self.org_projects)} projects")

        return self.org_projects

    def get_sync_status_for_all_projects(self) -> None:
        if len(self.org_projects) == 0:
            print("org_projects is empty, use get_all_projects_for_organisation first")

        print(f"Process of getting sync status have been started.")
        for project in self.org_projects:
            for deployment in project['deployments']:
                sync_status = self._send_request(
                    method="GET",
                    path=f"/subqueries/{project['key']}/deployments/{deployment['id']}/sync-status"
                ).json()
                deployment['syncStatus'] = sync_status
                print(
                    f"Deployment for {project['network']} status: {sync_status}, env: {deployment['type']}")

    def get_deployments(self) -> None:
        if len(self.org_projects) == 0:
            print("org_projects is empty, use get_all_projects_for_organisation first")

        print(f"Process of getting deployments have been started.")

        for project in self.org_projects:
            deployments = self._send_request(
                method="GET",
                path=f"/subqueries/{project['key']}/deployments"
            ).json()
            print(
                f"Project: {project['network']} received: {len(deployments)} deployments.")
            project['deployments'] = deployments
