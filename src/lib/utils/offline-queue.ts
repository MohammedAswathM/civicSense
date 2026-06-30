const DB_NAME = 'civicsense-offline';
const STORE_NAME = 'queued-reports';

export interface QueuedReport {
  id: string;
  createdAt: number;
  payload: Record<string, unknown>;
}

export async function queueReport(report: QueuedReport): Promise<void> {
  const db = await openDb();
  await requestToPromise(db.transaction(STORE_NAME, 'readwrite').objectStore(STORE_NAME).put(report));
}

export async function listQueuedReports(): Promise<QueuedReport[]> {
  const db = await openDb();
  return requestToPromise(db.transaction(STORE_NAME, 'readonly').objectStore(STORE_NAME).getAll());
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE_NAME, { keyPath: 'id' });
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onerror = () => reject(request.error);
    request.onsuccess = () => resolve(request.result);
  });
}
