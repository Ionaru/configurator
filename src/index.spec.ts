// Load config file on construct.
// global config variable?
// Warning when overwriting config values.
// Multiple config files.
// Property paths.
// Automatic config generation?
// Default values.

import { Configurator } from './index';

jest.mock('fs');

function setReadFileSyncOutput(output: string) {
    require('fs').readFileSync = () => {
        return output;
    };
}

function throwReadFileSyncOutput(throwable: any) {
    require('fs').readFileSync = () => {
        throw throwable;
    };
}

describe('Loading config files', () => {
    test('something', () => {
        setReadFileSyncOutput('key = value');

        const config = new Configurator('', 'config');
        expect(config).toBeTruthy();
    });

    test('Config file not found', () => {
        throwReadFileSyncOutput({code: 'ENOENT'});

        expect(() => {
            new Configurator('', 'no-config');
        }).toThrow('Adjust your new configuration file with correct settings!');
    });

    test('Other error while reading / parsing', () => {
        throwReadFileSyncOutput(new Error('🐛'));

        expect(() => {
            new Configurator('', 'no-config');
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

        // keys with dots in their names.
        ['key.subkey', 'value', 'key.subkey = value'],
        ['key.subkey.subsubkey', 'value', 'key.subkey.subsubkey = value'],

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
    test('Load two config files', () => {
        const config = new Configurator('');
        setReadFileSyncOutput('config1=value1');
        config.addConfigFile('configFile1');
        setReadFileSyncOutput('config2=value2');
        config.addConfigFile('configFile2');

        expect(config.getProperty('config1')).toBe('value1');
        expect(config.getProperty('config2')).toBe('value2');
    });

    test('Overwrite a config file key', () => {
        const config = new Configurator('');
        setReadFileSyncOutput('config1=value1');
        config.addConfigFile('configFile1');
        setReadFileSyncOutput('config1=value2');
        config.addConfigFile('configFile2');

        expect(config.getProperty('config1')).toBe('value2');
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
});