import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '../api/client';

let socket: Socket | null = null;

const activeGroupSubscriptions = new Set<number>();
const activeMatchSubscriptions = new Set<number>();

function getTelegramInitData(): string {
  if (typeof window !== 'undefined' && (window as any).Telegram?.WebApp) {
    return (window as any).Telegram.WebApp.initData;
  }
  return '';
}

export function getSocket(): Socket {
  if (!socket) {
    const url =
      API_BASE_URL.startsWith('http') ? API_BASE_URL : window.location.origin;

    console.log('[WS] Initializing socket connection to:', url);
    console.log('[WS] API_BASE_URL:', API_BASE_URL);

    const initData = getTelegramInitData();

    socket = io(url, {
      path: '/socket.io',
      transports: ['websocket'],
      withCredentials: true,
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      reconnectionAttempts: Infinity,
      auth: initData ? { initData } : undefined,
    });

    socket.on('connect', () => {
      console.log('[WS] Connected to server. Socket ID:', socket?.id);
      
      activeGroupSubscriptions.forEach((groupId) => {
        socket?.emit('joinGroup', { groupId });
      });
      
      activeMatchSubscriptions.forEach((matchId) => {
        socket?.emit('joinMatch', { matchId });
      });
    });

    socket.on('disconnect', (reason) => {
      console.log('[WS] Disconnected from server. Reason:', reason);
    });

    socket.on('connect_error', (error) => {
      console.error('[WS] Connection error:', error.message);
    });

    socket.on('reconnect', (attemptNumber) => {
      console.log('[WS] Reconnected after', attemptNumber, 'attempts');
    });

    socket.on('reconnect_attempt', (attemptNumber) => {
      console.log('[WS] Reconnection attempt', attemptNumber);
    });

    socket.on('reconnect_error', (error) => {
      console.error('[WS] Reconnection error:', error.message);
    });

    socket.on('reconnect_failed', () => {
      console.error('[WS] Reconnection failed');
    });

    socket.on('oddsUpdated', (data) => {
      console.log('[WS] Received oddsUpdated event:', data);
    });

    socket.on('matchStarted', (data) => {
      console.log('[WS] Received matchStarted event:', data);
    });

    socket.on('matchesUpdated', (data) => {
      console.log('[WS] Received matchesUpdated event:', data);
    });

    socket.on('rankingUpdated', () => {
      console.log('[WS] Received rankingUpdated event');
    });

    socket.on('matchesHistoryUpdated', () => {
      console.log('[WS] Received matchesHistoryUpdated event');
    });

    socket.on('userBetsUpdated', (data) => {
      console.log('[WS] Received userBetsUpdated event:', data);
    });
  }

  return socket;
}

export function joinGroupRoom(groupId: number): void {
  if (!Number.isFinite(groupId) || groupId <= 0) return;
  const s = getSocket();
  
  activeGroupSubscriptions.add(groupId);
  
  if (s.connected) {
    console.log('[WS] ▶ joinGroup', { groupId });
    s.emit('joinGroup', { groupId });
  } else {
    console.log('[WS] Queueing joinGroup (not connected yet)', { groupId });
    s.once('connect', () => {
      console.log('[WS] ▶ joinGroup (on connect)', { groupId });
      s.emit('joinGroup', { groupId });
    });
  }
}

export function leaveGroupRoom(groupId: number): void {
  if (!Number.isFinite(groupId) || groupId <= 0) return;
  const s = getSocket();
  
  activeGroupSubscriptions.delete(groupId);
  
  console.log('[WS] ◀ leaveGroup', { groupId });
  s.emit('leaveGroup', { groupId });
}

export function joinMatchRoom(matchId: number): void {
  if (!Number.isFinite(matchId) || matchId <= 0) return;
  const s = getSocket();
  
  activeMatchSubscriptions.add(matchId);
  
  if (s.connected) {
    console.log('[WS] ▶ joinMatch', { matchId });
    s.emit('joinMatch', { matchId });
  } else {
    console.log('[WS] Queueing joinMatch (not connected yet)', { matchId });
    s.once('connect', () => {
      console.log('[WS] ▶ joinMatch (on connect)', { matchId });
      s.emit('joinMatch', { matchId });
    });
  }
}

export function leaveMatchRoom(matchId: number): void {
  if (!Number.isFinite(matchId) || matchId <= 0) return;
  const s = getSocket();
  
  // Удаляем из активных подписок
  activeMatchSubscriptions.delete(matchId);
  
  console.log('[WS] ◀ leaveMatch', { matchId });
  s.emit('leaveMatch', { matchId });
}