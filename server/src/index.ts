import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GameManager } from './game-manager';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: ["http://localhost:5173", "http://127.0.0.1:5173", /^http:\/\/192\.168\.\d{1,3}\.\d{1,3}:5173$/, /^http:\/\/10\.\d{1,3}\.\d{1,3}\.\d{1,3}:5173$/, /^http:\/\/172\.(1[6-9]|2\d|3[01])\.\d{1,3}\.\d{1,3}:5173$/],
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3001;
const gameManager = new GameManager();

// Pass socket server to game manager for clock updates
gameManager.setSocketServer(io);

app.use(cors());
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('join-game', ({ gameId, isCreator }) => {
    const result = gameManager.joinGame(gameId, socket.id, isCreator);
    
    if (result.success) {
      socket.join(gameId);
      socket.emit('game-joined', { 
        color: result.color, 
        gameState: result.gameState 
      });

      // Notify other player if game is ready
      if (result.gameReady) {
        io.to(gameId).emit('game-started', result.gameState);
      }
    } else {
      socket.emit('join-error', { message: result.message });
    }
  });

  socket.on('make-move', ({ gameId, move }) => {
    const result = gameManager.makeMove(gameId, socket.id, move);
    
    if (result.success) {
      io.to(gameId).emit('move-made', { 
        move: result.move, 
        gameState: result.gameState 
      });
    } else {
      socket.emit('move-error', { message: result.message });
    }
  });

  socket.on('leave-game', ({ gameId }) => {
    const result = gameManager.handlePlayerLeave(gameId, socket.id);
    
    if (result.opponentId && result.opponentWins) {
      // Notify the opponent that the player forfeited
      io.to(result.opponentId).emit('opponent-forfeited', {
        message: `${result.forfeitingColor === 'white' ? 'White' : 'Black'} has forfeited the game by leaving.`,
        winner: result.opponentColor
      });
    }
  });

  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
    gameManager.handleDisconnect(socket.id);
  });
});

const port = typeof PORT === 'string' ? parseInt(PORT, 10) : PORT;

httpServer.listen(port, '0.0.0.0', () => {
  console.log(`Server running on port ${port}`);
  console.log(`\nTo play on local network:`);
  console.log(`1. Run 'npm run show-ip' to see your IP address`);
  console.log(`2. Access the game at http://YOUR_IP:5173`);
  console.log(`3. Share game links with YOUR_IP instead of localhost`);
});