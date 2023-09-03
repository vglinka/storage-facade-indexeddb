# 🔥 IndexedDB for Storage facade

Supports promises, iteration and default values.
Written in TypeScript.
Uses the [storage-facade](https://www.npmjs.com/package/storage-facade)
library which is provides a single storage API that abstracts over
the actual storage implementation. 

## Installation

```sh
npm install storage-facade@4 storage-facade-indexeddb@1
```

# Data structure

The following code 

```TypeScript
import { createStorage } from 'storage-facade';
import { IndexedDBInterface } from 'storage-facade-indexeddb';

(async () => {
  const storage1 = createStorage({
    use: new IndexedDBInterface(),
    name: 'storageOne', // ObjectStore name
    dbName: 'DB_One',   // DB name
  });

  const storage2 = createStorage({
    use: new IndexedDBInterface(),
    name: 'storageTwo', // ObjectStore name
    dbName: 'DB_Two',   // DB name
  });

  // DB_One
  storage1.pen = { data: [40, 42] };
  await storage1.pen; // Successfully written
  
  storage1.pineApple = 10;
  await storage1.pineApple;
  
  // DB_Two
  storage2.deletedVar = 'This value will be deleted';
  await storage2.deletedVar;

  console.log(
    'In IndexedDB:',
    await storage2.deletedVar
  ); // 'In IndexedDB: This value will be deleted'
  
  storage2.apple = [1, 2, 3];
  await storage2.apple;
  
  // delete key
  delete storage2.deletedVar;
  await storage2.deletedVar; // Successfully deleted
  
  storage2.pen = 'Uh!';
  await storage2.pen;
})();
```

will create such keys in IndexedDB:

![IndexedDB_1](https://raw.githubusercontent.com/vglinka/storage-facade-indexeddb/main/assets/1.png)
![IndexedDB_2](https://raw.githubusercontent.com/vglinka/storage-facade-indexeddb/main/assets/2.png)

As you can see, each value is wrapped in an object
`{ index: ..., key: ..., value: ... }`, and after removing one of the keys,
the `index` fields of the objects have the correct value.
This is necessary for iteration over storage keys to work in `storage-facade`.

There are similar libraries for other storages: [localStorage](https://www.npmjs.com/package/storage-facade-localstorage), [sessionStorage](https://www.npmjs.com/package/storage-facade-sessionstorage), [Map](https://www.npmjs.com/package/storage-facade-map).

# Usage

## Storage methods

- `.clear()` - removes all key-value pairs from the storage
- `.getEntries()` returns an array of promises to iterate
- `.deleteStorage()` - delete storage
- `.size()` - returns the number of key-value pairs
- `.key(index: number)` - returns the name of the key by its index

The `key` and `size` methods can be used to create custom iterators.

## '...Default' methods

The default values are used if the value in the storage is `undefined`.
Default values are not stored in the storage, but in the instance.
Therefore, all these methods are synchronous (no need to use the `await` keyword):

- `.addDefault(obj)` - adds keys and values from the passed object to the list of default values
- `.setDefault(obj)` - replaces the list of default values with the given object
- `.getDefault()` - returns an object containing default values
- `.clearDefault()` - replaces a list of default values with an empty object

## Examples

### Read/Write/Delete

```TypeScript
import { createStorage } from 'storage-facade';
import { IndexedDBInterface } from 'storage-facade-indexeddb';

(async () => {
  const storage = createStorage({
    use: new IndexedDBInterface(),
    name: 'cfg',  // IDBObjectStore name, optional, default: 'storage'
    // Limitation: the `dbName` cannot be the same for two storages.
    // In other words, each database can have only one objectStore
    dbName: 'App' // IDBDatabase name, optional, default: equal to `name`
  });

  // If an error occurs at the initialization stage,
  // it will be thrown at the first attempt
  // to access the storage (read, write, all methods except
  // 'addDefault, setDefault, getDefault, clearDefault')

  // Write
  storage.value = { data: [40, 42] };
  // After the assignment, wait for the write operation to complete
  await storage.value; // Successfully written
  
  // Read value
  console.log(await storage.value); // { data: [40, 42] }
  
  // When writing, accesses to first-level keys are intercepted only,
  // so if you need to make changes inside the object,
  // you need to make changes and then assign it to the first level key.
  // Get object
  const updatedValue = (await storage.value) as Record<string, unknown>;
  // Make changes
  updatedValue.data = [10, 45];
  // Update storage
  storage.value = updatedValue;
  await storage.value; // Successfully written

  // Read value
  console.log(
    ((await storage.value) as Record<string, unknown>).data
  ); // [10, 45]
  
  // OR
  const value = (await storage.value) as Record<string, unknown>;
  console.log(value.data); // [10, 45]
  
  // Delete value
  delete storage.value;
  await storage.value; // Successfully deleted
  
  console.log(await storage.value); // undefined
  
  storage.value = 30;
  await storage.value;
  
  console.log(await storage.value); // 30
  
  // Clear storage
  await storage.clear();
  console.log(await storage.value); // undefined
  
  // Delete storage
  await storage.deleteStorage();
  // An error will be thrown when trying to access
  // console.log(await storage.value); // Err: 'This Storage was deleted!'
})();
```

### Iteration `.getEntries()`

```TypeScript
import { createStorage } from 'storage-facade';
import { IndexedDBInterface } from 'storage-facade-indexeddb';

(async () => {
  const storage = createStorage({
    use: new IndexedDBInterface(),
  });

  storage.value = 4;
  await storage.value;

  storage.other = 5;
  await storage.other;

  const promisesArray = await storage.getEntries();

  const array = promisesArray.map(async (kv) => {
    const [key, value] = await kv;
    // ... add code here ...
    return [key, value];
  });

  console.log(await Promise.all(array));
  /*
    [
      ['value', 4],
      ['other', 5],
    ]
  */
})();
```

### '...Default' methods

```TypeScript
import { createStorage } from 'storage-facade';
import { IndexedDBInterface } from 'storage-facade-indexeddb';

(async () => {
  const storage = createStorage({
    use: new IndexedDBInterface(),
  });

  console.log(await storage.value) // undefined

  storage.addDefault({ value: 9, other: 3 });
  storage.addDefault({ value: 1, value2: 2 });
  
  // Since `storage.value = undefined` the default value is used
  console.log(await storage.value);  // 1
  
  console.log(await storage.value2); // 2
  console.log(await storage.other);  // 3

  storage.value = 42;
  await storage.value;
  // When we set a value other than `undefined`,
  // the default value is no longer used
  console.log(await storage.value); // 42

  storage.value = undefined;
  await storage.value;
  console.log(await storage.value); // 1

  storage.value = null;
  await storage.value;
  console.log(await storage.value); // null
  
  delete storage.value;
  await storage.value;
  console.log(await storage.value); // 1
  
  // getDefault
  console.log(storage.getDefault()); // { value: 1, value2: 2, other: 3 }
  
  // Replace 'default'
  storage.setDefault({ value: 30 });

  console.log(await storage.value); // 30
  console.log(await storage.value2); // undefined
  
  // clearDefault
  storage.clearDefault();
  
  console.log(await storage.value); // undefined
  console.log(await storage.value2); // undefined
})();
```

# Limitations

## dbName

The `dbName` cannot be the same for two storages.
In other words, each database can have only one objectStore.

```TypeScript
import { createStorage } from 'storage-facade';
import { IndexedDBInterface } from 'storage-facade-indexeddb';

(async () => {
  const storage1 = createStorage({
    use: new IndexedDBInterface(),
    name: 'storageOne', 
    dbName: 'DB_One',
    //       ^^^^^^
  });

  const storage2 = createStorage({
    use: new IndexedDBInterface(),
    name: 'storageTwo',
    dbName: 'DB_One',
    //       ^^^^^^
  });

  // DB_One
  storage1.pen = 10;
  await storage1.pen;

  // DB_Two
  storage2.apple = 20;
  await storage2.apple;
  
  // Error: DOMException: IDBDatabase.transaction: 'storageTwo' is not a
  // known object store name
})();
```

## Use only first level keys when writing

When writing, accesses to first-level keys (like `storage.a =`,
but not `storage.a[0] =` or `storage.a.b =`) are intercepted only,
so if you need to make changes inside the object, you need to make changes
and then assign it to the first level key.

Assigning keys of the second or more levels will not give any effect.

```TypeScript
  // Read
  console.log(
    ((await storage.value) as Record<string, unknown>).data
  ); // Ok

  // Write
  // Don't do that
  storage.value.data = 42; // no effect
```

Instead, use the following approach:

```TypeScript
  // Read
  console.log(
    ((await storage.value) as Record<string, unknown>).data
  ); // Ok

  // Write
  // Get object
  const updatedValue = (await storage.value) as Record<string, unknown>;
  // Make changes
  updatedValue.data = 42;
  // Update storage
  storage.value = updatedValue; 
  await storage.value // Ок
```

## Don't use banned key names

There is a list of key names that cannot be used because they are the same
as built-in method names: [`clear`, `deleteStorage`, `size`, `key`,
`getEntries`, `entries`, `addDefault`, `setDefault`, `getDefault`, `clearDefault`].

Use the `keyIsNotBanned` function to check the key if needed.

```TypeScript
import { createStorage, keyIsNotBanned } from 'storage-facade';
import { IndexedDBInterface } from 'storage-facade-indexeddb';

const storage = createStorage({
  use: new IndexedDBInterface(),
  asyncMode: false,
});

try {
  const myNewKey = 'newKey';
  if (keyIsNotBanned(myNewKey)) {
    storage[myNewKey] = 42;
  }
} catch (e) {
  console.error((e as Error).message);
}
```

## Keys are `string`

Only values of type `string` can be used as keys.

## Values for `...Default` methods

Values for [`addDefault`, `setDefault`] methods
should be of any [structured-cloneable type (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/Web_Workers_API/Structured_clone_algorithm#supported_types). 










