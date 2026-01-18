'use strict';
import { Server } from 'socket.io';

export const config = {
  api: {
    bodyParser: false,
  },
};

let ioInstance = null;
const HANDLERS_VERSION = 3;
const nameToSocketIdMap = new Map();
const socketidToNameMap = new Map();
const anonymousChatQueue = [];
const anonymousVideoQueue = [];
const rooms = new Map();
const ANON_PUBLIC_CHAT_ROOM = 'anon-chat-public';

const randomInt = (maxExclusive) => {
  if (maxExclusive <= 0) return 0;
  return Math.floor(Math.random() * maxExclusive);
};

const createAnonName = () => {
  const n = (1000 + randomInt(9000)).toString();
  return `Stranger-${n}`;
};

const getRoomCount = (io, room) => {
  const set = io?.sockets?.adapter?.rooms?.get?.(room);
  return typeof set?.size === 'number' ? set.size : 0;
};

const broadcastAnonChatCount = (io) => {
  const count = getRoomCount(io, ANON_PUBLIC_CHAT_ROOM);
  io.to(ANON_PUBLIC_CHAT_ROOM).emit('anon:chat:count', { room: ANON_PUBLIC_CHAT_ROOM, count });
};

const getActiveUsers = () => {
  return [...nameToSocketIdMap.keys()].sort((a, b) =>
    a.localeCompare(b, undefined, { sensitivity: 'base' })
  );
};

const getActiveUserDetails = () => {
  return getActiveUsers().map((username) => ({
    username,
    id: nameToSocketIdMap.get(username),
  }));
};

const broadcastUsers = () => {
  ioInstance.emit('users:update', { users: getActiveUsers(), details: getActiveUserDetails() });
};

const getRooms = () => {
  return [...rooms.keys()].sort();
};

const broadcastRooms = () => {
  ioInstance.emit('rooms:update', { rooms: getRooms() });
};

const removeFromQueue = (queue, socketId) => {
  const idx = queue.indexOf(socketId);
  if (idx >= 0) queue.splice(idx, 1);
};

const matchAnonymousPair = (queue, roomPrefix, eventName, prepareSockets) => {
  const a = queue.shift();
  const b = queue.shift();
  if (!a || !b) {
    if (a) queue.unshift(a);
    return;
  }
  const room = `${roomPrefix}-${Date.now()}-${a.slice(0, 5)}-${b.slice(0, 5)}`;
  const socketA = ioInstance.sockets.sockets.get(a);
  const socketB = ioInstance.sockets.sockets.get(b);
  if (!socketA || !socketB) return;
  if (typeof prepareSockets === 'function') prepareSockets(socketA, socketB, room);
  socketA.join(room);
  socketB.join(room);
  socketA.emit(eventName, { room });
  socketB.emit(eventName, { room });
};

const attachHandlers = (io) => {
  if (io.__handlersVersion === HANDLERS_VERSION) return;
  io.removeAllListeners('connection');
  io.on('connection', (socket) => {
    console.log(`Socket connected: ${socket.id}`);
    try {
      socket.on('user:register', (data) => {
        const username = ((data?.username ?? data?.email) ?? '').trim();
        console.log(`Registering user: ${username} for socket: ${socket.id}`);
        if (!username) return;
        const prev = socketidToNameMap.get(socket.id);
        if (prev && prev !== username) {
          const mapped = nameToSocketIdMap.get(prev);
          if (mapped === socket.id) {
            nameToSocketIdMap.delete(prev);
          }
        }
        nameToSocketIdMap.set(username, socket.id);
        socketidToNameMap.set(socket.id, username);
        broadcastUsers();
      });

      socket.on('users:list', () => {
        socket.emit('users:update', { users: getActiveUsers(), details: getActiveUserDetails() });
      });

      socket.on('room:join', (data) => {
        const { username, email, room } = data;
        const name = ((username ?? email) ?? '').trim();
        if (name) {
          nameToSocketIdMap.set(name, socket.id);
          socketidToNameMap.set(socket.id, name);
          broadcastUsers();
        }
        io.to(room).emit('user:joined', { username: name, id: socket.id });
        socket.join(room);
        if (!rooms.has(room)) rooms.set(room, new Set());
        rooms.get(room).add(socket.id);
        broadcastRooms();
        io.to(socket.id).emit('room:join', data);
      });

      socket.on('room:leave', ({ room }) => {
        if (!room) return;
        socket.leave(room);
        const set = rooms.get(room);
        if (set) {
          set.delete(socket.id);
          if (set.size === 0) rooms.delete(room);
        }
        broadcastRooms();
      });

      socket.on('rooms:list', () => {
        socket.emit('rooms:update', { rooms: getRooms() });
      });

      socket.on('user:call', ({ to, offer }) => {
        io.to(to).emit('incomming:call', { from: socket.id, offer });
      });
      socket.on('call:accepted', ({ to, ans }) => {
        io.to(to).emit('call:accepted', { from: socket.id, ans });
      });
      socket.on('peer:nego:needed', ({ to, offer }) => {
        io.to(to).emit('peer:nego:needed', { from: socket.id, offer });
      });
      socket.on('peer:nego:done', ({ to, ans }) => {
        io.to(to).emit('peer:nego:final', { from: socket.id, ans });
      });
      socket.on('ice:candidate', ({ to, candidate }) => {
        io.to(to).emit('ice:candidate', { from: socket.id, candidate });
      });

      socket.on('chat:join', ({ room }) => {
        if (!room) return;
        if (typeof room === 'string' && room.startsWith('anon-chat') && !socket.data?.anonChatName) {
          socket.data.anonChatName = createAnonName();
        }
        socket.join(room);
        socket.emit('chat:joined', { room });
        if (room === ANON_PUBLIC_CHAT_ROOM) {
          broadcastAnonChatCount(io);
          socket.emit('anon:chat:count', { room: ANON_PUBLIC_CHAT_ROOM, count: getRoomCount(io, ANON_PUBLIC_CHAT_ROOM) });
        }
      });

      socket.on('chat:message', ({ room, message }) => {
        if (!room) return;
        const text = (message ?? '').toString().trim();
        if (!text) return;
        const isAnonymous = typeof room === 'string' && room.startsWith('anon-chat');
        const fromName = isAnonymous
          ? socket.data?.anonChatName ?? 'Stranger'
          : socketidToNameMap.get(socket.id) ?? 'Anonymous';
        io.to(room).emit('chat:message', {
          room,
          from: fromName,
          fromId: socket.id,
          message: text,
          at: Date.now(),
        });
      });

      socket.on('anon:chat:find', () => {
        if (!socket.data?.anonChatName) {
          socket.data.anonChatName = createAnonName();
        }
        socket.join(ANON_PUBLIC_CHAT_ROOM);
        socket.emit('anon:chat:matched', { room: ANON_PUBLIC_CHAT_ROOM });
      });
      socket.on('anon:chat:leave', () => {
        removeFromQueue(anonymousChatQueue, socket.id);
        socket.data.anonChatName = undefined;
        socket.leave(ANON_PUBLIC_CHAT_ROOM);
        socket.emit('anon:chat:left');
        broadcastAnonChatCount(io);
      });

      socket.on('anon:video:find', () => {
        if (anonymousVideoQueue.includes(socket.id)) return;
        removeFromQueue(anonymousChatQueue, socket.id);
        anonymousVideoQueue.push(socket.id);
        if (anonymousVideoQueue.length >= 2) {
          matchAnonymousPair(anonymousVideoQueue, 'anon-video', 'anon:video:matched');
        } else {
          socket.emit('anon:video:searching');
        }
      });
      socket.on('anon:video:leave', () => {
        removeFromQueue(anonymousVideoQueue, socket.id);
        socket.emit('anon:video:left');
      });

      socket.on('video:invite', ({ toEmail, room }) => {
        const name = (toEmail ?? '').trim();
        const roomId = (room ?? '').trim();
        if (!name || !roomId) return;
        const toSocketId = nameToSocketIdMap.get(name);
        if (!toSocketId) return;
        const fromName = socketidToNameMap.get(socket.id) ?? 'Anonymous';
        io.to(toSocketId).emit('video:invite', { from: fromName, room: roomId });
      });
      socket.on('chat:invite', ({ toEmail, room }) => {
        const name = (toEmail ?? '').trim();
        const roomId = (room ?? '').trim();
        if (!name || !roomId) return;
        const toSocketId = nameToSocketIdMap.get(name);
        if (!toSocketId) return;
        const fromName = socketidToNameMap.get(socket.id) ?? 'Anonymous';
        io.to(toSocketId).emit('chat:invite', { from: fromName, room: roomId });
      });

      socket.on('disconnect', () => {
        const wasInAnonChat = socket.rooms?.has?.(ANON_PUBLIC_CHAT_ROOM);
        const name = socketidToNameMap.get(socket.id);
        if (name) {
          socketidToNameMap.delete(socket.id);
          const mapped = nameToSocketIdMap.get(name);
          if (mapped === socket.id) nameToSocketIdMap.delete(name);
          broadcastUsers();
        }
        for (const [roomId, set] of rooms.entries()) {
          if (set.has(socket.id)) {
            set.delete(socket.id);
            if (set.size === 0) rooms.delete(roomId);
          }
        }
        broadcastRooms();
        socket.data.anonChatName = undefined;
        removeFromQueue(anonymousChatQueue, socket.id);
        removeFromQueue(anonymousVideoQueue, socket.id);
        if (wasInAnonChat) broadcastAnonChatCount(io);
      });
    } catch (e) {
      console.log(e);
    }
  });
  io.__handlersVersion = HANDLERS_VERSION;
  io.disconnectSockets(true);
};

export default function handler(req, res) {
  try {
    const httpServer = res.socket?.server;
    if (!httpServer) {
      res.status(500).end('No HTTP server available for Socket.IO');
      return;
    }
    if (!ioInstance) {
      const io = new Server(httpServer, {
        path: '/api/socket',
        cors: { origin: true },
        pingTimeout: 300000,
        ackTimeout: 5000,
        pingInterval: 10000,
      });
      ioInstance = io;
      httpServer.io = io;
    }
    attachHandlers(ioInstance);
    if (!res.headersSent) {
      res.end();
    }
  } catch (e) {
    console.error('Socket handler error', e);
    if (!res.headersSent) {
      res.status(500).end('Socket.IO error');
    }
  }
}
