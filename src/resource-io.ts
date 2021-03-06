import { debug } from '@actions/core';
import { Builder, Parser } from 'xml2js';
import { readFileSync, writeFileSync } from 'fs';
import { resolve } from 'path';
import { ResourceFile } from './resource-file';

export async function readFile(path: string) {
    const resolved = resolve(path);
    const file = readFileSync(resolved, 'utf-8');

    debug(`Read file: ${file}`);

    return await parseXml(file);
}

async function parseXml(file: string): Promise<ResourceFile> {
    const parser = new Parser();
    const xml = await parser.parseStringPromise(file);
    return xml as ResourceFile;
}

export function applyTranslations(
    resource: ResourceFile,
    translations: { [key: string]: string } | undefined,
    ordinals: number[] | undefined) {
    //
    // Each translation has a named identifier (it's key), for example: { 'SomeKey': 'some translated value' }.
    // The ordinals map each key to it's appropriate translated value in the resource, for example: [2,0,1].
    // For each translation, we map its keys value to the corresponding ordinal.
    //
    if (resource && translations && ordinals && ordinals.length) {
        let index = 0;
        for (let key in translations) {
            const ordinal = ordinals[index++];
            resource.root.data[ordinal].value = [translations[key]];
        }
    }

    return resource;
}

export function buildXml(resource: ResourceFile) {
    const builder = new Builder();
    var xml = builder.buildObject(resource);
    return xml;
}

export function writeFile(path: string, xml: string) {
    writeFileSync(path, xml);
}