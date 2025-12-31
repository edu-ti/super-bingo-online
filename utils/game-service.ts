import {
    collection,
    doc,
    setDoc,
    getDoc,
    updateDoc,
    onSnapshot,
    arrayUnion,
    serverTimestamp,
    Timestamp
} from "firebase/firestore";
import { db } from "./firebase-config";
import { GameState, Player, WinType } from "../types";

const GAMES_COLLECTION = "games";

export const createGame = async (
    code: string,
    host: Player,
    settings: GameState['settings']
): Promise<void> => {
    const gameRef = doc(db, GAMES_COLLECTION, code);

    // Transform player object to plain object just in case
    const hostData = {
        ...host,
        cards: host.cards.map(c => ({
            ...c,
            // Ensure nested arrays are properly handled
            numbers: c.numbers,
            marked: c.marked
        }))
    };

    await setDoc(gameRef, {
        code,
        hostId: host.id,
        status: 'lobby',
        settings,
        drawnNumbers: [],
        lastDrawn: null,
        players: [hostData],
        winners: [],
        createdAt: serverTimestamp()
    });
};

export const joinGame = async (code: string, player: Player): Promise<boolean> => {
    const gameRef = doc(db, GAMES_COLLECTION, code);
    const gameSnap = await getDoc(gameRef);

    if (!gameSnap.exists()) {
        throw new Error("Jogo não encontrado");
    }

    const gameData = gameSnap.data();
    if (gameData.status !== 'lobby') {
        throw new Error("O jogo já começou");
    }

    // Check if username already exists
    const existingPlayers = gameData.players || [];
    if (existingPlayers.some((p: any) => p.username === player.username)) {
        // Just auto-rejoin if ID matches, otherwise block
        if (!existingPlayers.some((p: any) => p.id === player.id)) {
            throw new Error("Nome de usuário já está em uso nesta sala");
        }
    }

    // If player already in list (rejoining), don't duplicate
    if (!existingPlayers.some((p: any) => p.id === player.id)) {
        await updateDoc(gameRef, {
            players: arrayUnion(player)
        });
    }

    return true;
};

export const subscribeToGame = (code: string, callback: (data: GameState | null) => void) => {
    return onSnapshot(doc(db, GAMES_COLLECTION, code), (doc) => {
        if (doc.exists()) {
            callback(doc.data() as GameState);
        } else {
            callback(null);
        }
    });
};

export const updateGame = async (code: string, updates: Partial<GameState>) => {
    const gameRef = doc(db, GAMES_COLLECTION, code);
    await updateDoc(gameRef, updates);
};

export const updatePlayerCards = async (code: string, playerId: string, newCards: any[]) => {
    const gameRef = doc(db, GAMES_COLLECTION, code);
    // Note: Updating a single item in an array in Firestore is tricky without reading first or using complex logic.
    // For this MVP, we will read, update local, and write back players array.
    // In production, consider a subcollection for players.

    // Can be improved with transactions for safety
    try {
        const gameSnap = await getDoc(gameRef);
        if (gameSnap.exists()) {
            const data = gameSnap.data();
            const players = data.players.map((p: Player) => {
                if (p.id === playerId) {
                    return { ...p, cards: newCards };
                }
                return p;
            });
            await updateDoc(gameRef, { players });
        }
    } catch (error) {
        console.error("Error updating cards:", error);
    }
}
