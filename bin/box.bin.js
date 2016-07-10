#! /usr/bin/env node

require('colors')

var Box = require('../lib').Box

var args = require('yargs')
    .usage('Usage: $0 command [args]')
    .demand(1)
    .help('h')
    .alias('h', 'help')
    .argv

var box = new Box('papyros')
    .mount('/home/mspencer/Developer', '/developer')

box.root = '/developer/hawaiios'

var command = args._[0]
var arg = args._.length > 1 ? args._[1] : undefined

if (command == 'install')
    box.installDependencies()
else if (command == 'pull')
    box.pull(arg)
else if (command == 'status')
    box.status(arg)
else if (command == 'build')
    box.build(arg)
else if (command == 'test')
    box.test(arg)
else if (command == 'run')
    box.run(arg)
else if (command == 'configure')
    box.configure(arg)
else if (command == 'shell')
    box.shell()
