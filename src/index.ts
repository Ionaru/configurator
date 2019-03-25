import Debug from 'debug';
import { copyFileSync, readFileSync } from 'fs';
import { parse } from 'ini';
import { join } from 'path';

export const configFolder = 'config';

// export let config: Configurator;

type configValueType = boolean | number | string | undefined;

interface IConfig {
    [key: string]: configValueType;
}

export class Configurator {

    private static readonly debug = Debug('configurator');
    private readonly config: IConfig = {};

    constructor(...configNames: string[]) {

        for (const configName of configNames) {
            this.addConfigFile(configName);
        }

        // config = this;
    }

    /**
     * Get a property from the config file
     * @param {string} property - The name of the property to fetch
     * @return {configValueType} - The value of the given config property
     */
    public getProperty(property: string): configValueType {
        const propertyParts = property.split('.');
        try {
            return this.getPropertyFromPath(propertyParts);
        } catch (error) {
            // logger.warn(`Property '${property}' does not exist in the current configuration.`);
            return;
        }
    }

    /**
     * Get a property from the config file
     * @param {string} property - The name of the property to fetch
     * @param {boolean | number | string} defaultValue - Default value to return if the property is not set.
     * @return {configValueType} - The value of the given config property
     */
    public getProperty2(property: string, defaultValue: configValueType): configValueType {
        const propertyParts = property.split('.');
        const propertyFromPath = this.getPropertyFromPath(propertyParts);

        if (propertyFromPath) {
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
        const configFilePath = join(configFolder, `${ configName }.ini`);
        Configurator.debug(`Adding config file: ${configFilePath}.`);
        try {
            console.log('START');
            console.log(readFileSync(configFilePath, 'utf-8'));
            console.log('END');
            const configEntries = parse(readFileSync(configFilePath, 'utf-8'));
            Object.assign(this.config, configEntries);
            Configurator.debug(`Config loaded:: ${configFilePath}.`);
        } catch (error) {
            if (error.code === 'ENOENT') {
                process.emitWarning(`Config file '${configFilePath}' not found, attempting to create from template.`);
                copyFileSync(join(configFolder, configName + '.template.ini'), configFilePath);
                process.emitWarning(`Config file '${configFilePath}' created from template.`);
                throw new Error('Adjust your new configuration file with correct settings!');
            }
        }
    }

    private getPropertyFromPath(propertyPath: string[]): configValueType {
        let propertyParts: any = this.config;
        for (const part of propertyPath) {
            propertyParts = propertyParts[part];
        }
        return propertyParts;
    }
}
