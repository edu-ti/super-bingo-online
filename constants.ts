
import { WinType } from './types';

export const BINGO_75_COLS = ['B', 'I', 'N', 'G', 'O'];
export const BINGO_90_ROWS = 3;
export const BINGO_90_COLS = 9;

export const WIN_TYPE_LABELS: Record<WinType, string> = {
  [WinType.LINE]: 'Linha',
  [WinType.DOUBLE_LINE]: 'Linha Dupla',
  [WinType.COLUMN]: 'Coluna',
  [WinType.DIAGONAL]: 'Diagonal',
  [WinType.CORNERS]: '4 Cantos',
  [WinType.FULL_HOUSE]: 'BINGO!'
};

export const FORMAT_DESCRIPTIONS = {
  '75': 'Tradicional Americano - Grade 5x5',
  '90': 'Europeu / Britânico - Grade 3x9'
};
