/**
 * IndexedDB utility for caching heavy QC templates.
 * Uses native IndexedDB API to avoid external dependencies.
 */

const DB_NAME = "QC_CACHE_DB";
const STORE_NAME = "templates";
const DB_VERSION = 1;

export interface CachedTemplate {
    robotId: string;
    templateId: string;
    version: string;
    lastUpdated: string; // ISO string from server
    data: any;
    timestamp: number; // When it was cached locally
}

const openDB = (): Promise<IDBDatabase> => {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(DB_NAME, DB_VERSION);

        request.onupgradeneeded = () => {
            const db = request.result;
            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, { keyPath: "robotId" });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
};

export const getCachedTemplate = async (
    robotId: string
): Promise<CachedTemplate | null> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, "readonly");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.get(robotId);

            request.onsuccess = () => resolve(request.result || null);
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Failed to get cached template from IndexedDB:", error);
        return null;
    }
};

export const saveCachedTemplate = async (
    robotId: string,
    template: any
): Promise<void> => {
    try {
        const db = await openDB();
        const cachedData: CachedTemplate = {
            robotId,
            templateId: template.id, // Backend always sends id (from toJSON transform)
            version: template.version,
            lastUpdated: template.updatedAt,
            data: template,
            timestamp: Date.now()
        };

        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.put(cachedData);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Failed to save template to IndexedDB:", error);
    }
};

export const clearCachedTemplate = async (robotId: string): Promise<void> => {
    try {
        const db = await openDB();
        return new Promise((resolve, reject) => {
            const transaction = db.transaction(STORE_NAME, "readwrite");
            const store = transaction.objectStore(STORE_NAME);
            const request = store.delete(robotId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    } catch (error) {
        console.error("Failed to clear cached template from IndexedDB:", error);
    }
};
