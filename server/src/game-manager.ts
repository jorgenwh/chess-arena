import { Chess } from 'chess.js';
import { getUserElo, updateEloRating } from './db';

interface Game {
  id: string;
  chess: Chess;
  whitePlayer: string | null;
  blackPlayer: string | null;
  whitePlayerUsername: string | null;
  blackPlayerUsername: string | null;
  whitePlayerElo: number;
  blackPlayerElo: number;
  createdAt: Date;
  whiteTime: number; // Time in milliseconds
  blackTime: number; // Time in milliseconds
  whiteIncrement: number; // Increment in milliseconds
  blackIncrement: number; // Increment in milliseconds
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
  private socketToUsername: Map<string, string> = new Map();
  private io: any; // Socket.io server instance
  
  private readonly BASE_TIME = 5 * 60 * 1000; // 5 minutes base time
  private readonly BASE_INCREMENT = 5 * 1000; // 5 seconds base increment
  
  setSocketServer(io: any) {
    this.io = io;
  }
  
  private calculateTimeHandicap(higherElo: number, lowerElo: number): {
    higherPlayerTime: number;
    lowerPlayerTime: number;
    higherPlayerIncrement: number;
    lowerPlayerIncrement: number;
  } {
    const eloDiff = higherElo - lowerElo;
    
    // If Elo difference is small (< 50), use standard time controls
    if (eloDiff < 50) {
      return {
        higherPlayerTime: this.BASE_TIME,
        lowerPlayerTime: this.BASE_TIME,
        higherPlayerIncrement: this.BASE_INCREMENT,
        lowerPlayerIncrement: this.BASE_INCREMENT
      };
    }
    
    // Exponential scaling: use power of 1.5 for more dramatic differences
    // Normalize to 0-1 range based on 750 Elo difference being the maximum
    const normalizedDiff = Math.min(eloDiff / 750, 1);
    const exponentialFactor = Math.pow(normalizedDiff, 1.5);
    
    // Define min/max limits
    const MIN_TIME = 5 * 1000; // 5 seconds
    const MAX_TIME = 10 * 60 * 1000; // 10 minutes
    const MIN_INCREMENT = 1 * 1000; // 1 second
    const MAX_INCREMENT = 15 * 1000; // 15 seconds
    
    // Calculate times with exponential scaling
    // Higher rated player: interpolate from BASE_TIME down to MIN_TIME
    const higherPlayerTime = this.BASE_TIME - (this.BASE_TIME - MIN_TIME) * exponentialFactor;
    // Lower rated player: interpolate from BASE_TIME up to MAX_TIME
    const lowerPlayerTime = this.BASE_TIME + (MAX_TIME - this.BASE_TIME) * exponentialFactor;
    
    // Calculate increments with exponential scaling
    // Higher rated player: interpolate from BASE_INCREMENT down to MIN_INCREMENT
    const higherPlayerIncrement = this.BASE_INCREMENT - (this.BASE_INCREMENT - MIN_INCREMENT) * exponentialFactor;
    // Lower rated player: interpolate from BASE_INCREMENT up to MAX_INCREMENT
    const lowerPlayerIncrement = this.BASE_INCREMENT + (MAX_INCREMENT - this.BASE_INCREMENT) * exponentialFactor;
    
    return {
      higherPlayerTime: Math.round(higherPlayerTime),
      lowerPlayerTime: Math.round(lowerPlayerTime),
      higherPlayerIncrement: Math.round(higherPlayerIncrement),
      lowerPlayerIncrement: Math.round(lowerPlayerIncrement)
    };
  }

  async joinGame(gameId: string, playerId: string, isCreator: boolean, username: string): Promise<JoinResult> {
    let game = this.games.get(gameId);
    const lowercaseUsername = username.toLowerCase();

    // Create new game if it doesn't exist
    if (!game) {
      // Get creator's Elo
      const creatorElo = await getUserElo(lowercaseUsername).catch(() => 1200);
      
      game = {
        id: gameId,
        chess: new Chess(),
        whitePlayer: isCreator ? playerId : null,
        blackPlayer: null,
        whitePlayerUsername: isCreator ? lowercaseUsername : null,
        blackPlayerUsername: null,
        whitePlayerElo: creatorElo,
        blackPlayerElo: 1200, // Will be updated when black joins
        createdAt: new Date(),
        whiteTime: this.BASE_TIME, // Will be adjusted when both players join
        blackTime: this.BASE_TIME,
        whiteIncrement: this.BASE_INCREMENT,
        blackIncrement: this.BASE_INCREMENT,
        lastMoveTime: null
      };
      this.games.set(gameId, game);
      this.playerToGame.set(playerId, gameId);
      this.socketToUsername.set(playerId, lowercaseUsername);

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
      // Get black player's Elo
      const blackElo = await getUserElo(lowercaseUsername).catch(() => 1200);
      
      game.blackPlayer = playerId;
      game.blackPlayerUsername = lowercaseUsername;
      game.blackPlayerElo = blackElo;
      this.playerToGame.set(playerId, gameId);
      this.socketToUsername.set(playerId, lowercaseUsername);
      
      // Calculate time handicaps based on Elo difference
      const whiteElo = game.whitePlayerElo;
      if (whiteElo > blackElo) {
        const handicap = this.calculateTimeHandicap(whiteElo, blackElo);
        game.whiteTime = handicap.higherPlayerTime;
        game.blackTime = handicap.lowerPlayerTime;
        game.whiteIncrement = handicap.higherPlayerIncrement;
        game.blackIncrement = handicap.lowerPlayerIncrement;
      } else if (blackElo > whiteElo) {
        const handicap = this.calculateTimeHandicap(blackElo, whiteElo);
        game.whiteTime = handicap.lowerPlayerTime;
        game.blackTime = handicap.higherPlayerTime;
        game.whiteIncrement = handicap.lowerPlayerIncrement;
        game.blackIncrement = handicap.higherPlayerIncrement;
      }
      // If equal Elo, times remain at base values
      
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
          game.whiteTime += game.whiteIncrement;
        } else {
          game.blackTime += game.blackIncrement;
        }
        
        // Update last move time
        game.lastMoveTime = new Date();
        
        const gameState = this.getGameState(game);
        
        // Check if game is over and update Elo ratings
        if (game.chess.isGameOver()) {
          this.handleGameOver(game);
        }
        
        return {
          success: true,
          move: result,
          gameState
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
    this.socketToUsername.delete(playerId);
    
    // If both players joined and game was in progress, it's a forfeit
    const wasGameInProgress = !!opponentId && !game.chess.isGameOver();
    
    // Update Elo for forfeit
    if (wasGameInProgress && opponentColor) {
      this.updateEloRatings(game, opponentColor);
    }
    
    // Check if both players have left - if so, delete the game
    if (!game.whitePlayer && !game.blackPlayer) {
      console.log(`Deleting game ${gameId} - both players have left`);
      // Stop any running clock
      if (game.clockInterval) {
        clearInterval(game.clockInterval);
      }
      // Delete the game from memory
      this.games.delete(gameId);
    }
    
    return {
      opponentId: opponentId || undefined,
      opponentWins: wasGameInProgress,
      forfeitingColor,
      opponentColor
    };
  }

  getGameCount(): number {
    return this.games.size;
  }

  handleDisconnect(playerId: string): void {
    const gameId = this.playerToGame.get(playerId);
    if (gameId) {
      const game = this.games.get(gameId);
      if (game) {
        // Mark player as disconnected
        if (game.whitePlayer === playerId) {
          game.whitePlayer = null;
        } else if (game.blackPlayer === playerId) {
          game.blackPlayer = null;
        }
        
        // Clean up player mapping
        this.playerToGame.delete(playerId);
        this.socketToUsername.delete(playerId);
        
        // Check if both players have disconnected - if so, delete the game
        if (!game.whitePlayer && !game.blackPlayer) {
          console.log(`Deleting game ${gameId} - both players have disconnected`);
          // Stop any running clock
          if (game.clockInterval) {
            clearInterval(game.clockInterval);
          }
          // Delete the game from memory
          this.games.delete(gameId);
        }
      } else {
        // Clean up mapping even if game doesn't exist
        this.playerToGame.delete(playerId);
        this.socketToUsername.delete(playerId);
      }
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
      blackTime: game.blackTime,
      whiteIncrement: game.whiteIncrement,
      blackIncrement: game.blackIncrement,
      whiteUsername: game.whitePlayerUsername,
      blackUsername: game.blackPlayerUsername,
      whiteElo: game.whitePlayerElo,
      blackElo: game.blackPlayerElo
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
    
    // Update Elo ratings for timeout
    const winner = loser === 'white' ? 'black' : 'white';
    this.updateEloRatings(game, winner);
    
    // Emit game over due to timeout
    if (this.io) {
      this.io.to(gameId).emit('game-over', {
        reason: 'timeout',
        winner,
        gameState: this.getGameState(game)
      });
    }
  }

  private async handleGameOver(game: Game) {
    if (game.clockInterval) {
      clearInterval(game.clockInterval);
    }
    
    // Determine winner
    let winner: 'white' | 'black' | 'draw' = 'draw';
    if (game.chess.isCheckmate()) {
      winner = game.chess.turn() === 'w' ? 'black' : 'white';
    }
    
    if (winner !== 'draw') {
      await this.updateEloRatings(game, winner);
    }
  }
  
  private async updateEloRatings(game: Game, winner: 'white' | 'black') {
    if (!game.whitePlayerUsername || !game.blackPlayerUsername) return;
    
    try {
      const whiteElo = await getUserElo(game.whitePlayerUsername);
      const blackElo = await getUserElo(game.blackPlayerUsername);
      
      // Simple Elo calculation: winner gets +25, loser gets -25
      const eloChange = 25;
      
      if (winner === 'white') {
        await updateEloRating(game.whitePlayerUsername, whiteElo + eloChange);
        await updateEloRating(game.blackPlayerUsername, Math.max(100, blackElo - eloChange));
      } else {
        await updateEloRating(game.whitePlayerUsername, Math.max(100, whiteElo - eloChange));
        await updateEloRating(game.blackPlayerUsername, blackElo + eloChange);
      }
      
      // Emit updated Elo ratings
      if (this.io && game.id) {
        const updatedWhiteElo = await getUserElo(game.whitePlayerUsername);
        const updatedBlackElo = await getUserElo(game.blackPlayerUsername);
        
        this.io.to(game.id).emit('elo-updated', {
          whiteElo: updatedWhiteElo,
          blackElo: updatedBlackElo,
          whiteUsername: game.whitePlayerUsername,
          blackUsername: game.blackPlayerUsername
        });
      }
    } catch (error) {
      console.error('Error updating Elo ratings:', error);
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