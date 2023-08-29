// Copyright (c) 2023-present Vadim Glinka
//
// Licensed under the Apache License, Version 2.0 <LICENSE-APACHE or
// http://www.apache.org/licenses/LICENSE-2.0> or the MIT license
// <LICENSE-MIT or http://opensource.org/licenses/MIT>, at your
// option.

import { createStorage } from 'storage-facade';
import { IndexedDBInterface as TestedInterface } from '../src/index';

const setup = {
  name: 'settings',
  name2: 'settings2',
};

beforeEach(() => {
  // clear fake indexedDB
  // eslint-disable-next-line no-global-assign
  indexedDB = new IDBFactory();
});

it('Async: read/write', async () => {
  const storage = createStorage({
    use: new TestedInterface(),
    name: setup.name,
  });

  storage.value = { c: [40, 42] };
  await storage.value;

  expect(await storage.value).toEqual({ c: [40, 42] });
});

it('Async: different names', async () => {
  const storage = createStorage({
    use: new TestedInterface(),
    name: setup.name,
  });

  storage.value = 10;
  await storage.value;

  expect(await storage.value).toEqual(10);
  const storage2 = createStorage({
    use: new TestedInterface(),
    name: setup.name2,
  });

  storage2.value = 10;
  await storage2.value;

  expect(await storage.value).toEqual(10);
  expect(await storage2.value).toEqual(10);

  storage2.value = 20;
  await storage2.value;

  expect(await storage.value).toEqual(10);
  expect(await storage2.value).toEqual(20);

  await storage.clear();

  expect(await storage.value).toEqual(undefined);
  expect(await storage2.value).toEqual(20);
});

it(`Async: case-sensitive`, async () => {
  const storage = createStorage({
    use: new TestedInterface(),
  });

  storage.value = 20;
  await storage.value;
  expect(await storage.Value).toEqual(undefined);
  //                   ^

  storage.Value = 30;
  //      ^
  await storage.value;
  expect(await storage.value).toEqual(20);
});

it(`Async: ref problem (need structuredClone)`, async () => {
  const storage = createStorage({
    use: new TestedInterface(),
  });

  // set value
  const a = { c: [40, 42] };
  storage.value = a;
  await storage.value;
  a.c = [30];
  expect(await storage.value).toEqual({ c: [40, 42] });

  // get value
  const b = await storage.value;
  (b as Record<string, unknown>).c = [40];
  expect(await storage.value).toEqual({ c: [40, 42] });

  // Test new session
  const newStorage = createStorage({
    use: new TestedInterface(),
  });

  // get value
  const t = await newStorage.value;
  if (t !== undefined) {
    (t as Record<string, unknown>).c = [90];
    expect(await newStorage.value).toEqual({ c: [40, 42] });
  }
});

it('Async: delete storage', async () => {
  const storage = createStorage({
    use: new TestedInterface(),
    name: 'settings',
  });

  storage.value = 42;
  await storage.value;

  await storage.deleteStorage();

  expect.assertions(1);
  try {
    await storage.value;
  } catch (e) {
    expect((e as Error).message).toMatch('This Storage was deleted!');
  }
});

it('Async: addDefault', async () => {
  const storage = createStorage({
    use: new TestedInterface(),
  });

  storage.addDefault({ value: 9 });
  storage.addDefault({ value: 1, value2: 2 });
  expect(await storage.value).toEqual(1);
  expect(await storage.value2).toEqual(2);

  storage.value = 42;
  await storage.value;
  expect(await storage.value).toEqual(42);

  storage.value = undefined;
  await storage.value;
  expect(await storage.value).toEqual(1);

  storage.value = null;
  await storage.value;
  expect(await storage.value).toEqual(null);
});

it('Async: getDefault', async () => {
  const storage = createStorage({
    use: new TestedInterface(),
  });

  storage.addDefault({ value: 2, other: 7 });

  expect(storage.getDefault()).toEqual({ value: 2, other: 7 });
});

it('Async: setDefault', async () => {
  const storage = createStorage({
    use: new TestedInterface(),
  });

  storage.addDefault({ value: 2, other: 7 });

  // Replace 'default'
  storage.setDefault({ value: 42 });

  expect(await storage.value).toEqual(42);
  expect(await storage.other).toEqual(undefined);
});

it('Async: clearDefault', async () => {
  const storage = createStorage({
    use: new TestedInterface(),
  });

  storage.addDefault({ value: 2, other: 7 });

  storage.clearDefault();

  expect(await storage.value).toEqual(undefined);
  expect(await storage.other).toEqual(undefined);
});

it('Async: delete key', async () => {
  const storage1 = createStorage({
    use: new TestedInterface(),
  });

  delete storage1.value;
  await storage1.value;

  expect(await storage1.value).toEqual(undefined);

  const storage = createStorage({
    use: new TestedInterface(),
  });

  delete storage.value;
  await storage.value;

  storage.addDefault({ value: 2 });

  storage.value = 10;
  await storage.value;

  delete storage.value;
  await storage.value;

  expect(await storage.value).toEqual(2);

  storage.newKey = 3;
  await storage.newKey;

  delete storage.newKey;
  await storage.newKey;

  delete storage.newKey;
  await storage.newKey;

  expect(await storage.newKey).toEqual(undefined);
});

it('Async: delete key + iteration', async () => {
  const storage = createStorage({
    use: new TestedInterface(),
  });

  storage.value = 10;
  await storage.value;

  storage.value2 = 20;
  await storage.value2;

  storage.value3 = 30;
  await storage.value3;

  storage.value4 = 40;
  await storage.value4;

  delete storage.value;
  await storage.value;

  delete storage.value3;
  await storage.value3;

  expect(await storage.value).toEqual(undefined);
  expect(await storage.value2).toEqual(20);
  expect(await storage.value3).toEqual(undefined);
  expect(await storage.value4).toEqual(40);

  storage.value5 = 50;
  await storage.value5;

  storage.value = 1;
  await storage.value;

  storage.value6 = 60;
  await storage.value6;

  const promisesArray = await storage.getEntries();

  const array = promisesArray.map(async (kv) => {
    const [key, value] = await kv;
    return [key, value];
  });

  expect(await Promise.all(array)).toEqual([
    ['value2', 20],
    ['value4', 40],
    ['value5', 50],
    ['value', 1],
    ['value6', 60],
  ]);
});

it('Async: clear storage', async () => {
  const storage = createStorage({
    use: new TestedInterface(),
  });

  storage.addDefault({ value: 2 });
  storage.value = 4;
  await storage.value;

  await storage.clear();
  storage.clearDefault();

  expect(await storage.value).toEqual(undefined);
});

it('Async: size', async () => {
  const storage = createStorage({
    use: new TestedInterface(),
  });

  storage.addDefault({ value: 2 });
  storage.value = 4;
  await storage.value;
  storage.other = 3;
  await storage.other;

  expect(await storage.size()).toEqual(2);
});

it('Async: key', async () => {
  const storage = createStorage({
    use: new TestedInterface(),
  });

  storage.addDefault({ value: 2 });
  storage.value = 4;
  await storage.value;

  expect(await storage.key(0)).toEqual('value');
});

it('Async: iter', async () => {
  const storage = createStorage({
    use: new TestedInterface(),
  });

  storage.addDefault({ value: 2 });

  storage.value = 4;
  await storage.value;

  storage.other = 5;
  await storage.other;

  const promisesArray = await storage.getEntries();

  const array = promisesArray.map(async (kv) => {
    const [key, value] = await kv;
    return [key, value];
  });

  expect(await Promise.all(array)).toEqual([
    ['value', 4],
    ['other', 5],
  ]);
});
