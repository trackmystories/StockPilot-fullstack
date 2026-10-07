import {Module} from '@nestjs/common';

import {AuthController} from './auth.controller';
import {AuthService} from './auth.service';
import {FirebaseAuthGuard} from './firebase-auth.guard';

@Module({
  controllers: [AuthController],
  providers: [AuthService, FirebaseAuthGuard],
  exports: [FirebaseAuthGuard],
})
export class AuthModule {}
