
import React from 'react';

interface BallDisplayProps {
  number: number | null;
  format: '75' | '90';
}

const BallDisplay: React.FC<BallDisplayProps> = ({ number, format }) => {
  if (number === null) return (
    <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-slate-200 border-8 border-slate-300 flex items-center justify-center shadow-inner">
      <span className="text-slate-400 font-bungee text-2xl animate-pulse">?</span>
    </div>
  );

  const getLetter = (num: number) => {
    if (format === '90') return '';
    if (num <= 15) return 'B';
    if (num <= 30) return 'I';
    if (num <= 45) return 'N';
    if (num <= 60) return 'G';
    return 'O';
  };

  const letter = getLetter(number);

  return (
    <div className="relative group">
      <div className="w-32 h-32 md:w-48 md:h-48 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-800 border-8 border-white/20 flex flex-col items-center justify-center shadow-2xl animate-bounce-in ring-8 ring-indigo-100">
        {letter && <span className="text-indigo-200 font-bungee text-2xl leading-none">{letter}</span>}
        <span className="text-white font-bungee text-6xl md:text-8xl leading-none drop-shadow-lg">{number}</span>
      </div>
      <div className="absolute -bottom-4 left-1/2 -translate-x-1/2 bg-slate-900 text-white text-xs px-3 py-1 rounded-full font-bold shadow-lg">
        Sorteado
      </div>
    </div>
  );
};

export default BallDisplay;
