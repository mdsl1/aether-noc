const LOCAL_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);

export function isLocalMongoUri(uri: string): boolean {
  if (!uri || !/^mongodb(\+srv)?:\/\//.test(uri)) {
    return false;
  }

  try {
    const normalized = uri.replace(/^mongodb(\+srv)?:\/\//, 'http://');
    const parsed = new URL(normalized);
    return LOCAL_HOSTNAMES.has(parsed.hostname.toLowerCase());
  } catch {
    return false;
  }
}

export function assertLocalMongoUri(uri: string | undefined): string {
  if (!uri) {
    throw new Error(
      'MONGO_TEST_URI não definida. Configure uma URI apontando exclusivamente para localhost ou 127.0.0.1.',
    );
  }

  if (!isLocalMongoUri(uri)) {
    throw new Error(
      `BLOQUEADO POR SEGURANÇA: MONGO_TEST_URI deve apontar exclusivamente para localhost/127.0.0.1 (recebido host não-local).`,
    );
  }

  return uri;
}
