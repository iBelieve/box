import os
import os.path
from .chroot import Chroot
from .util import load_yaml, save_yaml


class Box(object):
    config = {}

    def __init__(self):
        self.path = self.find_root()

        self.chroot = Chroot(self.resolve('.box'))
        self.chroot.bind_ro = [self.path + ':/source']

        if os.path.exists(self.config_file):
            self.config = load_yaml(self.config_file)

    def create(self, force=False):
        self.chroot.create(force=force)
        if self.config:
            self.chroot.install(self.config.get('depends', []))
        self.save_config()
        self.chroot.run('mkdir /build')

    def clean(self):
        self.create(force=True)

    def destroy(self):
        print('Error: destroy not implemented yet!')

    def install(self, *packages):
        self.chroot.install(packages)
        self.config['depends'] = list(set(self.config.get('depends', [])).union(packages))
        self.save_config()

    def build(self):
        if not self.config.get('build'):
            print('Error: No build steps specified in the Boxfile.')

        self._run(self.config['build'])

    def run(self, cmd=None):
        if 'run' in self.config:
            cmd = self.config['run']

        if cmd is None:
            print('Error: No command specified on the command line or in the Boxfile.')
            return

        self._run(cmd)

    def check(self, cmd=None):
        if 'check' in self.config:
            cmd = self.config['check']

        if cmd is None:
            print('Error: No check command specified in the Boxfile.')
        return

        self._run(cmd)

    def _run(self, cmd):
        if isinstance(cmd, list):
            for one_cmd in cmd:
                self._run(one_cmd)
        else:
            self.chroot.run(cmd.format(src='/source'), workdir='/build')

    def find_root(self):
        cwd = os.getcwd()
        parts = cwd.split(os.path.sep)
        for index in range(len(parts), 0, -1):
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
