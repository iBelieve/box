import fs from 'async-file'
import path from 'path'
import yaml from 'yamljs'
import 'colors'
import {Chroot, exec} from './chroot'

export class Box extends Chroot {
    constructor(name) {
        super(`/var/lib/machines/${name}`)
        this.config = yaml.load('box.yml')
        this.root = ''

        exec('xhost +local:')

        this.mount('/tmp/.X11-unix')
        this.mount('/dev/shm')
        this.mount('/run/user/1000', '/run/user/host')
        this.setenv('DISPLAY', ':0')
        this.setenv('XDG_RUNTIME_DIR', '/run/user/host')
    }

    status(text, color, { bold = true } = {}) {
        const bgColor = `bg${color[0].toUpperCase()}${color.slice(1)}`

        text = ` ${text} `

        if (bold)
            text = text.bold

        if (color === 'grey')
            text = text.grey.bgWhite.inverse
        else
            text = text[bgColor]

        text += ''[color]

        console.log(text)
    }

    getModule(name) {
        const config = this.config['modules'][name]

        return new Module(this, name, config)
    }

    async installDependencies() {
        this.status('Installing dependencies', 'magenta')
        await this.installPackages(this.config['dependencies'])
    }

    async execTarget(moduleName, target) {
        if (moduleName) {
            await this.getModule(moduleName)[target]()
        } else {
            for (const [name, config] of Object.entries(this.config['modules'])) {
                const module = new Module(this, name, config)

                await module[target]()
            }
        }
    }

    async configure(moduleName) {
        await this.execTarget(moduleName, 'configure')
    }

    async build(moduleName) {
        await this.execTarget(moduleName, 'build')
    }

    async test(moduleName) {
        await this.execTarget(moduleName, 'test')
    }

    async run(moduleName) {
        await this.execTarget(moduleName, 'run')
    }

    async shell() {
        await this.exec('bash')
    }
}

class Module {
    constructor(chroot, name, config) {
        this.chroot = chroot
        this.name = name
        this.config = config
        this.local_workdir = `${name}/build`
        this.workdir = path.join(chroot.root, this.local_workdir)
    }

    hasTarget(target) {
        return this.config[target] != null
    }

    async buildDirExists() {
        return await fs.exists(this.local_workdir)
    }

    async configure() {
        this.chroot.status(`Configuring ${this.name}`, 'blue')

        if (!(await this.buildDirExists())) {
            await fs.mkdir(this.local_workdir)
        }

        await this.execTarget('configure')
    }

    async build() {
        if (!(await this.buildDirExists())) {
            this.chroot.status(`Configuring ${this.name}`, 'blue')
            await fs.mkdir(this.local_workdir)
            await this.execTarget('configure')
        }

        this.chroot.status(`Building ${this.name}`, 'blue')
        await this.execTarget('build')
    }

    async test() {
        if (!this.hasTarget('test'))
            return

        await this.build()

        this.chroot.status(`Testing ${this.name}`, 'blue')

        await this.execTarget('test', 'xvfb-run -a -s "-screen 0 800x600x24"')
    }

    async run() {
        if (!this.hasTarget('run'))
            return

        await this.build()

        this.chroot.status(`Running ${this.name}`, 'blue')

        await this.execTarget('run')
    }

    async execTarget(target, prefix) {
        if (!this.hasTarget(target))
            return

        const steps = this.config[target] instanceof Array ? this.config[target]
                                                           : [this.config[target]]

        for (let step of steps) {
            this.chroot.status(`+ ${step}`, 'grey', {bold: false})

            step = step.replace('${srcdir}', '..')

            if (prefix)
                step = `${prefix} ${step}`

            await this.chroot.exec(step, { workdir: this.workdir })
        }
    }
}
