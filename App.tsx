import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BingoFormat,
  GameStatus,
  WinType,
  GameState,
  Player,
  BingoCardData
} from './types';
import {
  generateRandomCode,
  generateCard,
  validateWin,
  checkAlmostBingo
} from './utils/bingo-utils';
import {
  createGame,
  joinGame,
  subscribeToGame,
  updateGame,
  updatePlayerCards
} from './utils/game-service';
import {
  WIN_TYPE_LABELS
} from './constants';
import BingoCard from './components/BingoCard';
import BallDisplay from './components/BallDisplay';
import { Trophy, Users, Settings, Plus, Play, Pause, RotateCcw, Layout, User, Crown, Search, History, Loader2 } from 'lucide-react';

const App: React.FC = () => {
  // Remote Game State
  const [gameState, setGameState] = useState<GameState | null>(null);

  // Local Player State
  const [currentPlayer, setCurrentPlayer] = useState<Player | null>(null);
  const [view, setView] = useState<'home' | 'lobby' | 'game'>('home');
  const [inputCode, setInputCode] = useState('');
  const [inputName, setInputName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Local UI State
  const [showConfetti, setShowConfetti] = useState(false);

  // Derived State
  const isHost = useMemo(() => {
    return gameState && currentPlayer && gameState.hostId === currentPlayer.id;
  }, [gameState, currentPlayer]);

  // Sync Effect
  useEffect(() => {
    if (!gameState?.code) return;

    console.log("Subscribing to game:", gameState.code);
    const unsubscribe = subscribeToGame(gameState.code, (data) => {
      if (data) {
        console.log("Game Update Received", data.players?.length, "players");
        setGameState(prev => {
          // Check for new winners to show confetti
          if (data.winners.length > (prev?.winners.length || 0)) {
            setShowConfetti(true);
            setTimeout(() => setShowConfetti(false), 5000);
          }
          return data;
        });

        // Auto-switch view based on status
        if (data.status === GameStatus.PLAYING && view === 'lobby') {
          setView('game');
        } else if (data.status === GameStatus.LOBBY && view === 'game') {
          // Game reset?
          setView('lobby');
        }
      } else {
        // Game deleted or invalid
        alert('Este jogo foi encerrado ou não existe mais.');
        setView('home');
        setGameState(null);
      }
    });

    return () => unsubscribe();
  }, [gameState?.code]); // Re-subscribe only if code changes

  // Sync Current Player with Game State (Fixes Stale Closure)
  useEffect(() => {
    if (gameState && currentPlayer && gameState.players) {
      const remoteMe = gameState.players.find(p => p.id === currentPlayer.id);
      if (remoteMe) {
        // Only update if data actually changed to avoid loop
        if (JSON.stringify(remoteMe.cards) !== JSON.stringify(currentPlayer.cards)) {
          console.log("Syncing player cards from server");
          setCurrentPlayer(prev => ({ ...remoteMe }));
        }
      }
    }
  }, [gameState, currentPlayer?.id]);

  // --- Persistence ---
  useEffect(() => {
    const savedPlayer = localStorage.getItem('bingo_player');
    if (savedPlayer) {
      try {
        setCurrentPlayer(JSON.parse(savedPlayer));
      } catch (e) {
        localStorage.removeItem('bingo_player');
      }
    }
  }, []);

  useEffect(() => {
    if (currentPlayer) {
      localStorage.setItem('bingo_player', JSON.stringify(currentPlayer));
    }
  }, [currentPlayer]);

  // --- Handlers ---

  const handleCreateGame = async () => {
    if (!inputName) return alert('Digite seu seu nome/apelido');

    setIsLoading(true);
    try {
      const code = generateRandomCode();
      const hostId = currentPlayer?.id || 'host-' + Math.random().toString(36).substr(2, 9);

      const host: Player = {
        id: hostId,
        username: inputName,
        isHost: true,
        cards: []
      };

      const initialSettings = {
        format: BingoFormat.B75,
        maxCardsPerPlayer: 4,
        winConditions: [WinType.LINE, WinType.FULL_HOUSE],
        autoMark: true,
        ballInterval: 0
      };

      await createGame(code, host, initialSettings);

      setGameState({
        code,
        hostId: host.id,
        status: GameStatus.LOBBY,
        settings: initialSettings,
        drawnNumbers: [],
        lastDrawn: null,
        players: [host],
        winners: []
      });
      setCurrentPlayer(host);
      setView('lobby');
    } catch (err: any) {
      console.error(err);
      alert('Erro ao criar jogo: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleJoinGame = async () => {
    if (!inputCode) return alert('Digite o código do jogo');
    if (!inputName) return alert('Digite seu nome/apelido');

    setIsLoading(true);
    try {
      const code = inputCode.toUpperCase();
      const playerId = currentPlayer?.id || 'player-' + Math.random().toString(36).substr(2, 9);

      const player: Player = {
        id: playerId,
        username: inputName,
        isHost: false,
        cards: []
      };

      await joinGame(code, player);

      // FIX: Initialize with empty arrays to prevent render crashes
      setGameState({
        code,
        players: [],
        winners: [],
        drawnNumbers: [],
        settings: { format: '75', maxCardsPerPlayer: 4 }
      } as any);

      setCurrentPlayer(player);
      setView('lobby');
    } catch (err: any) {
      console.error(err);
      alert('Erro ao entrar no jogo: ' + err.message);
    } finally {
      setIsLoading(false);
    }
  };

  const addCard = async () => {
    if (!currentPlayer || !gameState) return;
    if (currentPlayer.cards.length >= gameState.settings.maxCardsPerPlayer) {
      alert(`Máximo de ${gameState.settings.maxCardsPerPlayer} cartelas atingido!`);
      return;
    }

    const newCard = generateCard(gameState.settings.format);
    const updatedCards = [...currentPlayer.cards, newCard];

    // Optimistic update
    setCurrentPlayer(prev => prev ? ({ ...prev, cards: updatedCards }) : null);

    try {
      await updatePlayerCards(gameState.code, currentPlayer.id, updatedCards);
    } catch (err) {
      console.error(err);
      alert("Erro ao salvar cartela. Tente novamente.");
      // Rollback would be good here
    }
  };

  const handleUpdateSettings = async (newSettings: Partial<GameState['settings']>) => {
    if (!gameState) return;
    await updateGame(gameState.code, { settings: { ...gameState.settings, ...newSettings } });
  }

  const handleStartGame = async () => {
    if (!gameState) return;
    await updateGame(gameState.code, { status: GameStatus.PLAYING });
  };

  const drawNumber = useCallback(async () => {
    if (!gameState || gameState.status !== GameStatus.PLAYING) return;

    const max = gameState.settings.format === BingoFormat.B75 ? 75 : 90;
    const available = Array.from({ length: max }, (_, i) => i + 1)
      .filter(n => !gameState.drawnNumbers.includes(n));

    if (available.length === 0) {
      alert('Todos os números foram sorteados!');
      return;
    }

    const next = available[Math.floor(Math.random() * available.length)];
    const newDrawn = [...gameState.drawnNumbers, next];

    // Calculate Winners Locally for the Host and update everyone
    const newWinners: GameState['winners'] = [...gameState.winners];
    const updatedPlayers = gameState.players.map(player => {
      const updatedCards = player.cards.map(card => {
        const wins = validateWin(card, newDrawn, gameState.settings.winConditions);
        const isNewWinner = wins.length > 0;
        const almost = checkAlmostBingo(card, newDrawn);

        if (isNewWinner && !card.isWinner) {
          wins.forEach(w => {
            if (!newWinners.find(nw => nw.cardId === card.id && nw.winType === w)) {
              newWinners.push({
                playerId: player.id,
                username: player.username,
                cardId: card.id,
                winType: w
              });
            }
          });
        }

        return { ...card, isWinner: isNewWinner, winTypes: wins, almostBingo: almost };
      });
      return { ...player, cards: updatedCards };
    });

    await updateGame(gameState.code, {
      drawnNumbers: newDrawn,
      lastDrawn: next,
      players: updatedPlayers,
      winners: newWinners
    });

  }, [gameState]);

  const resetGame = async () => {
    if (!gameState) return;
    if (!confirm('Deseja realmente resetar o jogo?')) return;

    const resetPlayers = gameState.players.map(p => ({
      ...p,
      cards: p.cards.map(c => ({ ...c, isWinner: false, winTypes: [], almostBingo: false }))
    }));

    await updateGame(gameState.code, {
      drawnNumbers: [],
      lastDrawn: null,
      winners: [],
      status: GameStatus.LOBBY,
      players: resetPlayers
    });
  };

  // --- Render Helpers ---
  if (!gameState && view !== 'home') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-indigo-50">
        <Loader2 className="animate-spin text-indigo-600" size={48} />
      </div>
    )
  }

  // --- Views ---

  if (view === 'home') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6 bg-gradient-to-br from-indigo-600 to-purple-700 text-white">
        <div className="max-w-md w-full text-center space-y-8">
          <div className="space-y-2">
            <h1 className="text-6xl font-bungee tracking-tighter drop-shadow-md">BINGO!</h1>
            <p className="text-indigo-100 font-medium">Multiplayer Online</p>
          </div>

          <div className="bg-white/10 backdrop-blur-md rounded-2xl p-8 border border-white/20 shadow-xl space-y-6">
            <div className="space-y-4">
              <div className="text-left space-y-1">
                <label className="text-xs font-bold uppercase tracking-wider text-indigo-200">Seu Apelido</label>
                <input
                  type="text"
                  value={inputName}
                  onChange={(e) => setInputName(e.target.value)}
                  placeholder="Ex: BingoMaster"
                  disabled={isLoading}
                  className="w-full bg-white/10 border border-white/20 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-400 transition-all placeholder:text-white/30"
                />
              </div>

              <div className="grid grid-cols-1 gap-4">
                <button
                  onClick={handleCreateGame}
                  disabled={isLoading}
                  className="flex items-center justify-center gap-3 w-full bg-white text-indigo-700 font-bold py-4 rounded-xl shadow-lg hover:bg-indigo-50 transition-colors disabled:opacity-50"
                >
                  {isLoading ? <Loader2 className="animate-spin" /> : <Crown size={20} />}
                  Criar Novo Jogo
                </button>

                <div className="relative flex items-center gap-4 py-2">
                  <div className="flex-1 h-px bg-white/20"></div>
                  <span className="text-xs font-bold text-white/40">OU</span>
                  <div className="flex-1 h-px bg-white/20"></div>
                </div>

                <div className="space-y-2">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={inputCode}
                      onChange={(e) => setInputCode(e.target.value.toUpperCase())}
                      placeholder="CÓDIGO"
                      disabled={isLoading}
                      className="flex-1 bg-white/10 border border-white/20 rounded-xl px-4 py-3 outline-none focus:ring-2 focus:ring-indigo-400 transition-all placeholder:text-white/30 font-bold text-center tracking-widest"
                    />
                    <button
                      onClick={handleJoinGame}
                      disabled={isLoading}
                      className="bg-indigo-500 hover:bg-indigo-400 text-white font-bold px-6 rounded-xl shadow-lg transition-colors disabled:opacity-50"
                    >
                      {isLoading ? <Loader2 className="animate-spin" /> : "Entrar"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Force loading state if types mismatch or still loading
  if (!gameState || !currentPlayer) return <div className="text-center p-10">Carregando...</div>;

  if (view === 'lobby') {
    return (
      <div className="min-h-screen p-4 md:p-8 max-w-6xl mx-auto space-y-8">
        <header className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="space-y-1">
            <h2 className="text-3xl font-bungee text-slate-800">Sala de Espera</h2>
            <p className="text-slate-500 font-medium">
              {isHost ? "Você é o Host! Configure o jogo." : "Aguardando o host iniciar..."}
            </p>
          </div>
          <div className="bg-white px-6 py-3 rounded-2xl shadow-sm border border-slate-200 flex items-center gap-4">
            <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">Código</span>
            <span className="text-3xl font-bungee text-indigo-600 tracking-wider">{gameState.code}</span>
          </div>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">

          {/* Settings Column */}
          <div className="lg:col-span-1 space-y-6">
            <section className="bg-white rounded-3xl p-6 shadow-sm border border-slate-200 space-y-6">
              <div className="flex items-center gap-2 text-slate-800">
                <Settings size={20} className="text-indigo-600" />
                <h3 className="font-bold">Configurações</h3>
              </div>

              {isHost ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Formato</label>
                      <option value={BingoFormat.B75}>75 Bolas (5x5)</option>
                      <option value={BingoFormat.B90}>90 Bolas (5x5)</option>
                    </select>
                  </div>
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-slate-400 uppercase">Max Cartelas / Jogador</label>
                    <input
                      type="number"
                      min="1" max="10"
                      className="w-full p-3 rounded-xl bg-slate-100 border-none outline-none font-medium text-slate-700"
                      value={gameState.settings.maxCardsPerPlayer}
                      onChange={(e) => handleUpdateSettings({ maxCardsPerPlayer: parseInt(e.target.value) || 1 })}
                    />
                  </div>
                </div>
          ) : (
          <div className="space-y-4 text-sm font-medium">
            <div className="flex justify-between p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-500">Formato</span>
              <span className="text-slate-800 font-bold">{gameState.settings.format} Bolas</span>
            </div>
            <div className="flex justify-between p-3 bg-slate-50 rounded-xl">
              <span className="text-slate-500">Max Cartelas</span>
              <span className="text-slate-800 font-bold">{gameState.settings.maxCardsPerPlayer}</span>
            </div>
          </div>
              )}
        </section>

        {isHost && (
          <button
            onClick={handleStartGame}
            disabled={(gameState.players?.length || 0) === 0}
            className="w-full bg-indigo-600 text-white font-bold py-4 rounded-2xl shadow-lg shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Play size={20} fill="currentColor" />
            Começar Jogo
          </button>
        )}
      </div>

          {/* Cards Column */ }
    <div className="lg:col-span-2 space-y-6">
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-2 text-slate-800">
          <Layout size={20} className="text-indigo-600" />
          <h3 className="font-bold">Minhas Cartelas ({currentPlayer?.cards.length || 0})</h3>
        </div>
        <button
          onClick={addCard}
          disabled={(currentPlayer?.cards.length || 0) >= gameState.settings.maxCardsPerPlayer}
          className="flex items-center gap-2 text-indigo-600 font-bold text-sm bg-indigo-50 px-4 py-2 rounded-xl hover:bg-indigo-100 transition-all disabled:opacity-50"
        >
          <Plus size={16} />
          Adicionar Cartela
        </button>
      </div>

      {currentPlayer?.cards.length === 0 ? (
        <div className="border-4 border-dashed border-slate-200 rounded-3xl h-64 flex flex-col items-center justify-center text-slate-400 space-y-2">
          <Search size={48} strokeWidth={1} />
          <p className="font-medium">Você ainda não tem cartelas.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {currentPlayer?.cards.map((card) => (
            <BingoCard key={card.id} card={card} drawnNumbers={[]} />
          ))}
        </div>
      )}

      <section className="bg-slate-800 text-white rounded-3xl p-6 shadow-xl space-y-4">
        <div className="flex items-center gap-2">
          <Users size={20} className="text-indigo-400" />
          <h3 className="font-bold">Jogadores Conectados ({gameState.players?.length || 0})</h3>
        </div>
        <div className="flex flex-wrap gap-3">
          {(gameState.players || []).map(p => (
            <div key={p.id} className="bg-white/10 px-4 py-2 rounded-full text-sm font-bold flex items-center gap-2">
              {p.isHost && <Crown size={14} className="text-yellow-400" />}
              {p.username}
              <span className="text-[10px] bg-indigo-500/30 px-2 py-0.5 rounded-full">{p.cards.length} cards</span>
            </div>
          ))}
        </div>
      </section>
    </div>
        </div >
      </div >
    );
  }

// Game View
return (
  <div className="min-h-screen pb-20">
    {/* Top Header */}
    <header className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
      <div className="max-w-7xl mx-auto px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 text-white p-2 rounded-lg font-bungee text-xl">B</div>
          <div>
            <h2 className="text-sm font-bold text-slate-800">{gameState.settings.format} Bolas</h2>
            <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-tighter">Status: {gameState.status}</p>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="hidden md:flex flex-col items-end">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Código</span>
            <span className="text-xl font-bungee text-slate-800 tracking-wider">{gameState.code}</span>
          </div>
          {isHost && (
            <button
              onClick={resetGame}
              className="bg-red-50 text-red-600 p-2 rounded-xl hover:bg-red-100 transition-colors"
              title="Resetar Jogo"
            >
              <RotateCcw size={20} />
            </button>
          )}
        </div>
      </div>
    </header>

    <main className="max-w-7xl mx-auto p-4 md:p-8 grid grid-cols-1 lg:grid-cols-12 gap-8">
      {/* Left Side: Game Board & History */}
      <div className="lg:col-span-4 space-y-8">
        <div className="bg-white rounded-[2rem] p-8 shadow-xl shadow-slate-200 border border-slate-100 flex flex-col items-center space-y-6">
          <BallDisplay number={gameState.lastDrawn} format={gameState.settings.format} />

          {isHost && (
            <button
              onClick={drawNumber}
              className="w-full bg-indigo-600 hover:bg-indigo-700 text-white font-bungee text-xl py-4 rounded-2xl shadow-lg shadow-indigo-200 transition-all flex items-center justify-center gap-3 transform active:scale-95"
            >
              Sortear Próximo
            </button>
          )}

          <div className="w-full space-y-4">
            <div className="flex items-center justify-between text-xs font-bold text-slate-400 uppercase">
              <span>Últimos sorteados</span>
              <span className="bg-slate-100 px-2 py-1 rounded">{gameState.drawnNumbers.length} bolas</span>
            </div>
            <div className="flex flex-wrap gap-2 justify-center">
              {gameState.drawnNumbers.slice(-5).reverse().map((num, i) => (
                <div
                  key={`${num}-${i}`}
                  className={`
                      w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm
                      ${i === 0 ? 'bg-indigo-600 text-white ring-4 ring-indigo-100' : 'bg-slate-100 text-slate-400'}
                    `}
                >
                  {num}
                </div>
              ))}
            </div>
          </div>
        </div>

        <section className="bg-slate-900 rounded-[2rem] p-6 text-white shadow-2xl">
          <div className="flex items-center gap-2 mb-4">
            <History size={18} className="text-indigo-400" />
            <h3 className="font-bold text-sm uppercase tracking-widest text-slate-400">Placar Geral</h3>
          </div>
          <div className="grid grid-cols-10 gap-1 opacity-80">
            {Array.from({ length: gameState.settings.format === '75' ? 75 : 90 }, (_, i) => i + 1).map(num => (
              <div
                key={num}
                className={`
                    aspect-square text-[9px] flex items-center justify-center rounded-sm font-bold transition-all
                    ${gameState.drawnNumbers.includes(num) ? 'bg-indigo-500 text-white scale-110' : 'bg-white/5 text-white/20'}
                  `}
              >
                {num}
              </div>
            ))}
          </div>
        </section>
      </div>

      {/* Right Side: Player Cards & Winners */}
      <div className="lg:col-span-8 space-y-8">
        {gameState.winners.length > 0 && (
          <div className="bg-yellow-50 border-2 border-yellow-200 rounded-3xl p-6 space-y-4 overflow-hidden relative">
            <div className="absolute -top-4 -right-4 text-yellow-100 rotate-12">
              <Trophy size={120} strokeWidth={1} />
            </div>
            <div className="flex items-center gap-2">
              <Trophy size={24} className="text-yellow-600" />
              <h3 className="text-xl font-bold text-yellow-800">Ganhadores da Rodada!</h3>
            </div>
            <div className="space-y-2 relative z-0">
              {gameState.winners.map((winner, idx) => (
                <div key={idx} className="bg-white/80 backdrop-blur rounded-xl p-3 flex justify-between items-center shadow-sm border border-yellow-100">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-yellow-400 flex items-center justify-center text-xs font-bold">{idx + 1}</div>
                    <div>
                      <p className="font-bold text-slate-800">{winner.username}</p>
                      <p className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Cartela: {winner.cardId}</p>
                    </div>
                  </div>
                  <span className="bg-yellow-200 text-yellow-800 text-[10px] px-3 py-1 rounded-full font-extrabold uppercase tracking-widest">
                    {WIN_TYPE_LABELS[winner.winType]}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="flex items-center gap-2 text-slate-800">
            <Layout size={20} className="text-indigo-600" />
            <h3 className="font-bold">Minhas Cartelas</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {currentPlayer?.cards.map((card) => (
              <BingoCard key={card.id} card={card} drawnNumbers={gameState.drawnNumbers} />
            ))}
          </div>
        </div>
      </div>
    </main>

    {/* Floating Confetti Effect Simulation */}
    {showConfetti && (
      <div className="fixed inset-0 pointer-events-none z-50 overflow-hidden">
        {Array.from({ length: 50 }).map((_, i) => (
          <div
            key={i}
            className="absolute animate-bounce"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${-10 - Math.random() * 20}%`,
              backgroundColor: ['#facc15', '#818cf8', '#34d399', '#f87171'][Math.floor(Math.random() * 4)],
              width: '10px',
              height: '10px',
              borderRadius: '2px',
              transform: `rotate(${Math.random() * 360}deg)`,
              animation: `fall ${2 + Math.random() * 3}s linear infinite`
            }}
          />
        ))}
        <style>{`
            @keyframes fall {
              to { transform: translateY(110vh) rotate(360deg); opacity: 0; }
            }
          `}</style>
      </div>
    )}

    {/* Quick Player Bar */}
    <footer className="fixed bottom-0 inset-x-0 bg-white border-t border-slate-200 p-4 md:hidden flex justify-between items-center shadow-lg z-20">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-slate-100 flex items-center justify-center text-indigo-600">
          <User size={20} />
        </div>
        <span className="font-bold text-slate-700">{currentPlayer?.username}</span>
      </div>
      <div className="flex gap-2">
        <span className="bg-indigo-600 text-white text-xs px-3 py-1.5 rounded-full font-bold">
          {currentPlayer?.cards.length} Cards
        </span>
      </div>
    </footer>
  </div>
);
};

export default App;
