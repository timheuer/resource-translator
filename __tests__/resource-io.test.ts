import { readFile, writeFile, buildXml, applyTranslations } from '../src/resource-io';
import { resolve } from 'path';
import { getLocaleName } from '../src/utils';

test('IO: read file correctly parses known XML', async () => {
    const resourcePath = resolve(__dirname, './data/Test.en.resx');
    const resourceXml = await readFile(resourcePath);

    expect(resourceXml).toBeTruthy();
    expect(resourceXml.root).toBeTruthy();
    expect(resourceXml.root.data).toBeTruthy();

    expect(resourceXml.root.data[0].$.name).toEqual('Greetings');
    expect(resourceXml.root.data[0].value[0]).toEqual('Hello world, this is a test.... only a test!');
    expect(resourceXml.root.data[1].$.name).toEqual('MyFriend');
    expect(resourceXml.root.data[1].value[0]).toEqual('Where have you gone?');
});

test('IO: roundtrip, resolve->read->write->read-> compare', async () => {
    const fakePath = resolve(__dirname, './test-7.en.resx');
    const resourcePath = resolve(__dirname, './data/Test.en.resx');
    const resourceXml = await readFile(resourcePath);

    const xml = buildXml(resourceXml);
    writeFile(fakePath, xml);

    const compareXml = await readFile(fakePath);
    expect(resourceXml).toEqual(compareXml);

    expect(resourceXml).toBeTruthy();
    expect(resourceXml.root).toBeTruthy();
    expect(resourceXml.root.data).toBeTruthy();

    expect(resourceXml.root.data[0].$.name).toEqual('Greetings');
    expect(resourceXml.root.data[0].value[0]).toEqual('Hello world, this is a test.... only a test!');
    expect(resourceXml.root.data[1].$.name).toEqual('MyFriend');
    expect(resourceXml.root.data[1].value[0]).toEqual('Where have you gone?');
});

test('IO: apply translations to Test.en.resx', async () => {
    const resourcePath = resolve(__dirname, './data/Test.en.resx');
    let resourceXml = await readFile(resourcePath);

    const fakeResults = {
        'MyFriend': 'We meet again!',
        'Greetings': 'This is a fake translation'
    };

    resourceXml = applyTranslations(resourceXml, fakeResults, [1, 0]);

    expect(resourceXml).toBeTruthy();
    expect(resourceXml.root).toBeTruthy();
    expect(resourceXml.root.data).toBeTruthy();

    expect(resourceXml.root.data[0].$.name).toEqual('Greetings');
    expect(resourceXml.root.data[0].value[0]).toEqual('This is a fake translation');
    expect(resourceXml.root.data[1].$.name).toEqual('MyFriend');
    expect(resourceXml.root.data[1].value[0]).toEqual('We meet again!');
});

test('IO: apply translations to Index.en.resx', async () => {
    const resourcePath = resolve(__dirname, './data/Index.en.resx');
    let resourceXml = await readFile(resourcePath);

    const fakeResults = {
        'HelloWorld': 'Goodbye my friend',
        'Greeting': 'From around the world.',
        'SurveyTitle': 'I do not like surveys!'
    };

    resourceXml = applyTranslations(resourceXml, fakeResults, [1, 0, 2]);

    expect(resourceXml).toBeTruthy();
    expect(resourceXml.root).toBeTruthy();
    expect(resourceXml.root.data).toBeTruthy();

    expect(resourceXml.root.data[0].$.name).toEqual('Greeting');
    expect(resourceXml.root.data[0].value[0]).toEqual('From around the world.');
    expect(resourceXml.root.data[1].$.name).toEqual('HelloWorld');
    expect(resourceXml.root.data[1].value[0]).toEqual('Goodbye my friend');
    expect(resourceXml.root.data[2].$.name).toEqual('SurveyTitle');
    expect(resourceXml.root.data[2].value[0]).toEqual('I do not like surveys!');
});

test('IO: correctly gets local name.', () => {
    const resourcePath = resolve(__dirname, './data/Index.en.resx');
    const localName = getLocaleName(resourcePath, 'fr');

    expect(localName).toEqual(resourcePath.replace('.en.resx', '.fr.resx'));
})