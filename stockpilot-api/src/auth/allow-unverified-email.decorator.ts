import {SetMetadata} from '@nestjs/common';

export const ALLOW_UNVERIFIED_EMAIL_KEY = 'allow-unverified-email';

export const AllowUnverifiedEmail = () => SetMetadata(ALLOW_UNVERIFIED_EMAIL_KEY, true);