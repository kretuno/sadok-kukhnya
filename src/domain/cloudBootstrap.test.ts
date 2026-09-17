import { describe, expect, it } from 'vitest';
import {
  assertCloudBootstrapAllowed,
  buildAuthoritativeBootstrapDocuments,
  canInitializeCloud,
  decideCloudInitialization,
  selectBootstrapSource,
} from './cloudBootstrap';

describe('cloud bootstrap authorization', () => {
  it('allows only director and admin to initialize an empty organization', () => {
    expect(canInitializeCloud('director')).toBe(true);
    expect(canInitializeCloud('admin')).toBe(true);
    expect(canInitializeCloud('nurse')).toBe(false);
    expect(canInitializeCloud('warehouse')).toBe(false);
    expect(canInitializeCloud('cook')).toBe(false);
    expect(canInitializeCloud('custodian')).toBe(false);
  });

  it('rejects uploading a local database from an ordinary employee device', () => {
    expect(() => assertCloudBootstrapAllowed('nurse', 25)).toThrow('керівник');
  });

  it('does not require elevated access when there is nothing local to upload', () => {
    expect(() => assertCloudBootstrapAllowed('cook', 0)).not.toThrow();
  });

  it('lets a director acquire an uninitialized organization', () => {
    expect(decideCloudInitialization({
      metadata: null,
      role: 'director',
      userId: 'director-1',
      deviceId: 'device-1',
      now: 1_000,
    })).toBe('acquire');
  });

  it('blocks an ordinary employee before the organization is initialized', () => {
    expect(() => decideCloudInitialization({
      metadata: null,
      role: 'cook',
      userId: 'cook-1',
      deviceId: 'device-2',
      now: 1_000,
    })).toThrow('керівник');
  });

  it('blocks a second device while the initial upload lease is active', () => {
    expect(() => decideCloudInitialization({
      metadata: {
        syncStatus: 'initializing',
        initializedBy: 'director-1',
        initializedByDevice: 'device-1',
        initializationLeaseUntil: 10_000,
      },
      role: 'director',
      userId: 'director-2',
      deviceId: 'device-2',
      now: 2_000,
    })).toThrow('іншому пристрої');
  });

  it('allows the same manager to recover a full bootstrap after the previous lease expires', () => {
    expect(decideCloudInitialization({
      metadata: {
        syncStatus: 'initializing',
        initializedBy: 'director-1',
        initializedByDevice: 'device-1',
        initializationLeaseUntil: 1_500,
      },
      role: 'director',
      userId: 'director-1',
      deviceId: 'device-2',
      now: 2_000,
    })).toBe('takeover');
  });

  it('allows an administrator to recover an expired bootstrap owned by a disabled account', () => {
    expect(decideCloudInitialization({
      metadata: {
        syncStatus: 'initializing',
        initializedBy: 'disabled-director',
        initializedByDevice: 'lost-device',
        initializationLeaseUntil: 1_500,
      },
      role: 'admin',
      userId: 'admin-1',
      deviceId: 'recovery-device',
      now: 2_000,
    })).toBe('takeover');
  });

  it('allows the owner device to resume and everyone to use an initialized organization', () => {
    const initializing = {
      syncStatus: 'initializing' as const,
      initializedBy: 'director-1',
      initializedByDevice: 'device-1',
      initializationLeaseUntil: 10_000,
    };
    expect(decideCloudInitialization({
      metadata: initializing,
      role: 'director',
      userId: 'director-1',
      deviceId: 'device-1',
      now: 2_000,
    })).toBe('resume');
    expect(decideCloudInitialization({
      metadata: { syncStatus: 'ready' },
      role: 'cook',
      userId: 'cook-1',
      deviceId: 'device-3',
      now: 2_000,
    })).toBe('ready');
  });

  it('treats an empty initialized cloud as authoritative instead of uploading device defaults', () => {
    expect(selectBootstrapSource('ready', 0)).toBe('cloud');
    expect(selectBootstrapSource('acquire', 0)).toBe('local');
    expect(selectBootstrapSource('resume', 0)).toBe('local');
    expect(selectBootstrapSource('resume', 5)).toBe('local');
    expect(selectBootstrapSource('takeover', 5)).toBe('local');
    expect(selectBootstrapSource('acquire', 5)).toBe('cloud');
  });

  it('creates tombstones for remote-only rows when an interrupted bootstrap resumes', () => {
    expect(buildAuthoritativeBootstrapDocuments(
      [{ entityType: 'product', syncId: 'product:kept', payload: { name: 'Kept' } }],
      [
        { entityType: 'product', syncId: 'product:kept', payload: { name: 'Old' }, deleted: false },
        { entityType: 'product', syncId: 'product:removed', payload: { name: 'Removed' }, deleted: false },
      ],
    )).toEqual([
      { entityType: 'product', syncId: 'product:kept', payload: { name: 'Kept' }, deleted: false },
      { entityType: 'product', syncId: 'product:removed', payload: null, deleted: true },
    ]);
  });
});
