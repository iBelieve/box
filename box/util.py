import subprocess
import yaml


def run(cmd, workdir=None, capture_stdout=True, sudo=False):
    if sudo:
        cmd = ['sudo'] + cmd
    if capture_stdout:
        completion = subprocess.run(cmd, cwd=workdir, check=True, universal_newlines=True,
                                    stdout=subprocess.PIPE)
        return completion.stdout.strip()
    else:
        return subprocess.run(cmd, cwd=workdir, check=True)


def load_yaml(fileName):
    try:
        from yaml import CLoader as Loader
    except ImportError:
        from yaml import Loader
    stream = open(fileName, "r")
    return yaml.load(stream, Loader=Loader)


def save_yaml(fileName, data):
    with open(fileName, 'w') as file:
        file.write(yaml.dump(data, default_flow_style=False))
