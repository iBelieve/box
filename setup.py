# -*- coding: utf-8 -*-


'''setup.py: setuptools control.'''

import re
from setuptools import setup, find_packages

with open('box/__init__.py') as f:
    version = re.search('^__version__\s*=\s*\'(.*)\'', f.read(), re.M).group(1)

with open('README.rst', 'rb') as f:
    long_description = f.read().decode('utf-8')

setup(name='box',
      version=version,
      description='Virtualenv for generic Linux projects',
      long_description=long_description,
      author='Michael Spencer',
      author_email='sonrisesoftware@gmail.com',
      url='https://github.com/iBeliever/box',
      packages=find_packages(),
      include_package_data=True,
      install_requires=[
          'Click',
          'pyyaml'
      ],
      entry_points='''
          [console_scripts]
          box=box.main:cli
      ''')
