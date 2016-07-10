import fs from 'async-file'
import path from 'path'
import yaml from 'yamljs'
import username from 'username'
import 'colors'
import {Chroot, exec} from './chroot'
import {findFile} from './util'

export class Box extends Chroot {
    constructor(name) {
        super(`/var/lib/machines/${name}`)

        const configFilename = findFile('box.yml')

        this.sourceDir = path.dirname(configFilename)
        this.config = yaml.load(configFilename)
        this.root = ''

        exec('xhost +local: > /dev/null')

        this.mount('/tmp/.X11-unix')
        this.mount('/dev/shm')
        this.mount('/run/user/1000', '/run/user/host')
        this.setenv('DISPLAY', ':0')
        this.setenv('XDG_RUNTIME_DIR', '/run/user/host')
    }

    print(text, color, { bold = true, secondary } = {}) {
        const bgColor = `bg${color[0].toUpperCase()}${color.slice(1)}`

        text = ` ${text} `

        if (bold)
            text = text.bold

        if (color === 'grey')
            text = text.grey.bgWhite.inverse
        else
            text = text[bgColor]

        text += ''[color]

        if (secondary)
            text += ` ${secondary}`

        console.log(text)
    }

    getModule(name) {
        const config = this.config['modules'][name]

        return new Module(this, name, config)
    }

    async installDependencies() {
        this.print('Installing dependencies', 'magenta')
        await this.installPackages(this.config['dependencies'])
    }

    async perModule(moduleName, callback) {
        if (moduleName) {
            await callback(this.getModule(moduleName))
        } else {
            for (const [name, config] of Object.entries(this.config['modules'])) {
                const module = new Module(this, name, config)

                await callback(module)
            }
        }
    }

    async execTarget(moduleName, target, {printSuccess = true} = {}) {
        try {
            await this.perModule(moduleName, (module) => module[target]())

            if (printSuccess)
                this.print('Success', 'green')
        } catch (error) {
            this.print(error ? `Failure: ${error}` : 'Failure!', 'red')
        }
    }

    async pull(moduleName) {
        await this.execTarget(moduleName, 'pull')
    }

    async status(moduleName) {
        if (moduleName) {
            if (await this.getModule(moduleName).hasUncommitedChanges()) {
                this.print('Uncommitted changes', 'yellow', { secondary: moduleName })
            }
        } else {
            const modules = []

            for (const [name, config] of Object.entries(this.config['modules'])) {
                const module = new Module(this, name, config)

                if (await module.hasUncommitedChanges())
                    modules.push(name)
            }

            if (modules.length > 0) {
                this.print('Uncommitted changes', 'yellow')
                for (const module of modules) {
                    console.log(` - ${module}`)
                }
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
        this.local_workdir = path.resolve(chroot.sourceDir, `${name}/build`)
        this.workdir = path.join(chroot.root, `${name}/build`)
    }

    hasTarget(target) {
        return this.config[target] != null
    }

    async buildDirExists() {
        return await fs.exists(this.local_workdir)
    }

    async pull() {
        this.chroot.print(`Pulling updates for ${this.name}`, 'magenta')
        await exec('git pull', { workdir: module.local_workdir })
    }

    async hasUncommitedChanges() {
        try {
            await exec('git diff-index --quiet HEAD --', { workdir: this.local_workdir })
            return false
        } catch (error) {
            return true
        }
    }

    async configure() {
        this.chroot.print(`Configuring ${this.name}`, 'blue')

        if (!(await this.buildDirExists())) {
            await fs.mkdir(this.local_workdir)
        }

        await this.execTarget('configure')
    }

    async build() {
        if (!(await this.buildDirExists())) {
            this.chroot.print(`Configuring ${this.name}`, 'blue')
            await fs.mkdir(this.local_workdir)
            await this.execTarget('configure')
        }

        this.chroot.print(`Building ${this.name}`, 'blue')
        await this.execTarget('build')
    }

    async test() {
        if (!this.hasTarget('test'))
            return

        await this.build()

        this.chroot.print(`Testing ${this.name}`, 'blue')

        await this.execTarget('test', {prefix: 'xvfb-run -a -s "-screen 0 800x600x24"'})
    }

    async run() {
        if (!this.hasTarget('run'))
            return

        const user = await username()

        await this.build()

        this.chroot.print(`Running ${this.name}`, 'blue')

        await this.execTarget('run', {user: user})
    }

    async execTarget(target, { prefix, user } = {}) {
        if (!this.hasTarget(target))
            return

        const steps = this.config[target] instanceof Array ? this.config[target]
                                                           : [this.config[target]]

        for (let step of steps) {
            this.chroot.print(`+ ${step}`, 'grey', {bold: false})

            step = step.replace('${srcdir}', '..')

            if (prefix)
                step = `${prefix} ${step}`

            await this.chroot.exec(step, { workdir: this.workdir, user: user })
        }
    }
}
