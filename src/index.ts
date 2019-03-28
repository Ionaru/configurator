import Debug from 'debug';
import { copyFileSync, readFileSync } from 'fs';
import { parse } from 'ini';
import { join } from 'path';

type configValueType = boolean | string | undefined;

interface IConfig {
    [key: string]: configValueType | IConfig;
}

export class Configurator {

    private static readonly debug = Debug('configurator');

    /**
     * Create a list of the paths in an object.
     * @param {IConfig} config - The config object to create the list from.
     * @return {string[]} - The list of possible paths to properties.
     */
    private static getConfigPaths(config: IConfig): string[] {
        const result: string[] = [];

        const constructPropertyPaths = (data: IConfig | configValueType, path: string) => {
            if (data && typeof data === 'object') {
                for (const property in data) {
                    if (data.hasOwnProperty(property)) {
                        constructPropertyPaths(data[property], `${ path }.${ property }`);
                    }
                }
            } else {
                result.push(path);
            }
        };
        constructPropertyPaths(config, '');

        // Strip first dot in path.
        return result.map((path) => path.substr(1));
    }

    private readonly config: IConfig = {};
    private readonly configFolder: string;

    /**
     * Create a new Configurator instance.
     * @param {string} configFolder - The folder where the configuration files are.
     * @param {string[]} configNames - An optional list of configuration file names to load immediately.
     */
    constructor(configFolder: string, ...configNames: string[]) {

        this.configFolder = configFolder;

        Configurator.debug(`Configurator created, folder: ${ configFolder }.`);

        this.addConfigFiles(...configNames);
    }

    /**
     * Get a property from the config file
     * @param {string} property - The name of the property to fetch.
     * @param {configValueType} defaultValue - Default value to return if the property is not set.
     * @return {configValueType} - The value of the given config property.
     */
    public getProperty(property: string, defaultValue?: configValueType): configValueType {
        Configurator.debug(`Searching config for property: ${ property }`);
        const propertyFromPath = this.getPropertyFromPath(property);

        if (propertyFromPath !== undefined) {
            return propertyFromPath;
        } else {
            if (defaultValue === undefined) {
                throw new Error(`No value or default value for property ${ property } defined!`);
            }
            Configurator.debug(`Property '${ property }' not found in the config, using default.`);
            return defaultValue;
        }
    }

    /**
     * Read multiple config files and store the gotten values in the configuration.
     * @param {string[]} configNames - The names of the configuration files to load.
     */
    public addConfigFiles(...configNames: string[]): void {
        for (const configName of configNames) {
            this.addConfigFile(configName);
        }
    }

    /**
     * Read a config file and store the gotten values in the configuration.
     * @param {string} configName - The name of the configuration file to load.
     */
    private addConfigFile(configName: string): void {
        if (configName.endsWith('.ini')) {
            configName = configName.slice(0, -4);
        }

        // Read the config file from the config folder in the project root directory
        const configFilePath = join(this.configFolder, `${ configName }.ini`);
        Configurator.debug(`Adding config file: ${ configFilePath }.`);

        let configEntries;
        try {
            configEntries = parse(readFileSync(configFilePath, 'utf-8'));

        } catch (error) {
            if (error.code === 'ENOENT') {
                process.emitWarning(`Config file '${ configFilePath }' not found, attempting to create from template.`);
                copyFileSync(join(this.configFolder, configName + '.template.ini'), configFilePath);
                process.emitWarning(`Config file '${ configFilePath }' created from template.`);
                throw new Error('Adjust your new configuration file with correct settings!');
            } else {
                throw error;
            }
        }

        // Check if a value is going to be overwritten.
        const propertyPaths = Configurator.getConfigPaths(configEntries);
        for (const path of propertyPaths) {
            const property = this.getPropertyFromPath(path);
            if (property !== undefined) {
                process.emitWarning(`Config property '${path}' is being overwritten in ${configName}.ini`);
            }
        }

        Object.assign(this.config, configEntries);
        Configurator.debug(`Config loaded: ${ configFilePath }.`);
    }

    /**
     * Get a property value from a path.
     * @param {string} path - The path where the property is located.
     * @return {configValueType} - The value of the property.
     */
    private getPropertyFromPath(path: string): configValueType {
        if (this.config.hasOwnProperty(path) && typeof this.config[path] !== 'object') {
            return this.config[path] as configValueType;
        }

        const pathParts = path.split('.');
        try {
            return pathParts.reduce((previous: any, current) => previous[current], this.config);
        } catch {
            return;
        }
    }
}
