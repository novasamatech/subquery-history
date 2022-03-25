import json
import os
import pytest
from subquery_cli import use_subquery_cli

subquery_cli_version = '0.2.4'
# token = os.environ['SUBQUERY_TOKEN', '']
token = 'NDA1NjA2NjA=YNZB8hUzSNDRGE2zTQXY'
# project_key = os.environ['PROJECT_KEY', '']
project_key = 'nova-wallet-karura'


@pytest.fixture
def get_project_data():
    project_data = json.loads(
            use_subquery_cli(
                subquery_cli_version, '--token', token, 'deployment', 'list', '-o', 'json', '--org', 'nova-wallet', '--key', project_key
            ))
    stage_project = next(
        item for item in project_data if item["type"] == "stage")
    return stage_project


def test_project_status(get_project_data):
        assert get_project_data['status'] == 'running'


def test_sync_status_test(get_project_data):
    sync_status = use_subquery_cli(
        subquery_cli_version, '--token', token, 'deployment', 'sync-status', '--id', str(get_project_data['id']), '--key', project_key, '--org', 'nova-wallet')
    print(sync_status)
    formated_status = sync_status.split(" ")
    for item in formated_status:
        
    print(formated_status)