
import React from 'react';
import { BingoCardData, BingoFormat } from '../types';
import { BINGO_75_COLS } from '../constants';

interface BingoCardProps {
  card: BingoCardData;
  drawnNumbers: number[];
  compact?: boolean;
}

const BingoCard: React.FC<BingoCardProps> = ({ card, drawnNumbers, compact }) => {
  const isHit = (val: number | null) => val === null || drawnNumbers.includes(val);

  return (
    <div className={`bg-white rounded-xl shadow-lg border-2 overflow-hidden transition-all duration-300 ${card.isWinner ? 'border-yellow-400 ring-4 ring-yellow-200 scale-105' : 'border-slate-200'}`}>
      <div className="bg-slate-800 p-2 flex justify-between px-4">
        {BINGO_75_COLS.map(letter => (
          <span key={letter} className="text-white font-bungee text-xl">{letter}</span>
        ))}
      </div>
      <div className="grid grid-cols-5 p-2 gap-1 bg-slate-100">
        {card.numbers.map((num, idx) => {
          const hit = isHit(num);
          // rIdx and cIdx are derived from idx
          // const rIdx = Math.floor(idx / 5);
          // const cIdx = idx % 5;
          return (
            <div
              key={idx}
              className={`
                  aspect-square flex items-center justify-center rounded-md font-bold text-sm md:text-base transition-all duration-500
                  ${num === null ? 'bg-yellow-100 text-yellow-700' : hit ? 'bg-indigo-600 text-white animate-bounce-in' : 'bg-white text-slate-700 shadow-sm'}
                `}
            >
              {num === null ? '★' : num}
            </div>
          );
        })}
      </div>
      {card.almostBingo && !card.isWinner && (
        <div className="bg-orange-500 text-white text-center text-[10px] font-bold py-0.5 uppercase tracking-wider animate-pulse">
          Falta 1!
        </div>
      )}
      {card.isWinner && (
        <div className="bg-yellow-400 text-slate-900 text-center text-[10px] font-extrabold py-0.5 uppercase tracking-wider">
          GANHADOR!
        </div>
      )}
    </div>
  );
};

export default BingoCard;
