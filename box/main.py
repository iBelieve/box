import click
from .box import Box


@click.group()
def cli():
    pass


@cli.command()
def create():
    '''Create a new box'''
    Box().create()


@cli.command()
@click.argument('packages', nargs=-1, required=True)
def install(packages):
    '''Install packages in your box'''
    Box().install(*packages)


@cli.command()
@click.argument('command', required=False)
def run(command=None):
    '''Run a command in your box'''
    Box().run(command)


@cli.command()
def build():
    '''Build your project in the box'''
    Box().build()


@cli.command()
def check():
    '''Check your project in the box'''
    Box().check()


@cli.command()
def clean():
    '''Reset your box to its initial state'''
    Box().clean()


@cli.command()
def destroy():
    '''Destroy your box'''
    Box().destroy()
