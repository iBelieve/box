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
