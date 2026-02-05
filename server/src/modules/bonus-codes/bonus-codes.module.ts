import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { BonusCodesController, BonusCodesPublicController } from './bonus-codes.controller';
import { BonusCodesService } from './bonus-codes.service';
import { BonusCode, BonusCodeUsage } from '../../database/entities';
import { AuthModule } from '../../auth/auth.module';
import { AdminGuard } from '../admin/admin.guard';
import { UsersModule } from '../users/users.module';
import { RealtimeModule } from '../realtime/realtime.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([BonusCode, BonusCodeUsage]),
    forwardRef(() => AuthModule),
    forwardRef(() => UsersModule),
    forwardRef(() => RealtimeModule),
  ],
  controllers: [BonusCodesController, BonusCodesPublicController],
  providers: [BonusCodesService, AdminGuard],
  exports: [BonusCodesService],
})
export class BonusCodesModule {}
