
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
