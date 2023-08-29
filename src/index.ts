// Copyright (c) 2023-present Vadim Glinka
//
// Licensed under the Apache License, Version 2.0 <LICENSE-APACHE or
// http://www.apache.org/licenses/LICENSE-2.0> or the MIT license
// <LICENSE-MIT or http://opensource.org/licenses/MIT>, at your
// option.

import {
  StorageInterface,
  type Setup,
  defaultStorageName,
  Ok,
} from 'storage-facade';

export interface Entry {
  index: number;
  key: string;
  value: unknown;
}

export class IndexedDBInterface extends StorageInterface {
  interfaceName = 'IndexedDBInterface';

  storageName = '';

  dbName = '';

  isDeleted = false;

  checkStorage(): void {
    if (this.isDeleted) throw Error('This Storage was deleted!');
  }

  async initAsync<T extends StorageInterface>(
    setup: Setup<T>
  ): Promise<Error | Ok> {
    return new Promise((resolve, reject) => {
      this.storageName = setup.name ?? defaultStorageName;
      this.dbName = (setup.dbName as string) ?? this.storageName;
      const openRequest = window.indexedDB.open(this.dbName, 1);

      openRequest.onupgradeneeded = () => {
        const db = openRequest.result;
        let objectStore;
        if (!db.objectStoreNames.contains(this.storageName)) {
          objectStore = db.createObjectStore(this.storageName, {
            autoIncrement: true,
          });
        } else {
          const transaction = db.transaction(
            this.storageName,
            'readonly'
          );
          transaction.oncomplete = () => {
            db.close();
          };

          objectStore = transaction.objectStore(this.storageName);
        }

        objectStore.createIndex('indexes', 'index', { unique: true });
        objectStore.createIndex('keys', 'key', { unique: true });
      };

      openRequest.onerror = async () => {
        reject(openRequest.error);
      };

      openRequest.onsuccess = async () => {
        openRequest.result.close();
        resolve(new Ok());
      };
    });
  }

  async getItemAsync(key: string): Promise<unknown> {
    this.checkStorage();
    return new Promise((resolve, reject) => {
      const openRequest = window.indexedDB.open(this.dbName, 1);

      openRequest.onerror = async () => {
        reject(openRequest.error);
      };

      openRequest.onsuccess = async () => {
        const db = openRequest.result;
        const transaction = db.transaction(
          this.storageName,
          'readonly'
        );
        transaction.oncomplete = () => {
          db.close();
        };
        const objectStore = transaction.objectStore(this.storageName);
        const keys = objectStore.index('keys');
        const getKeyRequest = keys.getKey(key);

        getKeyRequest.onerror = async () => {
          reject(getKeyRequest.error);
        };

        getKeyRequest.onsuccess = () => {
          if (getKeyRequest.result !== undefined) {
            const getValueRequest = objectStore.get(
              getKeyRequest.result
            );

            getValueRequest.onerror = async () => {
              reject(getValueRequest.error);
            };

            getValueRequest.onsuccess = () => {
              db.close();
              resolve((getValueRequest.result as Entry).value);
            };
          } else {
            db.close();
            resolve(undefined);
          }
        };
      };
    });
  }

  async setItemAsync(
    key: string,
    value: unknown
  ): Promise<Error | Ok> {
    this.checkStorage();
    return new Promise((resolve, reject) => {
      const openRequest = window.indexedDB.open(this.dbName, 1);

      openRequest.onerror = async () => {
        reject(openRequest.error);
      };

      openRequest.onsuccess = async () => {
        const db = openRequest.result;
        const transaction = db.transaction(
          this.storageName,
          'readwrite'
        );
        transaction.oncomplete = () => {
          db.close();
        };
        const objectStore = transaction.objectStore(this.storageName);
        const keys = objectStore.index('keys');
        const getKeyRequest = keys.getKey(key);

        getKeyRequest.onerror = async () => {
          reject(getKeyRequest.error);
        };

        getKeyRequest.onsuccess = () => {
          if (getKeyRequest.result === undefined) {
            const index = objectStore.index('indexes');
            const openCursorRequest = index.openCursor(null, 'prev');

            openCursorRequest.onerror = async () => {
              reject(openCursorRequest.error);
            };

            openCursorRequest.onsuccess = () => {
              let lastObjectIndex;
              if (openCursorRequest.result !== null) {
                lastObjectIndex = (
                  openCursorRequest.result.value as Entry
                ).index;
              } else {
                lastObjectIndex = -1;
              }
              const newEntry: Entry = {
                index: lastObjectIndex + 1,
                key,
                value,
              };
              objectStore.add(newEntry);
              db.close();
              resolve(new Ok());
            };
          }

          if (getKeyRequest.result !== undefined) {
            const getEntryRequest = objectStore.get(
              getKeyRequest.result
            );

            getEntryRequest.onerror = async () => {
              reject(getEntryRequest.error);
            };

            getEntryRequest.onsuccess = () => {
              const entry = getEntryRequest.result as Entry;
              entry.value = value;

              const setValueRequest = objectStore.put(
                entry,
                getKeyRequest.result
              );

              setValueRequest.onerror = async () => {
                reject(setValueRequest.error);
              };

              setValueRequest.onsuccess = () => {
                db.close();
                resolve(new Ok());
              };
            };
          }
        };
      };
    });
  }

  async removeItemAsync(key: string): Promise<Error | Ok> {
    this.checkStorage();
    return new Promise((resolve, reject) => {
      const openRequest = window.indexedDB.open(this.dbName, 1);

      openRequest.onerror = async () => {
        reject(openRequest.error);
      };

      openRequest.onsuccess = async () => {
        const db = openRequest.result;
        const transaction = db.transaction(
          this.storageName,
          'readwrite'
        );
        transaction.oncomplete = () => {
          db.close();
        };
        const objectStore = transaction.objectStore(this.storageName);
        const keys = objectStore.index('keys');
        const getKeyRequest = keys.getKey(key);

        getKeyRequest.onerror = async () => {
          reject(getKeyRequest.error);
        };

        getKeyRequest.onsuccess = () => {
          const keyToDel = getKeyRequest.result;
          if (keyToDel === undefined) {
            db.close();
            resolve(new Ok());
          } else {
            const deleteRequest = objectStore.delete(keyToDel);

            deleteRequest.onerror = async () => {
              reject(deleteRequest.error);
            };

            deleteRequest.onsuccess = () => {
              const range = IDBKeyRange.lowerBound(keyToDel, false);
              const openCursorRequest = objectStore.openCursor(range);

              openCursorRequest.onerror = async () => {
                reject(openCursorRequest.error);
              };

              openCursorRequest.onsuccess = () => {
                const cursor = openCursorRequest.result;
                if (cursor !== null) {
                  const currentKey = cursor.key;
                  const currentEntry = cursor.value as Entry;
                  currentEntry.index -= 1;
                  const updateEntryRequest = objectStore.put(
                    currentEntry,
                    currentKey
                  );

                  updateEntryRequest.onerror = async () => {
                    reject(updateEntryRequest.error);
                  };
                  cursor.continue();
                } else {
                  db.close();
                  resolve(new Ok());
                }
              };
            };
          }
        };
      };
    });
  }

  async clearAsync(): Promise<Error | Ok> {
    this.checkStorage();
    return new Promise((resolve, reject) => {
      const openRequest = window.indexedDB.open(this.dbName, 1);

      openRequest.onerror = async () => {
        reject(openRequest.error);
      };

      openRequest.onsuccess = async () => {
        const db = openRequest.result;
        const transaction = db.transaction(
          this.storageName,
          'readwrite'
        );
        transaction.oncomplete = () => {
          db.close();
        };
        const objectStore = transaction.objectStore(this.storageName);
        const clearRequest = objectStore.clear();

        clearRequest.onerror = async () => {
          reject(clearRequest.error);
        };

        clearRequest.onsuccess = () => {
          db.close();
          resolve(new Ok());
        };
      };
    });
  }

  async sizeAsync(): Promise<number> {
    this.checkStorage();
    return new Promise((resolve, reject) => {
      const openRequest = window.indexedDB.open(this.dbName, 1);

      openRequest.onerror = async () => {
        reject(openRequest.error);
      };

      openRequest.onsuccess = async () => {
        const db = openRequest.result;
        const transaction = db.transaction(
          this.storageName,
          'readonly'
        );
        transaction.oncomplete = () => {
          db.close();
        };
        const objectStore = transaction.objectStore(this.storageName);
        const countRequest = objectStore.count();

        countRequest.onerror = async () => {
          reject(countRequest.error);
        };

        countRequest.onsuccess = () => {
          db.close();
          resolve(countRequest.result);
        };
      };
    });
  }

  async keyAsync(index: number): Promise<Error | string | undefined> {
    this.checkStorage();
    return new Promise((resolve, reject) => {
      const openRequest = window.indexedDB.open(this.dbName, 1);

      openRequest.onerror = async () => {
        reject(openRequest.error);
      };

      openRequest.onsuccess = async () => {
        const db = openRequest.result;
        const transaction = db.transaction(
          this.storageName,
          'readonly'
        );
        transaction.oncomplete = () => {
          db.close();
        };
        const objectStore = transaction.objectStore(this.storageName);
        const indexes = objectStore.index('indexes');
        const getKeyRequest = indexes.getKey(index);

        getKeyRequest.onerror = async () => {
          reject(getKeyRequest.error);
        };

        getKeyRequest.onsuccess = () => {
          if (getKeyRequest.result === undefined) {
            db.close();
            resolve(undefined);
          }

          if (getKeyRequest.result !== undefined) {
            const getEntryRequest = objectStore.get(
              getKeyRequest.result
            );

            getEntryRequest.onerror = async () => {
              reject(getEntryRequest.error);
            };

            getEntryRequest.onsuccess = () => {
              const entry = getEntryRequest.result as Entry;
              db.close();
              resolve(entry.key);
            };
          }
        };
      };
    });
  }

  async deleteStorageAsync(): Promise<Error | Ok> {
    this.checkStorage();
    return new Promise((resolve, reject) => {
      const deleteDBRequest = window.indexedDB.deleteDatabase(
        this.dbName
      );

      deleteDBRequest.onerror = async () => {
        reject(deleteDBRequest.error);
      };

      deleteDBRequest.onsuccess = async () => {
        this.isDeleted = true;
        resolve(new Ok());
      };
    });
  }
}
