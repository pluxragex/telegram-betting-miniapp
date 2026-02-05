import { Module, forwardRef } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { PrizesController } from './prizes.controller';
import { PrizesService } from './prizes.service';
import { Prize, RankingSettings } from '../../database/entities';
import { AuthModule } from '../../auth/auth.module';
import { AdminGuard } from '../admin/admin.guard';

@Module({
  imports: [TypeOrmModule.forFeature([Prize, RankingSettings]), forwardRef(() => AuthModule)],
  controllers: [PrizesController],
  providers: [PrizesService, AdminGuard],
  exports: [PrizesService],
})
export class PrizesModule {}
