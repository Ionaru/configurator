import Debug from 'debug';
import { copyFileSync, readFileSync } from 'fs';
import { parse } from 'ini';
import { join } from 'path';

type configValueType = boolean | string | undefined;

interface IConfig {
    [key: string]: configValueType;
}

export class Configurator {

    private static readonly debug = Debug('configurator');
    public readonly config: IConfig = {};
    private readonly configFolder: string;

    constructor(configFolder: string, ...configNames: string[]) {

        this.configFolder = configFolder;

        for (const configName of configNames) {
            this.addConfigFile(configName);
        }
    }

    /**
     * Get a property from the config file
     * @param {string} property - The name of the property to fetch
     * @param {boolean | number | string} defaultValue - Default value to return if the property is not set.
     * @return {configValueType} - The value of the given config property
     */
    public getProperty(property: string, defaultValue?: configValueType): configValueType {
        const propertyFromPath = this.getPropertyFromPath(property);

        if (propertyFromPath !== undefined) {
            return propertyFromPath;
        } else {
            Configurator.debug(`Property '${property}' does not exist in the current configuration, using default.`);
            if (!defaultValue) {
                throw new Error(`No value or default value for property ${property} defined!`);
            }
            return defaultValue;
        }
    }

    /**
     * Read the config from one of the config files and store the gotten values in this.config
     */
    public addConfigFile(configName: string): void {
        // Read the config file from the config folder in the project root directory
        const configFilePath = join(this.configFolder, `${ configName }.ini`);
        Configurator.debug(`Adding config file: ${configFilePath}.`);
        try {
            const configEntries = parse(readFileSync(configFilePath, 'utf-8'));
            Object.assign(this.config, configEntries);
            Configurator.debug(`Config loaded:: ${configFilePath}.`);
        } catch (error) {
            if (error.code === 'ENOENT') {
                process.emitWarning(`Config file '${configFilePath}' not found, attempting to create from template.`);
                copyFileSync(join(this.configFolder, configName + '.template.ini'), configFilePath);
                process.emitWarning(`Config file '${configFilePath}' created from template.`);
                throw new Error('Adjust your new configuration file with correct settings!');
            } else {
                throw error;
            }
        }
    }

    private getPropertyFromPath(property: string): configValueType {
        // Load the root of the config first.
        let propertyParts: any = this.config;

        if (propertyParts.hasOwnProperty(property)) {
            return propertyParts[property];
        }

        const propertyPath = property.split('.');

        for (const part of propertyPath) {
            if (propertyParts.hasOwnProperty(part)) {
                propertyParts = propertyParts[part];
            } else {
                return;
            }
        }
        return propertyParts;
    }
}
