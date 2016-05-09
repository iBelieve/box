===========================================
Box - Virtualenv for Generic Linux Projects
===========================================

Box is a same virtualenv-like container solution for developing and testing software on Linux. Create a box, add your dependencies, and then build and run your software.

It's built on top of systemd-nspawn, and creates a lightweight ArchLinux container so you always test with the latest versions of dependencies.

Usage
-----

Create a file named `Boxfile`::

    depends:
      - qt5-declarative
      - qt5-quickcontrols2
      - qt5-graphicaleffects

    build:
      - qmake {src}
      - make
      - make install

    check:
      - make check

    run:
      - qmlscene demo/main.qml

Create the box::

    box create

Build the software in your box::

    box build

Run your test suite::

    box check

And finally run the software itself::

    box run

Licensing
---------

Box is free software; you can redistribute it and/or modify it under the terms of the GNU General Public License as published by the Free Software Foundation; either version 3 of the License, or (at your option) any later version.
