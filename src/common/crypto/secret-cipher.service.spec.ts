import { SecretCipherService } from './secret-cipher.service';

describe('SecretCipherService', () => {
  // 32 bytes de prueba, en base64 — mismo formato que se espera de SECRETS_ENCRYPTION_KEY.
  const claveDePrueba = Buffer.alloc(32, 7).toString('base64');
  const configServiceMock = { get: jest.fn().mockReturnValue(claveDePrueba) };

  function buildService(): SecretCipherService {
    return new SecretCipherService(configServiceMock as any);
  }

  it('descifra exactamente el mismo texto que se cifró', () => {
    const service = buildService();
    const original = 'sk-ant-api03-super-secreta-1234567890';

    const cifrado = service.encrypt(original);
    const descifrado = service.decrypt(cifrado);

    expect(descifrado).toBe(original);
  });

  it('el texto cifrado no contiene el secreto en claro', () => {
    const service = buildService();
    const original = 'sk-proj-otra-key-bien-secreta';

    const cifrado = service.encrypt(original);

    expect(cifrado).not.toContain(original);
  });

  it('dos cifrados del mismo texto dan resultados distintos (IV al azar por llamada)', () => {
    const service = buildService();
    const original = 'misma-key-dos-veces';

    const cifradoUno = service.encrypt(original);
    const cifradoDos = service.encrypt(original);

    expect(cifradoUno).not.toBe(cifradoDos);
    expect(service.decrypt(cifradoUno)).toBe(original);
    expect(service.decrypt(cifradoDos)).toBe(original);
  });

  it('falla al descifrar si el texto cifrado fue alterado (integridad vía authTag)', () => {
    const service = buildService();
    const cifrado = service.encrypt('key-original');
    const [iv, authTag, ciphertext] = cifrado.split(':');
    const ciphertextAlterado = Buffer.from(ciphertext, 'base64');
    ciphertextAlterado[0] ^= 0xff;
    const cifradoAlterado = [iv, authTag, ciphertextAlterado.toString('base64')].join(':');

    expect(() => service.decrypt(cifradoAlterado)).toThrow();
  });
});
