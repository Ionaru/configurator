// Load config file on construct.
// global config variable.
// Warning when overwriting config values.
// Multiple config files.
// Property paths.
// Automatic config generation?
// Default values.

import { Configurator } from './index';

jest.mock('fs');
// import { fs as mockFs } from './__mocks__/fs';

describe('Loading config files', () => {
    test('something', () => {
        // fs.existsSync.mockReturnValue(false);
        // @ts-ignore
        // mockFs.readFileSync.mockImplementation(() => {
        //     return '{}';
        // });
        const config = new Configurator('config');
        expect(config).toBeTruthy();
    });
    //
    // test('something2', () => {
    //     // @ts-ignore
    //     // mockFs.readFileSync.mockImplementation(() => {
    //     //     // throw {code: 'ENOENT'};
    //     //     // throw new Error('Bla');
    //     //     return '{}';
    //     // });
    //     // mockFs.copyFileSync.mockImplementationOnce(() => { /* noop */});
    //
    //     expect(() => {
    //         new Configurator('no-config');
    //     }).toThrow();
    //
    //     // @ts-ignore
    //     expect(mockFs.copyFileSync).toHaveBeenCalledTimes(1);
    // });
});
