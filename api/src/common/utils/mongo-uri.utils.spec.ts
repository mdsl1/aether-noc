import { assertLocalMongoUri, isLocalMongoUri } from './mongo-uri.utils';

describe('mongo-uri.utils', () => {
  describe('isLocalMongoUri', () => {
    it('aceita URIs apontando para localhost, 127.0.0.1 e ::1', () => {
      expect(isLocalMongoUri('mongodb://127.0.0.1:27018/aether_test')).toBe(
        true,
      );
      expect(isLocalMongoUri('mongodb://localhost:27017/aether_test')).toBe(
        true,
      );
      expect(
        isLocalMongoUri('mongodb://user:pass@127.0.0.1:27018/aether_test'),
      ).toBe(true);
      expect(isLocalMongoUri('mongodb://[::1]:27017/aether_test')).toBe(true);
    });

    it('rejeita URIs do MongoDB Atlas, hosts remotos ou strings inválidas', () => {
      expect(
        isLocalMongoUri(
          'mongodb+srv://user:pass@cluster0.abcde.mongodb.net/aether',
        ),
      ).toBe(false);
      expect(isLocalMongoUri('mongodb://10.0.0.5:27017/aether')).toBe(false);
      expect(isLocalMongoUri('http://localhost:27017/aether')).toBe(false);
      expect(isLocalMongoUri('')).toBe(false);
    });
  });

  describe('assertLocalMongoUri', () => {
    it('retorna a URI quando ela é local', () => {
      const uri = 'mongodb://127.0.0.1:27018/aether_test';
      expect(assertLocalMongoUri(uri)).toBe(uri);
    });

    it('lança erro quando indefinida ou apontando para Atlas/remoto', () => {
      expect(() => assertLocalMongoUri(undefined)).toThrow(
        /MONGO_TEST_URI não definida/,
      );
      expect(() =>
        assertLocalMongoUri(
          'mongodb+srv://user:pass@cluster0.abcde.mongodb.net/aether',
        ),
      ).toThrow(/BLOQUEADO POR SEGURANÇA/);
    });
  });
});
