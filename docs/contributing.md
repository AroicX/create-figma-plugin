# Contributing

## Pre-requisites

- [Node.js](https://nodejs.org/) – v14
- [Yarn](https://classic.yarnpkg.com/) – v1

## Building the project locally

```
$ git clone https://github.com/yuanqing/create-figma-plugin
$ cd create-figma-plugin
$ yarn install
```

## Testing locally on an existing plugin

First, build the Create Figma Plugin project:

```
$ yarn build
```

Then, create symlinks to the local copy of the project in your existing Figma plugin (eg. `my-plugin`):

```
$ ls -a
create-figma-plugin  my-plugin
$ sh create-figma-plugin/scripts/symlink.sh create-figma-plugin my-plugin
```

Finally, build your plugin:

```
$ cd my-plugin
$ yarn build
```
