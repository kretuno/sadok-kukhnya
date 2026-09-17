import type { CloudUserRole } from './cloudIdentity';

export function canInitializeCloud(role: CloudUserRole): boolean {
  return role === 'director' || role === 'admin';
}

export function assertCloudBootstrapAllowed(role: CloudUserRole, localEntityCount: number): void {
  if (localEntityCount > 0 && !canInitializeCloud(role)) {
    throw new Error('Першу синхронізацію закладу має виконати керівник або адміністратор');
  }
}

export interface CloudInitializationMetadata {
  syncStatus?: 'initializing' | 'ready';
  initializedBy?: string;
  initializedByDevice?: string;
  initializationLeaseUntil?: number;
}

interface CloudInitializationInput {
  metadata: CloudInitializationMetadata | null;
  role: CloudUserRole;
  userId: string;
  deviceId: string;
  now: number;
}

export type CloudInitializationDecision = 'acquire' | 'resume' | 'takeover' | 'ready';

interface BootstrapDocument<EntityType extends string = string, Payload = unknown> {
  entityType: EntityType;
  syncId: string;
  payload: Payload;
  deleted?: boolean;
}

export function buildAuthoritativeBootstrapDocuments<EntityType extends string, Payload>(
  localDocuments: BootstrapDocument<EntityType, Payload>[],
  cloudDocuments: BootstrapDocument<EntityType, Payload | null>[],
): Array<BootstrapDocument<EntityType, Payload | null> & { deleted: boolean }> {
  const localSyncIds = new Set(localDocuments.map(document => document.syncId));
  return [
    ...localDocuments.map(document => ({ ...document, deleted: false })),
    ...cloudDocuments
      .filter(document => !localSyncIds.has(document.syncId) && !document.deleted)
      .map(document => ({ ...document, payload: null, deleted: true })),
  ];
}

export function selectBootstrapSource(
  decision: CloudInitializationDecision,
  cloudDocumentCount: number,
): 'cloud' | 'local' {
  if (decision === 'ready') return 'cloud';
  if (decision === 'resume' || decision === 'takeover') return 'local';
  return cloudDocumentCount > 0 ? 'cloud' : 'local';
}

export function decideCloudInitialization({
  metadata,
  role,
  userId,
  deviceId,
  now,
}: CloudInitializationInput): CloudInitializationDecision {
  if (metadata?.syncStatus === 'ready') return 'ready';
  if (metadata?.syncStatus === 'initializing') {
    const ownsLease = metadata.initializedBy === userId
      && metadata.initializedByDevice === deviceId;
    if (ownsLease) return 'resume';
    if ((metadata.initializationLeaseUntil || 0) > now) {
      throw new Error('Початкова синхронізація вже виконується на іншому пристрої');
    }
    if (!canInitializeCloud(role) || (metadata.initializedBy !== userId && role !== 'admin')) {
      throw new Error('Відновити початкову синхронізацію має керівник або адміністратор');
    }
    return 'takeover';
  }
  if (!canInitializeCloud(role)) {
    throw new Error('Першу синхронізацію закладу має виконати керівник або адміністратор');
  }
  return 'acquire';
}
