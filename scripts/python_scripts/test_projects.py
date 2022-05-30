import json
import pytest
import os
from subquery_cli import use_subquery_cli

subquery_cli_version = '0.2.4'
token = os.environ['SUBQUERY_TOKEN']
project_key = os.environ['PROJECT_KEY']


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
    status = sync_status.split("percent: ")[1:]
    assertion_value = status[0].split('%')[0:][0]
    assert assertion_value == '100.00'
