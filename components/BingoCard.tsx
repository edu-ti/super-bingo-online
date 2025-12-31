
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

  if (card.format === BingoFormat.B75) {
    return (
      <div className={`bg-white rounded-xl shadow-lg border-2 overflow-hidden transition-all duration-300 ${card.isWinner ? 'border-yellow-400 ring-4 ring-yellow-200 scale-105' : 'border-slate-200'}`}>
        <div className="bg-slate-800 p-2 flex justify-between px-4">
          {BINGO_75_COLS.map(letter => (
            <span key={letter} className="text-white font-bungee text-xl">{letter}</span>
          ))}
        </div>
        <div className="grid grid-cols-5 p-2 gap-1 bg-slate-100">
          {card.numbers.map((row, rIdx) => (
            row.map((num, cIdx) => {
              const hit = isHit(num);
              return (
                <div 
                  key={`${rIdx}-${cIdx}`}
                  className={`
                    aspect-square flex items-center justify-center rounded-md font-bold text-sm md:text-base transition-all duration-500
                    ${num === null ? 'bg-yellow-100 text-yellow-700' : hit ? 'bg-indigo-600 text-white animate-bounce-in' : 'bg-white text-slate-700 shadow-sm'}
                  `}
                >
                  {num === null ? '★' : num}
                </div>
              );
            })
          ))}
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
  }

  // 90 Balls Format (3x9 grid, 24 numbers)
  return (
    <div className={`bg-white rounded-lg shadow-lg border-2 overflow-hidden transition-all duration-300 ${card.isWinner ? 'border-yellow-400 ring-4 ring-yellow-200 scale-105' : 'border-slate-200'}`}>
      <div className="grid grid-cols-9 p-1.5 gap-1 bg-slate-50">
        {card.numbers.map((row, rIdx) => (
          row.map((num, cIdx) => {
            const hit = num !== null && isHit(num);
            return (
              <div 
                key={`${rIdx}-${cIdx}`}
                className={`
                  aspect-[4/3] flex items-center justify-center rounded-sm font-bold text-xs md:text-sm transition-all duration-500
                  ${num === null ? 'bg-slate-200/20' : hit ? 'bg-emerald-600 text-white animate-bounce-in' : 'bg-white text-slate-700 border border-slate-200'}
                `}
              >
                {num}
              </div>
            );
          })
        ))}
      </div>
      {card.almostBingo && !card.isWinner && (
        <div className="bg-orange-500 text-white text-center text-[10px] font-bold py-0.5 uppercase tracking-wider animate-pulse">
          Falta 1!
        </div>
      )}
      {card.isWinner && (
          <div className="bg-yellow-400 text-slate-900 text-center text-[10px] font-extrabold py-0.5 uppercase tracking-wider">
            BINGO! TODA CARTELA PREENCHIDA!
          </div>
        )}
    </div>
  );
};

export default BingoCard;
