import {
  BadRequestException,
  HttpException,
  HttpStatus,
  Injectable,
  Logger,
  ServiceUnavailableException,
  UnauthorizedException,
} from '@nestjs/common';
import {ConfigService} from '@nestjs/config';
import {FieldValue} from 'firebase-admin/firestore';
import {FirebaseService} from '../firebase/firebase.service';
import {SignInDto} from './dto/sign-in.dto';
import {SignUpDto} from './dto/sign-up.dto';

type FirebaseSession = {
  localId: string;
  idToken: string;
  refreshToken: string;
  expiresIn: string;
};

type VerificationEmailResult = {
  email?: string;
};

const VERIFICATION_RESEND_COOLDOWN_MS = 60_000;

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    private readonly firebase: FirebaseService,
    private readonly config: ConfigService,
  ) {}

  private async firebaseRequest<T>(url: string, body: object | string): Promise<T> {
    const apiKey = this.config.get<string>('FIREBASE_API_KEY');

    if (!apiKey) {
      throw new ServiceUnavailableException('Authentication is not configured.');
    }

    let response: Response;

    try {
      response = await fetch(`${url}?key=${encodeURIComponent(apiKey)}`, {
        method: 'POST',
        headers: {
          'Content-Type': typeof body === 'string' ? 'application/x-www-form-urlencoded' : 'application/json',
        },
        body: typeof body === 'string' ? body : JSON.stringify(body),
        signal: AbortSignal.timeout(15000),
      });
    } catch {
      throw new ServiceUnavailableException('Authentication is temporarily unavailable.');
    }

    const data = await response.json().catch(() => null);

    if (!response.ok) {
      const code = String(data?.error?.message ?? '').split(' : ')[0];

      if (code === 'EMAIL_EXISTS') {
        throw new BadRequestException('An account already uses this email.');
      }

      if (code.startsWith('WEAK_PASSWORD') || code === 'PASSWORD_DOES_NOT_MEET_REQUIREMENTS') {
        throw new BadRequestException('Password does not meet the Firebase password policy.');
      }

      if (code === 'TOO_MANY_ATTEMPTS_TRY_LATER' || response.status === 429) {
        throw new ServiceUnavailableException('Too many attempts. Please try again later.');
      }

      const authenticationErrors = [
        'INVALID_ID_TOKEN',
        'INVALID_LOGIN_CREDENTIALS',
        'INVALID_PASSWORD',
        'EMAIL_NOT_FOUND',
        'INVALID_REFRESH_TOKEN',
        'TOKEN_EXPIRED',
        'USER_DISABLED',
        'USER_NOT_FOUND',
      ];

      if (authenticationErrors.includes(code)) {
        throw new UnauthorizedException('Invalid credentials or expired session. Please sign in again.');
      }

      throw new ServiceUnavailableException('Authentication is temporarily unavailable.');
    }

    if (!data) {
      throw new ServiceUnavailableException('Authentication returned an invalid response.');
    }

    return data as T;
  }

  async getCurrentUser(uid: string) {
    const user = await this.firebase.auth.getUser(uid);

    if (user.disabled) {
      throw new UnauthorizedException('Account is disabled.');
    }

    return {
      user: {
        uid: user.uid,
        email: user.email ?? '',
        nickname: user.displayName ?? '',
        displayName: user.displayName ?? '',
        emailVerified: user.emailVerified,
      },
    };
  }

  private async session(result: FirebaseSession) {
    return {
      ...(await this.getCurrentUser(result.localId)),
      token: result.idToken,
      refreshToken: result.refreshToken,
      expiresIn: Number(result.expiresIn),
    };
  }

  private async sendVerificationEmail(idToken: string): Promise<void> {
    await this.firebaseRequest<VerificationEmailResult>(
      'https://identitytoolkit.googleapis.com/v1/accounts:sendOobCode',
      {
        requestType: 'VERIFY_EMAIL',
        idToken,
      },
    );
  }

  private async markVerificationEmailSent(uid: string): Promise<void> {
    await this.firebase.db.collection('users').doc(uid).set(
      {
        verificationEmailSentAtMs: Date.now(),
        verificationEmailUpdatedAt: FieldValue.serverTimestamp(),
      },
      {merge: true},
    );
  }

  private async reserveVerificationResend(uid: string): Promise<void> {
    const ref = this.firebase.db.collection('users').doc(uid);
    const now = Date.now();

    await this.firebase.db.runTransaction(async (transaction) => {
      const snapshot = await transaction.get(ref);
      const previous = snapshot.data()?.verificationEmailSentAtMs;

      if (typeof previous === 'number' && now - previous < VERIFICATION_RESEND_COOLDOWN_MS) {
        const seconds = Math.ceil((VERIFICATION_RESEND_COOLDOWN_MS - (now - previous)) / 1000);

        throw new HttpException(
          `Please wait ${seconds} seconds before requesting another verification email.`,
          HttpStatus.TOO_MANY_REQUESTS,
        );
      }

      transaction.set(
        ref,
        {
          verificationEmailSentAtMs: now,
          verificationEmailUpdatedAt: FieldValue.serverTimestamp(),
        },
        {merge: true},
      );
    });
  }

  async signUp(dto: SignUpDto) {
    const result = await this.firebaseRequest<FirebaseSession>(
      'https://identitytoolkit.googleapis.com/v1/accounts:signUp',
      {
        email: dto.email.trim(),
        password: dto.password,
        returnSecureToken: true,
      },
    );

    try {
      await this.firebase.auth.updateUser(result.localId, {
        displayName: dto.displayName.trim(),
      });

      await this.firebase.db.collection('users').doc(result.localId).set(
        {
          uid: result.localId,
          email: dto.email.trim(),
          nickname: dto.displayName.trim(),
          displayName: dto.displayName.trim(),
          createdAt: FieldValue.serverTimestamp(),
        },
        {merge: true},
      );
    } catch {
      throw new ServiceUnavailableException('Account created, but profile setup failed. Please sign in.');
    }

    try {
      await this.sendVerificationEmail(result.idToken);
      await this.markVerificationEmailSent(result.localId);
    } catch (error) {
      this.logger.warn(
        `Account ${result.localId} was created, but the first verification email could not be sent: ${
          error instanceof Error ? error.message : String(error)
        }`,
      );
    }

    return this.session(result);
  }

  async signIn(dto: SignInDto) {
    const result = await this.firebaseRequest<FirebaseSession>(
      'https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword',
      {
        email: dto.email.trim(),
        password: dto.password,
        returnSecureToken: true,
      },
    );

    return this.session(result);
  }

  async refresh(refreshToken: string) {
    const result = await this.firebaseRequest<{
      user_id: string;
      id_token: string;
      refresh_token: string;
      expires_in: string;
    }>(
      'https://securetoken.googleapis.com/v1/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }).toString(),
    );

    return this.session({
      localId: result.user_id,
      idToken: result.id_token,
      refreshToken: result.refresh_token,
      expiresIn: result.expires_in,
    });
  }

  async resendVerification(uid: string, idToken: string) {
    const current = await this.firebase.auth.getUser(uid);

    if (current.disabled) {
      throw new UnauthorizedException('Account is disabled.');
    }

    if (current.emailVerified) {
      return {
        success: true,
        alreadyVerified: true,
      };
    }

    await this.reserveVerificationResend(uid);
    await this.sendVerificationEmail(idToken);

    return {
      success: true,
      alreadyVerified: false,
    };
  }

  async deleteAccount(uid: string) {
    await this.firebase.db.recursiveDelete(this.firebase.db.collection('users').doc(uid));
    await this.firebase.auth.deleteUser(uid);

    return {
      success: true,
    };
  }
}