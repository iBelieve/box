import {spawn} from 'child_process'

export class Chroot {
    constructor(workdir) {
        this.workdir = workdir || process.cwd()
        this.binds = []
        this.setenvs = []
    }

    mount(source, dest) {
        const bind = dest ? `${source}:${dest}` : source
        this.binds.push(bind)
        return this
    }

    setenv(name, value) {
        const env = value ? `${name}=${value}` : name
        this.setenvs.push(env)
        return this
    }

    async create(packages) {
        await pacstrap(this.workdir, packages)
    }

    async installPackages(packages) {
        if (packages.join)
            packages = packages.join(' ')

        await this.exec(`pacman -S --noconfirm ${packages}`)
    }

    async exec(command, { workdir, user } = {}) {
        await systemd_nspawn(this.workdir, command, { workdir: workdir, user: user,
                                                      binds: this.binds,
                                                      setenvs: this.setenvs })
    }
}

async function pacstrap(workdir, packages) {
    await exec(['pacstrap', '-cd', workdir, 'base', 'base-devel'] + packages)
}

async function systemd_nspawn(chrootPath, command, { workdir, user, binds = [], setenvs = [] } = {}) {
    let args = []

    if (workdir)
        args.push(`--chdir=${workdir}`)

    if (user)
        args.push(`--user=${user}`)

    args = args.concat(binds.map(bind => `--bind=${bind}`))
    args = args.concat(setenvs.map(setenv => `--setenv=${setenv}`))

    await exec(`sudo systemd-nspawn -D ${chrootPath} --quiet --as-pid2 ${args.join(' ')} ${command}`)
}

export async function exec(command, { workdir } = {}) {
    return new Promise((resolve, reject) => {
        const child = spawn(command, { cwd: workdir, stdio: 'inherit', shell: true })

        child.on('exit', (code) => {
            if (code === 0)
                resolve()
            else
                reject()
        })

        child.on('error', (error) => {
            reject(error)
        })
    })
}
