import { Chess } from 'chess.js';

interface Game {
  id: string;
  chess: Chess;
  whitePlayer: string | null;
  blackPlayer: string | null;
  createdAt: Date;
  whiteTime: number; // Time in milliseconds
  blackTime: number; // Time in milliseconds
  lastMoveTime: Date | null;
  clockInterval?: NodeJS.Timeout;
}

interface JoinResult {
  success: boolean;
  message?: string;
  color?: 'white' | 'black';
  gameState?: any;
  gameReady?: boolean;
}

interface MoveResult {
  success: boolean;
  message?: string;
  move?: any;
  gameState?: any;
}

export class GameManager {
  private games: Map<string, Game> = new Map();
  private playerToGame: Map<string, string> = new Map();
  private io: any; // Socket.io server instance
  
  private readonly INITIAL_TIME = 3 * 60 * 1000; // 3 minutes in milliseconds
  private readonly INCREMENT = 5 * 1000; // 5 seconds in milliseconds
  
  setSocketServer(io: any) {
    this.io = io;
  }

  joinGame(gameId: string, playerId: string, isCreator: boolean): JoinResult {
    let game = this.games.get(gameId);

    // Create new game if it doesn't exist
    if (!game) {
      game = {
        id: gameId,
        chess: new Chess(),
        whitePlayer: isCreator ? playerId : null,
        blackPlayer: null,
        createdAt: new Date(),
        whiteTime: this.INITIAL_TIME,
        blackTime: this.INITIAL_TIME,
        lastMoveTime: null
      };
      this.games.set(gameId, game);
      this.playerToGame.set(playerId, gameId);

      return {
        success: true,
        color: 'white',
        gameState: this.getGameState(game)
      };
    }

    // Check if player is rejoining
    if (game.whitePlayer === playerId || game.blackPlayer === playerId) {
      const color = game.whitePlayer === playerId ? 'white' : 'black';
      return {
        success: true,
        color,
        gameState: this.getGameState(game),
        gameReady: !!(game.whitePlayer && game.blackPlayer)
      };
    }

    // Join as black player if spot is available
    if (!game.blackPlayer) {
      game.blackPlayer = playerId;
      this.playerToGame.set(playerId, gameId);
      
      // Start the clock when both players have joined
      this.startClock(gameId);
      
      return {
        success: true,
        color: 'black',
        gameState: this.getGameState(game),
        gameReady: true
      };
    }

    return {
      success: false,
      message: 'Game is full'
    };
  }

  makeMove(gameId: string, playerId: string, move: any): MoveResult {
    const game = this.games.get(gameId);
    if (!game) {
      return { success: false, message: 'Game not found' };
    }

    // Check if it's the player's turn
    const isWhiteTurn = game.chess.turn() === 'w';
    const isWhitePlayer = game.whitePlayer === playerId;
    const isBlackPlayer = game.blackPlayer === playerId;

    if ((isWhiteTurn && !isWhitePlayer) || (!isWhiteTurn && !isBlackPlayer)) {
      return { success: false, message: 'Not your turn' };
    }

    // Attempt to make the move
    try {
      const result = game.chess.move(move);
      if (result) {
        // Add increment to the player who just moved
        if (isWhiteTurn) {
          game.whiteTime += this.INCREMENT;
        } else {
          game.blackTime += this.INCREMENT;
        }
        
        // Update last move time
        game.lastMoveTime = new Date();
        
        return {
          success: true,
          move: result,
          gameState: this.getGameState(game)
        };
      }
    } catch (e) {
      // Invalid move
    }

    return { success: false, message: 'Invalid move' };
  }

  handlePlayerLeave(gameId: string, playerId: string): {
    opponentId?: string;
    opponentWins?: boolean;
    forfeitingColor?: 'white' | 'black';
    opponentColor?: 'white' | 'black';
  } {
    const game = this.games.get(gameId);
    if (!game) return {};

    const isWhitePlayer = game.whitePlayer === playerId;
    const isBlackPlayer = game.blackPlayer === playerId;
    
    if (!isWhitePlayer && !isBlackPlayer) return {};

    // Stop the clock
    if (game.clockInterval) {
      clearInterval(game.clockInterval);
    }

    // Determine if there's an opponent who wins by forfeit
    const opponentId = isWhitePlayer ? game.blackPlayer : game.whitePlayer;
    const forfeitingColor = isWhitePlayer ? 'white' : 'black';
    const opponentColor = isWhitePlayer ? 'black' : 'white';
    
    // Mark the leaving player as null
    if (isWhitePlayer) {
      game.whitePlayer = null;
    } else {
      game.blackPlayer = null;
    }
    
    // Clean up player mapping
    this.playerToGame.delete(playerId);
    
    // If both players joined and game was in progress, it's a forfeit
    const wasGameInProgress = !!opponentId && !game.chess.isGameOver();
    
    return {
      opponentId: opponentId || undefined,
      opponentWins: wasGameInProgress,
      forfeitingColor,
      opponentColor
    };
  }

  handleDisconnect(playerId: string): void {
    const gameId = this.playerToGame.get(playerId);
    if (gameId) {
      // Keep game alive for reconnection
      this.playerToGame.delete(playerId);
    }
  }

  private getGameState(game: Game) {
    return {
      fen: game.chess.fen(),
      turn: game.chess.turn(),
      isCheck: game.chess.inCheck(),
      isCheckmate: game.chess.isCheckmate(),
      isDraw: game.chess.isDraw(),
      isGameOver: game.chess.isGameOver(),
      whiteJoined: !!game.whitePlayer,
      blackJoined: !!game.blackPlayer,
      whiteTime: game.whiteTime,
      blackTime: game.blackTime
    };
  }
  
  private startClock(gameId: string) {
    const game = this.games.get(gameId);
    if (!game) return;
    
    // Initialize last move time
    game.lastMoveTime = new Date();
    
    // Clear any existing interval
    if (game.clockInterval) {
      clearInterval(game.clockInterval);
    }
    
    // Update clocks every 100ms for smooth display
    game.clockInterval = setInterval(() => {
      const currentGame = this.games.get(gameId);
      if (!currentGame || currentGame.chess.isGameOver()) {
        if (currentGame?.clockInterval) {
          clearInterval(currentGame.clockInterval);
        }
        return;
      }
      
      const now = new Date();
      const elapsed = now.getTime() - (currentGame.lastMoveTime?.getTime() || now.getTime());
      
      // Deduct time from the current player
      if (currentGame.chess.turn() === 'w') {
        currentGame.whiteTime = Math.max(0, currentGame.whiteTime - elapsed);
        if (currentGame.whiteTime === 0) {
          // White flagged - black wins
          this.handleTimeOut(gameId, 'white');
        }
      } else {
        currentGame.blackTime = Math.max(0, currentGame.blackTime - elapsed);
        if (currentGame.blackTime === 0) {
          // Black flagged - white wins
          this.handleTimeOut(gameId, 'black');
        }
      }
      
      currentGame.lastMoveTime = now;
      
      // Emit clock update to all players in the game
      if (this.io) {
        this.io.to(gameId).emit('clock-update', {
          whiteTime: currentGame.whiteTime,
          blackTime: currentGame.blackTime
        });
      }
    }, 100);
  }
  
  private handleTimeOut(gameId: string, loser: 'white' | 'black') {
    const game = this.games.get(gameId);
    if (!game || game.chess.isGameOver()) return;
    
    // Stop the clock
    if (game.clockInterval) {
      clearInterval(game.clockInterval);
    }
    
    // Emit game over due to timeout
    if (this.io) {
      this.io.to(gameId).emit('game-over', {
        reason: 'timeout',
        winner: loser === 'white' ? 'black' : 'white',
        gameState: this.getGameState(game)
      });
    }
  }

  // Cleanup old games (call this periodically)
  cleanupOldGames(): void {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    for (const [gameId, game] of this.games.entries()) {
      if (game.createdAt < oneHourAgo && !game.whitePlayer && !game.blackPlayer) {
        this.games.delete(gameId);
      }
    }
  }
}