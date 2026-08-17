import { getDeviceId } from './governance';
import { scheduleDurableLocalState } from './durableStorage';

export type SyncEntityType =
  | 'product'
  | 'dish'
  | 'recipe_component'
  | 'dish_nutrition_profile';

export interface EntitySyncMutation {
  id: string;
  entityType: SyncEntityType;
  syncId: string;
  operation: 'upsert' | 'delete';
  payload: Record<string, unknown> | null;
  baseRevision: number;
  occurredAt: string;
  deviceId: string;
  status: 'pending' | 'conflict';
}

export interface RemoteEntityDocument {
  entityType: SyncEntityType;
  syncId: string;
  payload: Record<string, unknown> | null;
  deleted: boolean;
  revision: number;
  updatedAt: string;
  updatedBy: string;
  deviceId: string;
}

export interface EntitySyncConflict {
  id: string;
  detectedAt: string;
  entityType: SyncEntityType;
  syncId: string;
  local: EntitySyncMutation;
  remote: RemoteEntityDocument;
}

const QUEUE_KEY = 'sadok_entity_sync_queue_v1';
const CONFLICTS_KEY = 'sadok_entity_sync_conflicts_v1';
const BOOTSTRAP_KEY = 'sadok_entity_sync_bootstrap_v1';
const CURSOR_KEY = 'sadok_entity_sync_cursor_v1';
export const ENTITY_SYNC_EVENT = 'sadok-entity-sync-change';

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) as T : fallback;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  localStorage.setItem(key, JSON.stringify(value));
  scheduleDurableLocalState();
  window.dispatchEvent(new CustomEvent(ENTITY_SYNC_EVENT));
}

function makeId(prefix: string): string {
  const suffix = typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID()
    : `${Date.now()}-${Math.random().toString(16).slice(2)}`;
  return `${prefix}-${suffix}`;
}

export function queueEntityMutation(input: Omit<EntitySyncMutation,
  'id' | 'occurredAt' | 'deviceId' | 'status'
>): EntitySyncMutation {
  const mutation: EntitySyncMutation = {
    ...input,
    id: makeId('mutation'),
    occurredAt: new Date().toISOString(),
    deviceId: getDeviceId(),
    status: 'pending',
  };
  const queue = getEntitySyncQueue();
  const withoutOlderPending = queue.filter(item => !(
    item.syncId === mutation.syncId && item.status === 'pending'
  ));
  writeJson(QUEUE_KEY, [...withoutOlderPending, mutation].slice(-5000));
  return mutation;
}

export function getEntitySyncQueue(): EntitySyncMutation[] {
  return readJson<EntitySyncMutation[]>(QUEUE_KEY, []);
}

export function getPendingEntityMutations(): EntitySyncMutation[] {
  return getEntitySyncQueue().filter(item => item.status === 'pending');
}

export function getPendingEntityMutationCount(): number {
  return getPendingEntityMutations().length;
}

export function markEntityMutationsSynced(ids: string[]): void {
  const completed = new Set(ids);
  writeJson(QUEUE_KEY, getEntitySyncQueue().filter(item => !completed.has(item.id)));
}

export function removeEntityMutationsForSyncId(syncId: string): void {
  writeJson(QUEUE_KEY, getEntitySyncQueue().filter(item => item.syncId !== syncId));
}

export function replaceEntityMutation(mutation: EntitySyncMutation): void {
  writeJson(QUEUE_KEY, getEntitySyncQueue().map(item => item.id === mutation.id ? mutation : item));
}

export function getEntitySyncConflicts(): EntitySyncConflict[] {
  return readJson<EntitySyncConflict[]>(CONFLICTS_KEY, []);
}

export function saveEntitySyncConflict(
  local: EntitySyncMutation,
  remote: RemoteEntityDocument,
): EntitySyncConflict {
  const conflict: EntitySyncConflict = {
    id: makeId('conflict'),
    detectedAt: new Date().toISOString(),
    entityType: local.entityType,
    syncId: local.syncId,
    local: { ...local, status: 'conflict' },
    remote,
  };
  replaceEntityMutation(conflict.local);
  const conflicts = getEntitySyncConflicts().filter(item => item.syncId !== local.syncId);
  writeJson(CONFLICTS_KEY, [conflict, ...conflicts].slice(0, 500));
  return conflict;
}

export function removeEntitySyncConflict(id: string): void {
  writeJson(CONFLICTS_KEY, getEntitySyncConflicts().filter(item => item.id !== id));
}

export function isEntityBootstrapComplete(): boolean {
  return localStorage.getItem(BOOTSTRAP_KEY) === 'complete';
}

export function markEntityBootstrapComplete(): void {
  localStorage.setItem(BOOTSTRAP_KEY, 'complete');
  scheduleDurableLocalState();
  window.dispatchEvent(new CustomEvent(ENTITY_SYNC_EVENT));
}

export function getEntitySyncCursor(): string {
  return localStorage.getItem(CURSOR_KEY) || '';
}

export function saveEntitySyncCursor(value: string): void {
  localStorage.setItem(CURSOR_KEY, value);
  scheduleDurableLocalState();
}

export function subscribeEntitySyncState(listener: () => void): () => void {
  window.addEventListener(ENTITY_SYNC_EVENT, listener);
  return () => window.removeEventListener(ENTITY_SYNC_EVENT, listener);
}

export function entitySyncStorageKeys(): string[] {
  return [QUEUE_KEY, CONFLICTS_KEY, BOOTSTRAP_KEY, CURSOR_KEY];
}
