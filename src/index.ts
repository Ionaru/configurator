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

    private static getConfigPaths(config: IConfig) {
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

    public readonly config: IConfig = {};
    private readonly configFolder: string;

    constructor(configFolder: string, ...configNames: string[]) {

        this.configFolder = configFolder;

        Configurator.debug(`Configurator created, folder: ${ configFolder }.`);

        for (const configName of configNames) {
            this.addConfigFile(configName);
        }
    }

    /**
     * Get a property from the config file
     * @param {string} property - The name of the property to fetch
     * @param {configValueType} defaultValue - Default value to return if the property is not set.
     * @return {configValueType} - The value of the given config property
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
     * Read the config from one of the config files and store the gotten values in this.config
     */
    public addConfigFile(configName: string): void {
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

    private getPropertyFromPath(property: string): configValueType {
        if (this.config.hasOwnProperty(property) && typeof this.config[property] !== 'object') {
            return this.config[property] as configValueType;
        }

        const propertyParts = property.split('.');
        try {
            return propertyParts.reduce((previous: any, current) => previous[current], this.config);
        } catch {
            return;
        }
    }
}
