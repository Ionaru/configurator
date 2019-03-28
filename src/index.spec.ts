/* tslint:disable:no-duplicate-string no-identical-functions */

import * as path from 'path';

import { Configurator } from './index';

jest.mock('fs');

function setReadFileSyncOutput(...output: string[]) {
    let selected = 0;
    require('fs').readFileSync = () => {
        const returnValue = output[selected];
        selected++;
        return returnValue;
    };
}

function throwReadFileSyncOutput(throwable: any) {
    require('fs').readFileSync = () => {
        throw throwable;
    };
}

describe('Loading config files', () => {

    let warningSpy: jest.SpyInstance;
    let joinSpy: jest.SpyInstance;

    beforeEach(() => {
        warningSpy = jest.spyOn(process, 'emitWarning');
        joinSpy = jest.spyOn(path, 'join');
    });

    afterEach(() => {
        warningSpy.mockClear();
        joinSpy.mockClear();
    });

    test('Loading a config file without .ini at the end', () => {
        setReadFileSyncOutput('key = value');

        const config = new Configurator('', 'config');
        expect(config).toBeTruthy();
        expect(joinSpy).toHaveBeenCalledWith('', 'config.ini');
    });

    test('Loading a config file with .ini at the end', () => {
        setReadFileSyncOutput('key = value');

        const config = new Configurator('', 'config.ini');
        expect(config).toBeTruthy();
        expect(joinSpy).toHaveBeenCalledWith('', 'config.ini');
    });

    test('Loading a config file with a custom path', () => {
        setReadFileSyncOutput('key = value');

        const config = new Configurator('somePathToConfigFiles', 'config');
        expect(config).toBeTruthy();
        expect(joinSpy).toHaveBeenCalledWith('somePathToConfigFiles', 'config.ini');
    });

    test('Attempting to load a non-existing config file', () => {
        throwReadFileSyncOutput({code: 'ENOENT'});

        expect(() => {
            new Configurator('', 'no-config');
        }).toThrow('Adjust your new configuration file with correct settings!');

        expect(warningSpy).toHaveBeenCalledWith('Config file \'no-config.ini\' not found, attempting to create from template.');
        expect(warningSpy).toHaveBeenCalledWith('Config file \'no-config.ini\' created from template.');
    });

    test('Other error while reading / parsing config file', () => {
        throwReadFileSyncOutput(new Error('🐛'));

        expect(() => {
            new Configurator('', 'broken-config');
        }).toThrow('🐛');
    });
});

describe('Loading config values', () => {
    test.each([

        // String values.
        ['key', 'value', 'key = value'],
        ['key', '🎂', 'key = 🎂'],
        ['key', 'value', 'key = \'value\''],
        ['key', 'value', 'key = "value"'],
        ['key', 'A value with spaces', 'key = A value with spaces'],
        ['key', 'undefined', 'key = undefined'],

        // Number values (will be a string in the output).
        ['key', '.5', 'key = .5'],
        ['key', '0', 'key = 0'],
        ['key', '5', 'key = 5'],
        ['key', '5.05', 'key = 5.05'],

        // Boolean values.
        ['key', true, 'key = true'],
        ['key', false, 'key = false'],

        // Empty values.
        ['key', '', 'key ='],
        // tslint:disable-next-line:no-null-keyword
        ['key', null, 'key = null'],

        // Duplicate keys.
        ['key', '2', 'key = 1\n key = 2'],

        // Sections.
        ['section.key', 'value', '[section]\n key = value'],
        ['section.subsection.key', 'value', '[section.subsection]\n key = value'],

    ])('Key %p, value %p', (key, value, iniContents) => {

        setReadFileSyncOutput(iniContents as string);
        const config = new Configurator('', 'configFileName');
        expect(config.getProperty(key as string)).toBe(value);

    });

    test('Multiple sections', () => {
        setReadFileSyncOutput(`[section1]\nkeyInSection1 = true\n[section2]\nkeyInSection2 = A string value`);

        const config = new Configurator('', 'config');
        expect(config.getProperty('section1.keyInSection1')).toBe(true);
        expect(config.getProperty('section2.keyInSection2')).toBe('A string value');
    });

    test('Multiple sections with the same name', () => {
        setReadFileSyncOutput(`[section1]\nkeyInSection1 = true\n[section1]\nkeyInSection2 = A string value`);

        const config = new Configurator('', 'config');
        expect(config.getProperty('section1.keyInSection1')).toBe(true);
        expect(config.getProperty('section1.keyInSection2')).toBe('A string value');
    });
});

describe('Multiple config files', () => {

    let warningSpy: jest.SpyInstance;

    beforeEach(() => {
        warningSpy = jest.spyOn(process, 'emitWarning');
    });

    afterEach(() => {
        warningSpy.mockClear();
    });

    test('Load two config files from the constructor', () => {
        setReadFileSyncOutput('key1 = value1', 'key2 = value2');
        const config = new Configurator('', 'configFile1', 'configFile2');

        expect(config.getProperty('key1')).toBe('value1');
        expect(config.getProperty('key2')).toBe('value2');
    });

    test('Load two config files at the same time', () => {
        setReadFileSyncOutput('key1 = value1', 'key2 = value2');
        const config = new Configurator('');
        config.addConfigFiles('configFile1', 'configFile2');

        expect(config.getProperty('key1')).toBe('value1');
        expect(config.getProperty('key2')).toBe('value2');
    });

    test('Load two config files separately', () => {
        const config = new Configurator('');
        setReadFileSyncOutput('key1 = value1');
        config.addConfigFiles('configFile1');
        setReadFileSyncOutput('key2 = value2');
        config.addConfigFiles('configFile2');

        expect(config.getProperty('key1')).toBe('value1');
        expect(config.getProperty('key2')).toBe('value2');
    });

    test('Overwrite a config file key', () => {
        const config = new Configurator('');
        setReadFileSyncOutput('key1 = value1');
        config.addConfigFiles('configFile1');
        setReadFileSyncOutput('key1 = value2');
        config.addConfigFiles('configFile2');

        expect(config.getProperty('key1')).toBe('value2');
        expect(warningSpy).toHaveBeenCalledWith('Config property \'key1\' is being overwritten in configFile2.ini');
    });

    test('Overwrite a config file key in same section', () => {
        const config = new Configurator('');
        setReadFileSyncOutput('[section1]\n key1 = value1');
        config.addConfigFiles('configFile1');
        setReadFileSyncOutput('[section1]\n key1 = value2');
        config.addConfigFiles('configFile2');

        expect(config.getProperty('section1.key1')).toBe('value2');

        expect(warningSpy).toHaveBeenCalledWith('Config property \'section1.key1\' is being overwritten in configFile2.ini');
    });

    test('Overwrite a config file key in different section', () => {
        const config = new Configurator('');
        setReadFileSyncOutput('[section1]\n key1 = value1');
        config.addConfigFiles('configFile1');
        setReadFileSyncOutput('[section2]\n key1 = value2');
        config.addConfigFiles('configFile2');

        expect(config.getProperty('section1.key1')).toBe('value1');
        expect(config.getProperty('section2.key1')).toBe('value2');

        expect(warningSpy).toHaveBeenCalledTimes(0);
    });
});

describe('Default config values', () => {

    test('No default value set', () => {
        setReadFileSyncOutput('');

        const config = new Configurator('', 'config');
        expect(() => {
            config.getProperty('keyName');
        }).toThrow('No value or default value for property keyName defined!');
    });

    test('Return default value', () => {
        setReadFileSyncOutput('');

        const config = new Configurator('', 'config');
        expect(config.getProperty('key', 'defaultValue')).toBe('defaultValue');
    });

    test('Return config value', () => {
        setReadFileSyncOutput('key = value');

        const config = new Configurator('', 'config');
        expect(config.getProperty('key', 'defaultValue')).toBe('value');
    });
});
