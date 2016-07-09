import shell from 'shelljs'

export class Chroot {
    constructor(workdir) {
        this.workdir = workdir || process.cwd()
        this.binds = []
    }

    mount(source, dest) {
        this.binds.push(`${source}:${dest}`)
        return this
    }

    async create(packages) {
        await pacstrap(this.workdir, packages)
    }

    async installPackages(packages) {
        if (packages.join)
            packages = packages.join(' ')

        await this.run(`pacman -S --noconfirm ${packages}`)
    }

    async run(command, { workdir } = {}) {
        await systemd_nspawn(this.workdir, command, { workdir: workdir, binds: this.binds })
    }
}

async function pacstrap(workdir, packages) {
    await run(['pacstrap', '-cd', workdir, 'base', 'base-devel'] + packages)
}

async function systemd_nspawn(chrootPath, command, { workdir, binds = [] } = {}) {
    let args = []

    if (workdir)
        args.push(`--chdir=${workdir}`)

    args = args.concat(binds.map(bind => `--bind=${bind}`))

    await run(`sudo systemd-nspawn -D ${chrootPath} --quiet --as-pid2 ${args.join(' ')} ${command}`)
}

async function run(command, { workdir } = {}) {
    return new Promise((resolve, reject) => {
        shell.exec(command, { cwd: workdir }, (code, stdout, stderr) => {
            if (code === 0)
                resolve(stdout)
            else
                reject(stderr)
        })
    })
}
