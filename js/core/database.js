import { DB_NAME, DB_VERSION, MIGRATIONS } from "./db-schema.js";

export function openDatabase({ name = DB_NAME, version = DB_VERSION, migrations = MIGRATIONS } = {}) {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(name, version);
    let failure;
    let cancelled = false;
    request.onupgradeneeded = (event) => {
      try {
        for (let next = event.oldVersion + 1; next <= event.newVersion; next += 1) {
          if (!migrations[next]) throw new Error(`Missing migration ${next}`);
          migrations[next](request.result, request.transaction);
        }
      } catch (error) {
        failure = error;
        request.transaction.abort();
      }
    };
    request.onblocked = () => {
      cancelled = true;
      reject(new Error("請關閉其他 Real Life Quest 分頁，再重新載入以更新資料庫。"));
    };
    request.onerror = () => reject(failure ?? request.error);
    request.onsuccess = () => {
      const db = request.result;
      db.onversionchange = () => db.close();
      if (cancelled) db.close();
      else resolve(db);
    };
  });
}

// Callback must enqueue requests synchronously; completion means committed.
export function runTransaction(db, stores, mode, enqueue) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(stores, mode);
    let result;
    let failure;
    transaction.oncomplete = () => resolve(typeof result === "function" ? result() : result);
    transaction.onabort = () => reject(failure ?? transaction.error ?? new Error("Transaction aborted"));
    transaction.onerror = () => {};
    try {
      result = enqueue(transaction);
      if (result?.then) throw new Error("Transaction callbacks must enqueue requests synchronously");
    } catch (error) {
      failure = error;
      transaction.abort();
    }
  });
}

export function getRecord(db, store, id) {
  return runTransaction(db, [store], "readonly", (tx) => {
    const request = tx.objectStore(store).get(id);
    return () => request.result;
  });
}

export function putRecord(db, store, record) {
  return runTransaction(db, [store], "readwrite", (tx) => {
    tx.objectStore(store).put(record);
  });
}

export function newRecordId() { return crypto.randomUUID(); }
