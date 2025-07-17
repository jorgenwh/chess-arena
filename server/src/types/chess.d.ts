declare module 'chess.js' {
  export class Chess {
    constructor(fen?: string);
    move(move: string | { from: string; to: string; promotion?: string }): any;
    fen(): string;
    turn(): 'w' | 'b';
    inCheck(): boolean;
    isCheckmate(): boolean;
    isDraw(): boolean;
    isGameOver(): boolean;
  }
}