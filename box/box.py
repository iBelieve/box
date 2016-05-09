import os
import os.path
from .chroot import Chroot
from .util import load_yaml, save_yaml


class Box(object):
    config = {}

    def __init__(self):
        self.path = self.find_root()

        self.chroot = Chroot(self.resolve('.box'))

        if os.path.exists(self.config_file):
            self.config = load_yaml(self.config_file)

    def create(self, force=False):
        self.chroot.create(force=force)
        if self.config:
            self.chroot.install(self.config.get('depends', []))
        self.save_config()

    def clean(self):
        self.create(force=True)

    def install(self, *packages):
        self.chroot.install(packages)
        self.config['depends'] = list(set(self.config.get('depends', [])).union(packages))
        self.save_config()

    def build(self):
        for cmd in self.config.get('build', []):
            self.chroot.run(cmd)

    def run(self, cmd=None):
        if 'run' in self.config:
            cmd = self.config['run']

        if cmd is None:
            print('No command specified on the command line or in the Boxfile')
            return

        self.chroot.run(cmd)

    def find_root(self):
        cwd = os.getcwd()
        parts = cwd.split(os.path.sep)
        for index in reversed(range(0, len(parts))):
            path = os.path.sep.join(parts[:index])
            if os.path.exists(os.path.join(path, 'Boxfile')):
                return path

        return cwd

    def resolve(self, path):
        return os.path.abspath(os.path.join(self.path, path))

    def save_config(self):
        save_yaml(self.config_file, self.config)

    @property
    def config_file(self):
        return self.resolve('Boxfile')
