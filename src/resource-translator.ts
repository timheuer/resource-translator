// sourceLocale:    en
// subscriptionKey: c57xxxxxxxxxxxxxxxxxxxxxxxxxxac3
// region:          canadacentral
// endpoint:        https://api.cognitive.microsofttranslator.com/

//  This looks interesting: https://github.com/ryanluton/translate-resx/blob/master/translate-resx.js

/**
 * WORKFLOW
 * 
 * Determine if 'baseFileGlob' files match files that were changed in the current contextual PR
 *    If not, nop... cleanly exit
 * 
 * Get input/validate 'subscriptionKey' and 'endpoint' or exit
 * Get resource files based on 'baseFileGlob' from source
 * For each resource file:
 *    Parse XML, translate each key/value pair, write out resulting translations
 * Create PR based on newly created translation files * 
 */

import { info, getInput, setFailed, setOutput, debug } from '@actions/core';
import { getAvailableTranslations, translate } from './api';
import { findAllResourceFiles } from './resource-finder';
import { existsSync } from 'fs';
import { readFile, buildXml, writeFile, applyTranslations } from './resource-io';
import { summarize } from './summarizer';
import { Summary } from './summary';
import { getTranslatableTextMap } from './translator';
import { getLocaleName, naturalLanguageCompare, stringifyMap } from './utils';

interface Options {
    baseFileGlob: string;
    subscriptionKey: string;
    endpoint: string;
    region?: string;
}

const getOptions = (): Options => {
    const [baseFileGlob, endpoint, subscriptionKey, region] = [
        `**/*.${(getInput('sourceLocale') || 'en')}.resx`,
        getInput('endpoint', { required: true }),
        getInput('subscriptionKey', { required: true }),
        getInput('region')
    ];

    return {
        baseFileGlob, subscriptionKey, endpoint, region
    }
};

export async function initiate() {
    try {
        const inputOptions = getOptions();
        if (!inputOptions) {
            setFailed('Both a subscriptionKey and endpoint are required.');
        } else {
            const availableTranslations = await getAvailableTranslations();
            if (!availableTranslations || !availableTranslations.translation) {
                setFailed("Unable to get target translations.");
                return;
            }
            const sourceLocale = getInput('sourceLocale');
            const toLocales =
                Object.keys(availableTranslations.translation)
                    .filter(locale => locale !== sourceLocale)
                    .sort((a, b) => naturalLanguageCompare(a, b));
            info(`Detected translation targets to: ${toLocales.join(", ")}`);

            const resourceFiles = await findAllResourceFiles(inputOptions.baseFileGlob);
            if (!resourceFiles || !resourceFiles.length) {
                setFailed("Unable to get target resource files.");
                return;
            }

            debug(`Discovered target resource files: ${resourceFiles.join(", ")}`);

            let summary = new Summary(sourceLocale, toLocales);

            resourceFiles.forEach(async (resourceFilePath: string) => {
                const resourceFileXml = await readFile(resourceFilePath);
                const translatableTextMap = await getTranslatableTextMap(resourceFileXml);

                debug(`Translatable text:\n ${JSON.stringify(translatableTextMap, stringifyMap)}`);

                if (translatableTextMap) {
                    const resultSet = await translate(
                        inputOptions,
                        toLocales,
                        translatableTextMap.text);

                    debug(`Translation result:\n ${JSON.stringify(resultSet)}`);

                    if (resultSet) {
                        toLocales.forEach(locale => {
                            const translations = resultSet[locale];
                            const clone = { ...resourceFileXml };
                            const result = applyTranslations(clone, translations, translatableTextMap.ordinals);
                            const translatedXml = buildXml(result);
                            const newPath = getLocaleName(resourceFilePath, locale);
                            if (newPath) {
                                if (existsSync(newPath)) {
                                    summary.updatedFileCount++;
                                    summary.updatedFileTranslations += translatableTextMap.ordinals.length;
                                } else {
                                    summary.newFileCount++;
                                    summary.newFileTranslations += translatableTextMap.ordinals.length;
                                }
                                writeFile(newPath, translatedXml);
                            }
                        });
                    } else {
                        setFailed("Unable to translate input text.");
                    }
                } else {
                    setFailed("No translatable text to work with");
                }
            });

            setOutput('has-new-translations', summary.hasNewTranslations);

            const [title, details] = summarize(summary);
            setOutput('summary-title', title);
            setOutput('summary-details', details);
        }
    } catch (error) {
        setFailed(error.message);
    }
}