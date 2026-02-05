import { Injectable } from '@nestjs/common';
import { BetsService } from '../bets/bets.service';

@Injectable()
export class HistoryService {
  constructor(private betsService: BetsService) {}

  async getHistory(userId: number, page: number = 1, limit: number = 10) {
    return this.betsService.findByUserId(userId, page, limit);
  }
}

