import * as SecureStore from 'expo-secure-store';

const TOKEN_KEY = 'auth_token';

export class SecureTokenStorage {
  async save(token: string) {
    await SecureStore.setItemAsync(TOKEN_KEY, token);
  }
}
