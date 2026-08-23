import * as SecureStore from "expo-secure-store";

const ACCESS_KEY = "atelier_access_token";
const REFRESH_KEY = "atelier_refresh_token";
const DEVICE_KEY = "atelier_device_id";

function uuid(): string {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    return (c === "x" ? r : (r & 0x3) | 0x8).toString(16);
  });
}

export const tokenStore = {
  async save(access: string, refresh: string) {
    await SecureStore.setItemAsync(ACCESS_KEY, access);
    await SecureStore.setItemAsync(REFRESH_KEY, refresh);
  },
  async getAccess() {
    return SecureStore.getItemAsync(ACCESS_KEY);
  },
  async getRefresh() {
    return SecureStore.getItemAsync(REFRESH_KEY);
  },
  async clear() {
    await SecureStore.deleteItemAsync(ACCESS_KEY);
    await SecureStore.deleteItemAsync(REFRESH_KEY);
  },
};

export async function getOrCreateDeviceId(): Promise<string> {
  const existing = await SecureStore.getItemAsync(DEVICE_KEY);
  if (existing) return existing;
  const id = uuid();
  await SecureStore.setItemAsync(DEVICE_KEY, id);
  return id;
}

export type SavedFile = {
  prescriptionId: string;
  title: string;
  localUri: string;
  downloadedAt: string;
};

const FILES_KEY = "atelier_saved_files";

export async function getSavedFiles(): Promise<SavedFile[]> {
  const raw = await SecureStore.getItemAsync(FILES_KEY);
  if (!raw) return [];
  try {
    return JSON.parse(raw) as SavedFile[];
  } catch {
    return [];
  }
}

export async function saveFileMeta(meta: SavedFile) {
  const all = await getSavedFiles();
  const next = [meta, ...all.filter((f) => f.prescriptionId !== meta.prescriptionId)];
  await SecureStore.setItemAsync(FILES_KEY, JSON.stringify(next));
}

export async function removeFileMeta(prescriptionId: string) {
  const all = await getSavedFiles();
  await SecureStore.setItemAsync(
    FILES_KEY,
    JSON.stringify(all.filter((f) => f.prescriptionId !== prescriptionId)),
  );
}
