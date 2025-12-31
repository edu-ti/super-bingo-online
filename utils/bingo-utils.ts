
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

  // Logic shared for 5x5 grids (both 75 and 90) -> Flat array size 25
  const is90 = format === BingoFormat.B90;
  const numbers: (number | null)[] = new Array(25).fill(null);
  const marked: boolean[] = new Array(25).fill(false);

  // Define ranges for columns
  // B75: 1-15, 16-30, 31-45, 46-60, 61-75
  // B90: 1-18, 19-36, 37-54, 55-72, 73-90
  const rangeSize = is90 ? 18 : 15;

  for (let col = 0; col < 5; col++) {
    const min = col * rangeSize + 1;
    const available = Array.from({ length: rangeSize }, (_, i) => min + i);
    const shuffled = available.sort(() => Math.random() - 0.5);

    for (let row = 0; row < 5; row++) {
      const index = row * 5 + col;
      if (col === 2 && row === 2) {
        numbers[index] = null; // FREE SPACE
        marked[index] = true;
      } else {
        numbers[index] = shuffled[row];
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
  const allNumbers = numbers.filter(n => n !== null) as number[];
  const isFullHouse = allNumbers.every(n => drawn.includes(n));

  if (isFullHouse) {
    hits.push(WinType.FULL_HOUSE);
  }

  // Check Lines, Columns, Diagonals (Legacy support for B75 or if enabled)
  // Rows
  for (let r = 0; r < 5; r++) {
    const rowIndices = [r * 5, r * 5 + 1, r * 5 + 2, r * 5 + 3, r * 5 + 4];
    if (rowIndices.every(idx => isHit(numbers[idx]))) hits.push(WinType.LINE);
  }
  // Cols
  for (let c = 0; c < 5; c++) {
    const colIndices = [c, c + 5, c + 10, c + 15, c + 20];
    if (colIndices.every(idx => isHit(numbers[idx]))) hits.push(WinType.COLUMN);
  }
  // Diagonals
  const d1Indices = [0, 6, 12, 18, 24]; // 0*5+0, 1*5+1...
  if (d1Indices.every(idx => isHit(numbers[idx]))) hits.push(WinType.DIAGONAL);

  const d2Indices = [4, 8, 12, 16, 20]; // 0*5+4, 1*5+3...
  if (d2Indices.every(idx => isHit(numbers[idx]))) hits.push(WinType.DIAGONAL);

  // Filter based on game settings
  return [...new Set(hits)].filter(h => winConditions.includes(h));
}

export function checkAlmostBingo(card: BingoCardData, drawn: number[]): boolean {
  const { numbers } = card;
  const allNums = numbers.filter(n => n !== null) as number[];
  const missing = allNums.filter(n => !drawn.includes(n)).length;
  return missing === 1;
}
