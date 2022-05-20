import subprocess
import wget
import os
import zipfile
import os
import platform

def get_subquery_cli(subquery_cli_version):

    download_url = "https://github.com/fewensa/subquery-cli/releases/download/v" + subquery_cli_version
    temporary_path = "./temporary"

    current_platform = platform.system()

    if current_platform == "Linux":
        download_url += "/subquery-linux-x86_64.zip"
    elif current_platform == "Darwin":
        download_url += "/subquery-macos-x86_64.zip"
    elif current_platform == "Windows":
        download_url += "/subquery-windows-x86_64.zip"
    else:
        raise ValueError('Can\'t to recognize the operating system')

    try:
        os.makedirs(temporary_path, exist_ok=False)
        wget.download(download_url, out = temporary_path)
        for file in os.listdir(temporary_path):
            with zipfile.ZipFile(temporary_path+'/'+file) as item:
                item.extractall(temporary_path)
    except:
        pass

    subprocess.call(['chmod', '-R', '777', temporary_path])

    return temporary_path


def use_subquery_cli(subquery_cli_version, *args):
    temporary_path = get_subquery_cli(subquery_cli_version)
    data_from_subquery = subprocess.check_output([temporary_path+'/subquery', *args]).decode()

    return data_from_subquery



if __name__ == "__main__":
    # token = os.environ['SUBQUERY_TOKEN', '']
    token=''
    # project_key = os.environ['PROJECT_KEY', '']
    project_key = ''
    subquery_cli_version = '0.2.4'

    use_subquery_cli(subquery_cli_version, '--token', token, 'deployment', 'list', '-o', 'json', '--org', 'nova-wallet', '--key', project_key)