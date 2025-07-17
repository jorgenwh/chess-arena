import { io, Socket } from 'socket.io-client';

class SocketService {
    private socket: Socket | null = null;

    connect(): Socket {
        if (!this.socket) {
            // Always connect to the fixed server IP
            const serverUrl = 'http://10.10.52.28:3001';
            this.socket = io(serverUrl);
        }
        return this.socket;
    }

    disconnect(): void {
        if (this.socket) {
            this.socket.disconnect();
            this.socket = null;
        }
    }

    getSocket(): Socket | null {
        return this.socket;
    }
}

export const socketService = new SocketService();