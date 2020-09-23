# What is the test about?
typescript generates with the settings AMD/es2015 module defines having two
parameters, require and exports. The exports weill be filled with the exported
data.

This needs to be addressed by dojo-webpack-plugin.

# How to use the *.ts typescript files?
Install Typescript with its tsc transpiler somewhere.

Go to this folder.

tsc

Edit the generated nls/* files and adapt for esLint with a line comment:
eslint-disable-next-line no-unused-vars
