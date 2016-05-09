import os
import os.path
from .helpers import arch_nspawn, mkarchroot, rsync

base_dir = os.path.expanduser('~/.boxes')


class Chroot:
    def __init__(self, path):
        self.base_dir = os.path.join(base_dir, 'archlinux')
        self.workdir = path
        self.bind_ro = []
        self.bind_rw = []

    def create(self, force=True):
        if force or not os.path.exists(self.workdir):
            self.create_base()
            rsync(self.base_dir, self.workdir, sudo=True)

    def create_base(self):
        packages = ['vim', 'xorg-server-xvfb']
        if not os.path.exists(self.base_dir):
            mkarchroot(self.base_dir, ['base-devel'])
        else:
            arch_nspawn(self.base_dir, ['pacman', '--noconfirm', '-Syu'])
        arch_nspawn(self.base_dir, ['pacman', '--noconfirm', '--needed', '-S'] + packages)

    def install(self, pkgs):
        if isinstance(pkgs, tuple):
            pkgs = list(pkgs)
        if not isinstance(pkgs, list):
            pkgs = [pkgs]

        if len(pkgs) > 0:
            arch_nspawn(self.workdir, ['pacman', '--noconfirm', '-S'] + pkgs)

    def run(self, cmd, workdir=None):
        if workdir:
            if isinstance(cmd, list):
                cmd = ' '.join(cmd)
            cmd = 'cd {} && {}'.format(workdir, cmd)
            cmd = (['bash', '-cil', cmd])
        if isinstance(cmd, str):
            cmd = cmd.split(' ')
        arch_nspawn(self.workdir, cmd, bind_ro=self.bind_ro,
                    bind_rw=self.bind_rw)
