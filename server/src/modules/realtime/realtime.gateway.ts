import { Injectable, UnauthorizedException, Inject, forwardRef } from '@nestjs/common';
import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { TelegramAuthService } from '../../auth/telegram-auth.service';
import { UsersService } from '../users/users.service';

@WebSocketGateway({
  cors: {
    origin: '*',
    credentials: true,
  },
})
@Injectable()
export class RealtimeGateway {
  constructor(
    private readonly telegramAuthService: TelegramAuthService,
    @Inject(forwardRef(() => UsersService))
    private readonly usersService: UsersService,
  ) {}

  @WebSocketServer()
  server: Server;

  afterInit(server: Server) {
    server.use(async (socket: Socket, next) => {
      try {
        const initData =
          (socket.handshake.auth as any)?.initData ||
          (socket.handshake.query as any)?.initData ||
          socket.handshake.headers['x-telegram-init-data'];

        if (!initData || typeof initData !== 'string') {
          return next(new UnauthorizedException('Telegram initData is required') as any);
        }

        const telegramUser = this.telegramAuthService.validateInitData(initData);
        if (!telegramUser) {
          return next(new UnauthorizedException('Invalid Telegram initData') as any);
        }

        const user = await this.usersService.findOrCreate(
          telegramUser.id,
          telegramUser.username,
        );

        socket.data.telegramUser = telegramUser;
        socket.data.userId = user.id;

        return next();
      } catch (e) {
        return next(new UnauthorizedException('Unauthorized') as any);
      }
    });
  }

  handleConnection(client: Socket) {
    const userId = client.data?.userId;
    if (typeof userId === 'number') {
      client.join(this.userRoom(userId));
    }
  }

  emitOddsUpdated(matchId: number) {
    this.server.to(this.matchRoom(matchId)).emit('oddsUpdated', { matchId });
  }

  emitMatchStarted(matchId: number) {
    this.server.to(this.matchRoom(matchId)).emit('matchStarted', { matchId });
  }

  emitMatchesUpdated(groupId: number) {
    this.server.to(this.groupRoom(groupId)).emit('matchesUpdated', { groupId });
  }

  emitRankingUpdated() {
    this.server.emit('rankingUpdated');
  }

  emitMatchesHistoryUpdated() {
    this.server.emit('matchesHistoryUpdated');
  }

  emitUserBetsUpdated(userId: number) {
    this.server.to(this.userRoom(userId)).emit('userBetsUpdated', { userId });
  }

  @SubscribeMessage('joinGroup')
  async joinGroup(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { groupId: number },
  ) {
    const groupId = Number(body?.groupId);
    if (!Number.isFinite(groupId) || groupId <= 0) {
      return { ok: false };
    }
    await client.join(this.groupRoom(groupId));
    return { ok: true };
  }

  @SubscribeMessage('leaveGroup')
  async leaveGroup(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { groupId: number },
  ) {
    const groupId = Number(body?.groupId);
    if (!Number.isFinite(groupId) || groupId <= 0) {
      return { ok: false };
    }
    await client.leave(this.groupRoom(groupId));
    return { ok: true };
  }

  @SubscribeMessage('joinMatch')
  async joinMatch(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { matchId: number },
  ) {
    const matchId = Number(body?.matchId);
    if (!Number.isFinite(matchId) || matchId <= 0) {
      return { ok: false };
    }
    await client.join(this.matchRoom(matchId));
    return { ok: true };
  }

  @SubscribeMessage('leaveMatch')
  async leaveMatch(
    @ConnectedSocket() client: Socket,
    @MessageBody() body: { matchId: number },
  ) {
    const matchId = Number(body?.matchId);
    if (!Number.isFinite(matchId) || matchId <= 0) {
      return { ok: false };
    }
    await client.leave(this.matchRoom(matchId));
    return { ok: true };
  }

  private userRoom(userId: number) {
    return `user:${userId}`;
  }

  private groupRoom(groupId: number) {
    return `group:${groupId}`;
  }

  private matchRoom(matchId: number) {
    return `match:${matchId}`;
  }
}

