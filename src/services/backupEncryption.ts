export interface BackupEncryptionMetadata {
  createdAt: string;
  schemaVersion: number;
  trigger: 'automatic' | 'manual';
  createdBy: string;
  checksum: string;
}

export interface EncryptedBackupContainer extends BackupEncryptionMetadata {
  format: 'sadok-encrypted-backup';
  formatVersion: 1;
  encryption: {
    algorithm: 'AES-GCM';
    keySource: 'device' | 'password';
    iv: string;
    salt?: string;
    iterations?: number;
  };
  ciphertext: string;
}

const PBKDF2_ITERATIONS = 310_000;

function toArrayBuffer(bytes: Uint8Array): ArrayBuffer {
  return new Uint8Array(bytes).buffer;
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunkSize = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return btoa(binary);
}

function base64ToBytes(value: string): Uint8Array {
  const binary = atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index++) bytes[index] = binary.charCodeAt(index);
  return bytes;
}

async function importDeviceKey(rawKey: Uint8Array): Promise<CryptoKey> {
  return crypto.subtle.importKey('raw', toArrayBuffer(rawKey), 'AES-GCM', false, ['encrypt', 'decrypt']);
}

async function derivePasswordKey(password: string, salt: Uint8Array, iterations: number): Promise<CryptoKey> {
  const material = await crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(password),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: toArrayBuffer(salt), iterations },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

async function encrypt(
  plaintext: string,
  key: CryptoKey,
  metadata: BackupEncryptionMetadata,
  encryption: EncryptedBackupContainer['encryption'],
): Promise<EncryptedBackupContainer> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv },
    key,
    new TextEncoder().encode(plaintext),
  );
  return {
    format: 'sadok-encrypted-backup',
    formatVersion: 1,
    ...metadata,
    encryption: { ...encryption, iv: bytesToBase64(iv) },
    ciphertext: bytesToBase64(new Uint8Array(encrypted)),
  };
}

export function generateBackupDeviceKey(): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(32));
}

export function encodeBackupDeviceKey(key: Uint8Array): string {
  return bytesToBase64(key);
}

export function decodeBackupDeviceKey(value: string): Uint8Array {
  const key = base64ToBytes(value);
  if (key.byteLength !== 32) throw new Error('Пошкоджено локальний ключ резервних копій');
  return key;
}

export async function encryptDeviceBackup(
  plaintext: string,
  rawKey: Uint8Array,
  metadata: BackupEncryptionMetadata,
): Promise<EncryptedBackupContainer> {
  return encrypt(plaintext, await importDeviceKey(rawKey), metadata, {
    algorithm: 'AES-GCM',
    keySource: 'device',
    iv: '',
  });
}

export async function encryptPortableBackup(
  plaintext: string,
  password: string,
  metadata: BackupEncryptionMetadata,
): Promise<EncryptedBackupContainer> {
  if (password.length < 10) throw new Error('Пароль має містити щонайменше 10 символів');
  const salt = crypto.getRandomValues(new Uint8Array(16));
  return encrypt(plaintext, await derivePasswordKey(password, salt, PBKDF2_ITERATIONS), metadata, {
    algorithm: 'AES-GCM',
    keySource: 'password',
    iv: '',
    salt: bytesToBase64(salt),
    iterations: PBKDF2_ITERATIONS,
  });
}

export function isEncryptedBackup(value: unknown): value is EncryptedBackupContainer {
  if (!value || typeof value !== 'object') return false;
  const candidate = value as Partial<EncryptedBackupContainer>;
  return candidate.format === 'sadok-encrypted-backup'
    && candidate.formatVersion === 1
    && candidate.encryption?.algorithm === 'AES-GCM'
    && typeof candidate.ciphertext === 'string';
}

export async function decryptBackup(
  container: EncryptedBackupContainer,
  secret: string | Uint8Array,
): Promise<string> {
  try {
    const iv = base64ToBytes(container.encryption.iv);
    const key = container.encryption.keySource === 'password'
      ? await derivePasswordKey(
        String(secret),
        base64ToBytes(container.encryption.salt || ''),
        container.encryption.iterations || PBKDF2_ITERATIONS,
      )
      : await importDeviceKey(secret instanceof Uint8Array ? secret : decodeBackupDeviceKey(secret));
    const decrypted = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: toArrayBuffer(iv) },
      key,
      toArrayBuffer(base64ToBytes(container.ciphertext)),
    );
    return new TextDecoder().decode(decrypted);
  } catch {
    throw new Error(container.encryption.keySource === 'password'
      ? 'Неправильний пароль або файл резервної копії пошкоджено'
      : 'Локальну резервну копію не вдалося розшифрувати');
  }
}
