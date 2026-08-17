import { describe, expect, it } from 'vitest';
import {
  decryptBackup, encryptDeviceBackup, encryptPortableBackup, generateBackupDeviceKey,
} from './backupEncryption';

const metadata = {
  createdAt: '2026-08-17T12:00:00.000Z',
  schemaVersion: 8,
  trigger: 'manual' as const,
  createdBy: 'Адміністратор',
  checksum: '01234567',
};

describe('backup encryption', () => {
  it('round-trips a device backup', async () => {
    const key = generateBackupDeviceKey();
    const encrypted = await encryptDeviceBackup('{"database":true}', key, metadata);
    expect(encrypted.ciphertext).not.toContain('database');
    await expect(decryptBackup(encrypted, key)).resolves.toBe('{"database":true}');
  });

  it('round-trips a portable password backup and rejects a wrong password', async () => {
    const encrypted = await encryptPortableBackup('portable-data', 'correct-password', metadata);
    await expect(decryptBackup(encrypted, 'correct-password')).resolves.toBe('portable-data');
    await expect(decryptBackup(encrypted, 'wrong-password')).rejects.toThrow('Неправильний пароль');
  });
});
