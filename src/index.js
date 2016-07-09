import fs from 'async-file'
import path from 'path'
import yaml from 'yamljs'
import 'colors'
import {Chroot} from './chroot'

export class Box extends Chroot {
    constructor(name) {
        super(`/var/lib/machines/${name}`)
        this.config = yaml.load('box.yml')
        this.root = ''
    }

    async installDependencies() {
        console.log('::: Installing dependencies :::'.magenta)
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

    async configureModule(name, module) {
        console.log(`::: Configuring ${name} :::`.blue)

        const workdir = `${name}/build`

        if (!(await fs.exists(workdir))) {
            await fs.mkdir(workdir)
        }

        await this.runTarget(module['configure'], { workdir: path.join(this.root, workdir) })
    }

    async buildModule(name, module) {
        const workdir = `${name}/build`

        if (!(await fs.exists(workdir))) {
            console.log(`::: Configuring ${name} :::`.blue)
            await fs.mkdir(workdir)
            await this.runTarget(module['configure'], { workdir: path.join(this.root, workdir) })
        }

        console.log(`::: Building ${name} :::`.blue)

        await this.runTarget(module['build'], { workdir: path.join(this.root, workdir) })
    }

    async testModule(name, module) {
        const workdir = `${name}/build`

        await this.buildModule(name, module)

        console.log(`::: Testing ${name} :::`.blue)

        await this.runTarget(module['test'], { workdir: path.join(this.root, workdir),
                                               prefix: 'xvfb-run -a -s "-screen 0 800x600x24"' })
    }

    async runModule(name, module) {
        console.log(`::: Running ${name} :::`.blue)

        const workdir = `${name}/build`

        await this.buildModule(name, module)

        await this.runTarget(module['run'], { workdir: path.join(this.root, workdir) })
    }

    async runTarget(target, { workdir, prefix } = {}) {
        if (target instanceof Array) {
            for (const step of target) {
                await this.runTarget(step, { workdir: workdir, prefix: prefix })
            }

            return
        }

        target = target.replace('${srcdir}', '..')

        if (prefix) {
            target = `${prefix} ${target}`
        }

        await this.run(target, { workdir: workdir })
    }
}
