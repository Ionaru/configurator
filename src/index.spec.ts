import * as path from 'path';

import { Configurator } from './index';

jest.mock('fs');

const setReadFileSyncOutput = (...output: string[]) => {
    let selected = 0;
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('fs').readFileSync = () => {
        const returnValue = output[selected];
        selected++;
        return returnValue;
    };
};

const throwReadFileSyncOutput = (throwable: any) => {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    require('fs').readFileSync = () => {
        throw throwable;
    };
};

describe('loading config files', () => {

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

    it('loading a config file without .ini at the end', () => {
        expect.assertions(2);

        setReadFileSyncOutput('key = value');

        const config = new Configurator('', 'config');
        expect(config).toBeTruthy();
        expect(joinSpy).toHaveBeenCalledWith('', 'config.ini');
    });

    it('loading a config file with .ini at the end', () => {
        expect.assertions(2);

        setReadFileSyncOutput('key = value');

        const config = new Configurator('', 'config.ini');
        expect(config).toBeTruthy();
        expect(joinSpy).toHaveBeenCalledWith('', 'config.ini');
    });

    it('loading a config file with a custom path', () => {
        expect.assertions(2);

        setReadFileSyncOutput('key = value');

        const config = new Configurator('somePathToConfigFiles', 'config');
        expect(config).toBeTruthy();
        expect(joinSpy).toHaveBeenCalledWith('somePathToConfigFiles', 'config.ini');
    });

    it('attempting to load a non-existing config file', () => {
        expect.assertions(3);

        throwReadFileSyncOutput({ code: 'ENOENT' });

        expect(() => {
            new Configurator('', 'no-config');
        }).toThrow('Adjust your new configuration file with correct settings!');

        expect(warningSpy).toHaveBeenCalledWith('Config file \'no-config.ini\' not found, attempting to create from template.');
        expect(warningSpy).toHaveBeenCalledWith('Config file \'no-config.ini\' created from template.');
    });

    it('other error while reading / parsing config file', () => {
        expect.assertions(1);

        throwReadFileSyncOutput(new Error('🐛'));

        expect(() => {
            new Configurator('', 'broken-config');
        }).toThrow('🐛');
    });
});

describe('loading config values', () => {
    it.each([

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
        ['key', true, 'key = true'] as any,
        ['key', false, 'key = false'] as any,

        // Empty values.
        ['key', '', 'key ='],
        // eslint-disable-next-line no-null/no-null
        ['key', null, 'key = null'],

        // Duplicate keys.
        ['key', '2', 'key = 1\n key = 2'],

        // Sections.
        ['section.key', 'value', '[section]\n key = value'],
        ['section.subsection.key', 'value', '[section.subsection]\n key = value'],

    ])('key %p, value %p', (key, value, iniContents) => {
        expect.assertions(1);

        setReadFileSyncOutput(iniContents);
        const config = new Configurator('', 'configFileName');
        expect(config.getProperty(key)).toBe(value);

    });

    it('multiple sections', () => {
        expect.assertions(2);

        setReadFileSyncOutput(`[section1]\nkeyInSection1 = true\n[section2]\nkeyInSection2 = A string value`);

        const config = new Configurator('', 'config');
        expect(config.getProperty('section1.keyInSection1')).toBe(true);
        expect(config.getProperty('section2.keyInSection2')).toBe('A string value');
    });

    it('multiple sections with the same name', () => {
        expect.assertions(2);

        setReadFileSyncOutput(`[section1]\nkeyInSection1 = true\n[section1]\nkeyInSection2 = A string value`);

        const config = new Configurator('', 'config');
        expect(config.getProperty('section1.keyInSection1')).toBe(true);
        expect(config.getProperty('section1.keyInSection2')).toBe('A string value');
    });
});

describe('multiple config files', () => {

    let warningSpy: jest.SpyInstance;

    beforeEach(() => {
        warningSpy = jest.spyOn(process, 'emitWarning');
    });

    afterEach(() => {
        warningSpy.mockClear();
    });

    it('load two config files from the constructor', () => {
        expect.assertions(2);

        setReadFileSyncOutput('key1 = value1', 'key2 = value2');
        const config = new Configurator('', 'configFile1', 'configFile2');

        expect(config.getProperty('key1')).toBe('value1');
        expect(config.getProperty('key2')).toBe('value2');
    });

    it('load two config files at the same time', () => {
        expect.assertions(2);

        setReadFileSyncOutput('key1 = value1', 'key2 = value2');
        const config = new Configurator('');
        config.addConfigFiles('configFile1', 'configFile2');

        expect(config.getProperty('key1')).toBe('value1');
        expect(config.getProperty('key2')).toBe('value2');
    });

    it('load two config files separately', () => {
        expect.assertions(2);

        const config = new Configurator('');
        setReadFileSyncOutput('key1 = value1');
        config.addConfigFiles('configFile1');
        setReadFileSyncOutput('key2 = value2');
        config.addConfigFiles('configFile2');

        expect(config.getProperty('key1')).toBe('value1');
        expect(config.getProperty('key2')).toBe('value2');
    });

    it('overwrite a config file key', () => {
        expect.assertions(2);

        const config = new Configurator('');
        setReadFileSyncOutput('key1 = value1');
        config.addConfigFiles('configFile1');
        setReadFileSyncOutput('key1 = value2');
        config.addConfigFiles('configFile2');

        expect(config.getProperty('key1')).toBe('value2');
        expect(warningSpy).toHaveBeenCalledWith('Config property \'key1\' is being overwritten in configFile2.ini');
    });

    it('overwrite a config file key in same section', () => {
        expect.assertions(2);

        const config = new Configurator('');
        setReadFileSyncOutput('[section1]\n key1 = value1');
        config.addConfigFiles('configFile1');
        setReadFileSyncOutput('[section1]\n key1 = value2');
        config.addConfigFiles('configFile2');

        expect(config.getProperty('section1.key1')).toBe('value2');

        expect(warningSpy).toHaveBeenCalledWith('Config property \'section1.key1\' is being overwritten in configFile2.ini');
    });

    it('overwrite a config file key in different section', () => {
        expect.assertions(3);

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

describe('default config values', () => {

    it('no default value set', () => {
        expect.assertions(1);

        setReadFileSyncOutput('');

        const config = new Configurator('', 'config');
        expect(() => {
            config.getProperty('keyName');
        }).toThrow('No value or default value for property keyName defined!');
    });

    it('return default value', () => {
        expect.assertions(1);

        setReadFileSyncOutput('');

        const config = new Configurator('', 'config');
        expect(config.getProperty('key', 'defaultValue')).toBe('defaultValue');
    });

    it('return config value', () => {
        expect.assertions(1);

        setReadFileSyncOutput('key = value');

        const config = new Configurator('', 'config');
        expect(config.getProperty('key', 'defaultValue')).toBe('value');
    });
});

describe('get raw config', () => {

    it('returns the raw config', () => {
        expect.assertions(1);

        setReadFileSyncOutput('key = value');
        const config = new Configurator('', 'config');
        expect(config.config.key).toBe('value');
    });

    it('cannot write to the raw config', () => {
        expect.assertions(3);

        setReadFileSyncOutput('key = value');
        const config = new Configurator('', 'config');

        const illegalWrite = () => {
            // @ts-expect-error Config is readonly
            config.config.key = 'newValue';
        };

        expect(illegalWrite).toThrow(TypeError);
        expect(illegalWrite).toThrow("Cannot assign to read only property 'key' of object '#<Object>'");

        expect(config.config.key).toBe('value');
    });

});
