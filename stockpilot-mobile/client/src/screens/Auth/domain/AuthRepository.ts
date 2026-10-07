import type {User} from './User';

export type AuthResult = {
  token: string;
  refreshToken: string;
  expiresIn: number | string;
  user: User;
};

export type VerificationEmailResult = {
  success: boolean;
  alreadyVerified: boolean;
};

export interface AuthRepository {
  signUp(nickname: string, email: string, password: string): Promise<AuthResult>;
  signIn(email: string, password: string): Promise<AuthResult>;
  resendVerification(): Promise<VerificationEmailResult>;
}