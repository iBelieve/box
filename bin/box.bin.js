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

var promise

if (command == 'install')
    promise = box.installDependencies()
else if (command == 'build')
    promise = box.build(arg)
else if (command == 'test')
    promise = box.test(arg)
else if (command == 'run')
    promise = box.run(arg)
else if (command == 'configure')
    promise = box.configure(arg)
else if (command == 'shell')
    promise = box.shell()

promise
    .then(function() {
        box.status('Success', 'green')
    })
    .catch(function(error) {
        box.status(error ? 'Failure: ' + error : 'Failure!', 'red')
    })
