import { exportBackup } from "../services/backup.js";
import { runTransaction } from "../core/database.js";

// Explicit development import only; never imported by app.js or production pages.
export async function resetDevelopmentDatabase(db, { enabled = false, confirmation, preserveBackup } = {}) {
  if (!enabled || !["localhost", "127.0.0.1", "[::1]"].includes(location.hostname) ||
      confirmation !== `RESET ${db.name}` || typeof preserveBackup !== "function") {
    throw new Error("Development reset requires localhost, explicit opt-in, exact database confirmation and a backup destination");
  }
  const backup = await exportBackup(db);
  await preserveBackup(backup);
  await runTransaction(db, Array.from(db.objectStoreNames), "readwrite", (tx) => {
    // Detect writes made by another tab while the backup was being saved.
    for (const name of db.objectStoreNames) {
      const store = tx.objectStore(name);
      const request = store.getAll();
      request.onsuccess = () => {
        if (JSON.stringify(request.result) !== JSON.stringify(backup.stores[name])) {
          tx.abort();
          return;
        }
        store.clear();
      };
    }
  });
  return backup;
}
