
import { BingoFormat, BingoCardData, WinType } from '../types';

export function generateRandomCode(length: number = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generateCard(format: BingoFormat): BingoCardData {
  const id = Math.random().toString(36).substr(2, 9);
  
  if (format === BingoFormat.B75) {
    const numbers: (number | null)[][] = Array.from({ length: 5 }, () => Array(5).fill(null));
    const marked: boolean[][] = Array.from({ length: 5 }, () => Array(5).fill(false));

    for (let col = 0; col < 5; col++) {
      const min = col * 15 + 1;
      const max = (col + 1) * 15;
      const available = Array.from({ length: 15 }, (_, i) => min + i);
      const shuffled = available.sort(() => Math.random() - 0.5);
      
      for (let row = 0; row < 5; row++) {
        if (col === 2 && row === 2) {
          numbers[row][col] = null; // FREE SPACE
          marked[row][col] = true;
        } else {
          numbers[row][col] = shuffled[row];
        }
      }
    }

    return { id, numbers, marked, format, isWinner: false, winTypes: [], almostBingo: false };
  } else {
    // 90 balls: 3x9 grid, but now with 24 numbers (out of 27 slots)
    // 24 numbers means only 3 slots in the whole card will be empty (1 per row)
    const numbers: (number | null)[][] = Array.from({ length: 3 }, () => Array(9).fill(null));
    const marked: boolean[][] = Array.from({ length: 3 }, () => Array(9).fill(false));
    
    const colRanges = [
      [1, 9], [10, 19], [20, 29], [30, 39], [40, 49],
      [50, 59], [60, 69], [70, 79], [80, 90]
    ];

    // Collect all available numbers per column range
    const allColPools = colRanges.map(range => {
      const pool = Array.from({ length: range[1] - range[0] + 1 }, (_, i) => range[0] + i);
      return pool.sort(() => Math.random() - 0.5);
    });

    // We need 24 numbers across 27 slots.
    // Each row of 9 slots will have 8 numbers and 1 empty slot.
    for (let r = 0; r < 3; r++) {
      // Pick one column index to be empty in this row
      const emptyCol = Math.floor(Math.random() * 9);
      for (let c = 0; c < 9; c++) {
        if (c !== emptyCol) {
          // Take a number from the pool for this column
          const num = allColPools[c].pop();
          numbers[r][c] = num || null;
        }
      }
    }

    // Sort columns numerically for better readability
    for (let c = 0; c < 9; c++) {
      const colNums = [numbers[0][c], numbers[1][c], numbers[2][c]].filter(n => n !== null) as number[];
      colNums.sort((a, b) => a - b);
      let idx = 0;
      if (numbers[0][c] !== null) numbers[0][c] = colNums[idx++];
      if (numbers[1][c] !== null) numbers[1][c] = colNums[idx++];
      if (numbers[2][c] !== null) numbers[2][c] = colNums[idx++];
    }

    return { id, numbers, marked, format, isWinner: false, winTypes: [], almostBingo: false };
  }
}

export function validateWin(card: BingoCardData, drawn: number[], winConditions: WinType[]): WinType[] {
  const hits: WinType[] = [];
  const { format, numbers } = card;

  const isHit = (r: number, c: number) => {
    const val = numbers[r][c];
    return val === null || drawn.includes(val);
  };

  if (format === BingoFormat.B75) {
    // 75 balls logic remains the same (Line, Column, Diagonal, Corners, Full House)
    for (let r = 0; r < 5; r++) {
      if ([0, 1, 2, 3, 4].every(c => isHit(r, c))) hits.push(WinType.LINE);
    }
    for (let c = 0; c < 5; c++) {
      if ([0, 1, 2, 3, 4].every(r => isHit(r, c))) hits.push(WinType.COLUMN);
    }
    if ([0, 1, 2, 3, 4].every(i => isHit(i, i))) hits.push(WinType.DIAGONAL);
    if ([0, 1, 2, 3, 4].every(i => isHit(i, 4 - i))) hits.push(WinType.DIAGONAL);
    if (isHit(0, 0) && isHit(0, 4) && isHit(4, 0) && isHit(4, 4)) hits.push(WinType.CORNERS);
    
    const allCellsHit = numbers.every((row, rIdx) => row.every((_, cIdx) => isHit(rIdx, cIdx)));
    if (allCellsHit) hits.push(WinType.FULL_HOUSE);

  } else {
    // 90 balls logic: User requested "ganhador precisa ter acertado todos número da cartela"
    // This means only FULL HOUSE counts for 90 balls.
    const allNums = numbers.flat().filter(n => n !== null) as number[];
    const allHit = allNums.every(n => drawn.includes(n));
    
    if (allHit) {
      hits.push(WinType.FULL_HOUSE);
    }
  }

  return [...new Set(hits)].filter(h => winConditions.includes(h));
}

export function checkAlmostBingo(card: BingoCardData, drawn: number[]): boolean {
  const { numbers } = card;
  const allNums = numbers.flat().filter(n => n !== null) as number[];
  const missing = allNums.filter(n => !drawn.includes(n)).length;
  return missing === 1;
}
