
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

  // Logic shared for 5x5 grids (both 75 and 90)
  const is90 = format === BingoFormat.B90;
  const numbers: (number | null)[][] = Array.from({ length: 5 }, () => Array(5).fill(null));
  const marked: boolean[][] = Array.from({ length: 5 }, () => Array(5).fill(false));

  // Define ranges for columns
  // B75: 1-15, 16-30, 31-45, 46-60, 61-75
  // B90: 1-18, 19-36, 37-54, 55-72, 73-90
  const rangeSize = is90 ? 18 : 15;

  for (let col = 0; col < 5; col++) {
    const min = col * rangeSize + 1;
    // const max = (col + 1) * rangeSize; 
    const available = Array.from({ length: rangeSize }, (_, i) => min + i);
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
}

export function validateWin(card: BingoCardData, drawn: number[], winConditions: WinType[]): WinType[] {
  const hits: WinType[] = [];
  const { numbers } = card;

  // Helper to check if a value is hit
  const isHit = (val: number | null) => val === null || drawn.includes(val);

  // Check FULL HOUSE (Cartela Cheia)
  const allNumbers = numbers.flat().filter(n => n !== null) as number[];
  const isFullHouse = allNumbers.every(n => drawn.includes(n));

  if (isFullHouse) {
    hits.push(WinType.FULL_HOUSE);
  }

  // Check Lines, Columns, Diagonals (Legacy support for B75 or if enabled)
  if (numbers.length === 5) { // 5x5 grid
    // Rows
    for (let r = 0; r < 5; r++) {
      if (numbers[r].every(val => isHit(val))) hits.push(WinType.LINE);
    }
    // Cols
    for (let c = 0; c < 5; c++) {
      if ([0, 1, 2, 3, 4].every(r => isHit(numbers[r][c]))) hits.push(WinType.COLUMN);
    }
    // Diagonals
    if ([0, 1, 2, 3, 4].every(i => isHit(numbers[i][i]))) hits.push(WinType.DIAGONAL);
    if ([0, 1, 2, 3, 4].every(i => isHit(numbers[i][4 - i]))) hits.push(WinType.DIAGONAL);
  }

  // Filter based on game settings
  return [...new Set(hits)].filter(h => winConditions.includes(h));
}

export function checkAlmostBingo(card: BingoCardData, drawn: number[]): boolean {
  const { numbers } = card;
  const allNums = numbers.flat().filter(n => n !== null) as number[];
  const missing = allNums.filter(n => !drawn.includes(n)).length;
  return missing === 1;
}
