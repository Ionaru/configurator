# @ionaru/configurator

[![npm version](https://img.shields.io/npm/v/@ionaru/configurator.svg?style=for-the-badge)](https://www.npmjs.com/package/@ionaru/configurator)
[![npm version](https://img.shields.io/npm/v/@ionaru/configurator/next.svg?style=for-the-badge)](https://www.npmjs.com/package/@ionaru/configurator/v/next)
[![Build Status](https://img.shields.io/travis/Ionaru/configurator/master.svg?style=for-the-badge)](https://travis-ci.org/Ionaru/configurator)
[![codecov](https://img.shields.io/codecov/c/github/Ionaru/configurator/master.svg?style=for-the-badge)](https://codecov.io/gh/Ionaru/configurator)

## Description
A package to provide configuration options for other projects.
Configuration options must be supplied by `.ini` files.

## Usage
```
npm install @ionaru/configurator
```

Standard use.
```js
// Create a Configurator instance.
const config = new Configurator('config-folder');

// Add configuration files to the configurator.
//
// config-folder/custom-config.ini:
// someKey = someValue;
//
config.addConfigFiles('custom-config.ini');

// Get a configuration property.
const configProperty = config.getProperty('myKey');
console.log(configProperty); // "someValue"
```

It is possible to immediately load configuration files when creating the Configurator instance (shorthand).
```js
const config = new Configurator('config-folder', 'custom-config.ini');
```

Sections in `.ini` files can be used to provide scopes for configuration properties.
```js
// config-folder/features.ini:
// [featureOne]
// enabled = true
//
// [featureTwo]
// enabled = false
//
const config = new Configurator('config-folder', 'custom-config.ini');
const featureOneEnabled = config.getProperty('featureOne.enabled');
const featureTwoEnabled = config.getProperty('featureTwo.enabled');

console.log(featureOneEnabled); // true
console.log(featureTwoEnabled); // false
```

A default value can be given to return when a configuration property does not exist.
```js
const port = config.getProperty('doesNotExist', 8000);
console.log(port); // 8000
```

Multiple configuration files can be added.
```js
// The standard way.
const config = new Configurator('config-folder');
config.addConfigFiles('config-one.ini');
config.addConfigFiles('custom-two.ini');

// Using shorthand.
config.addConfigFiles('config-one.ini', 'custom-two.ini');

// In the constructor.
const config = new Configurator('config-folder', 'config-one.ini', 'config-two.ini');
```

A warning will be emitted when a second configuration file will overwrite a value from a earlier file.
```js
// config-folder/config-one.ini:
// port = 8080
//
// config-folder/config-two.ini:
// port = 9000
//
const config = new Configurator('config-folder', 'config-one.ini', 'config-two.ini');
// (node:3415) Warning: Config property 'port' is being overwritten in config-two.ini.
```
