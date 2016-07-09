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

    async installDependencies() {
        this.status('Installing dependencies', 'magenta')
        await this.installPackages(this.config['dependencies'])
    }

    async configure(moduleName) {
        if (moduleName) {
            await this.configureModule(moduleName, this.config['modules'][moduleName])
        } else {
            for (const [name, steps] of Object.entries(this.config['modules'])) {
                await this.configureModule(name, steps)
            }
        }
    }

    async build(moduleName) {
        if (moduleName) {
            await this.buildModule(moduleName, this.config['modules'][moduleName])
        } else {
            for (const [name, steps] of Object.entries(this.config['modules'])) {
                await this.buildModule(name, steps)
            }
        }
    }

    async test(moduleName) {
        if (moduleName) {
            await this.testModule(moduleName, this.config['modules'][moduleName])
        } else {
            for (const [name, steps] of Object.entries(this.config['modules'])) {
                await this.testModule(name, steps)
            }
        }
    }

    async run(moduleName) {
        await this.runModule(moduleName, this.config['modules'][moduleName])
    }

    async configureModule(name, module) {
        this.status(`Configuring ${name}`, 'blue')

        const workdir = `${name}/build`

        if (!(await fs.exists(workdir))) {
            await fs.mkdir(workdir)
        }

        await this.execTarget(module['configure'], { workdir: path.join(this.root, workdir) })
    }

    async buildModule(name, module) {
        const workdir = `${name}/build`

        if (!(await fs.exists(workdir))) {
            this.status(`Configuring ${name}`, 'blue')
            await fs.mkdir(workdir)
            await this.execTarget(module['configure'], { workdir: path.join(this.root, workdir) })
        }

        this.status(`Building ${name}`, 'blue')

        await this.execTarget(module['build'], { workdir: path.join(this.root, workdir) })
    }

    async testModule(name, module) {
        const workdir = `${name}/build`

        await this.buildModule(name, module)

        this.status(`Testing ${name}`, 'blue')

        await this.execTarget(module['test'], { workdir: path.join(this.root, workdir),
                                               prefix: 'xvfb-run -a -s "-screen 0 800x600x24"' })
    }

    async runModule(name, module) {
        const workdir = `${name}/build`

        await this.buildModule(name, module)

        this.status(`Running ${name}`, 'blue')

        await this.execTarget(module['run'], { workdir: path.join(this.root, workdir) })
    }

    async execTarget(target, { workdir, prefix } = {}) {
        if (target instanceof Array) {
            for (const step of target) {
                await this.execTarget(step, { workdir: workdir, prefix: prefix })
            }

            return
        }

        target = target.replace('${srcdir}', '..')

        this.status(`+ ${target}`, 'grey', {bold: false})

        if (prefix) {
            target = `${prefix} ${target}`
        }

        await this.exec(target, { workdir: workdir })
    }
}
