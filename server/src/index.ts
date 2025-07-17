import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import { GameManager } from './game-manager';
import { createUser, validateUser, getUser, ensureAdminUser, getAllUsers, deleteUser, updateEloRating, resetUserPassword, clearDatabase } from './db';

const app = express();
const httpServer = createServer(app);
const io = new Server(httpServer, {
  cors: {
    origin: true, // Allow all origins since server has fixed IP
    methods: ["GET", "POST"],
    credentials: true
  }
});

const PORT = process.env.PORT || 3001;
const gameManager = new GameManager();

// Pass socket server to game manager for clock updates
gameManager.setSocketServer(io);

app.use(cors({
  origin: true, // Allow all origins since server has fixed IP
  credentials: true
}));
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Authentication endpoints
app.post('/api/register', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  if (username.length < 3 || username.length > 20) {
    return res.status(400).json({ error: 'Username must be 3-20 characters' });
  }
  
  if (password.length < 1) {
    return res.status(400).json({ error: 'Password is required' });
  }
  
  try {
    await createUser(username, password);
    res.json({ success: true, username: username.toLowerCase() });
  } catch (error: any) {
    if (error.message === 'Username already exists') {
      res.status(409).json({ error: 'Username already taken' });
    } else {
      res.status(500).json({ error: 'Registration failed' });
    }
  }
});

app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  
  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password required' });
  }
  
  try {
    const valid = await validateUser(username, password);
    if (valid) {
      const user = await getUser(username);
      res.json({ 
        success: true, 
        username: username.toLowerCase(),
        elo: user?.elo_rating || 1200,
        isAdmin: username.toLowerCase() === 'admin'
      });
    } else {
      res.status(401).json({ error: 'Invalid username or password' });
    }
  } catch (error) {
    res.status(500).json({ error: 'Login failed' });
  }
});

// Admin endpoints
app.get('/api/admin/users', async (req, res) => {
  try {
    const users = await getAllUsers();
    res.json(users);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

app.delete('/api/admin/users/:username', async (req, res) => {
  const { username } = req.params;
  
  if (username.toLowerCase() === 'admin') {
    return res.status(400).json({ error: 'Cannot delete admin user' });
  }
  
  try {
    await deleteUser(username);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

app.put('/api/admin/users/:username/elo', async (req, res) => {
  const { username } = req.params;
  const { elo } = req.body;
  
  if (typeof elo !== 'number' || elo < 0) {
    return res.status(400).json({ error: 'Invalid elo rating' });
  }
  
  try {
    await updateEloRating(username, elo);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update elo' });
  }
});

app.put('/api/admin/users/:username/password', async (req, res) => {
  const { username } = req.params;
  const { password } = req.body;
  
  if (!password || password.length < 1) {
    return res.status(400).json({ error: 'Password required' });
  }
  
  try {
    await resetUserPassword(username, password);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: 'Failed to reset password' });
  }
});

// Clear database endpoint
app.post('/api/admin/clear-database', async (req, res) => {
  try {
    await clearDatabase();
    res.json({ success: true, message: 'Database cleared successfully' });
  } catch (error) {
    console.error('Clear database error:', error);
    res.status(500).json({ error: 'Failed to clear database' });
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('New client connected:', socket.id);

  socket.on('join-game', async ({ gameId, isCreator, username }) => {
    if (!username) {
      socket.emit('join-error', { message: 'Login required to play' });
      return;
    }
    
    const result = await gameManager.joinGame(gameId, socket.id, isCreator, username);
    
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

httpServer.listen(port, '0.0.0.0', async () => {
  console.log(`Server running on port ${port}`);
  console.log(`\nTo play on local network:`);
  console.log(`1. Run 'npm run show-ip' to see your IP address`);
  console.log(`2. Access the game at http://YOUR_IP:5173`);
  console.log(`3. Share game links with YOUR_IP instead of localhost`);
  
  // Ensure admin user exists
  try {
    await ensureAdminUser();
    console.log('Admin user ready');
  } catch (error) {
    console.error('Failed to create admin user:', error);
  }
  
  // Log active game count every 5 minutes
  setInterval(() => {
    const gameCount = gameManager.getGameCount();
    console.log(`[${new Date().toISOString()}] Active games in memory: ${gameCount}`);
  }, 5 * 60 * 1000);
});