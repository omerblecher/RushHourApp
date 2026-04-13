import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router';
import { Capacitor } from '@capacitor/core';
import type { PluginListenerHandle } from '@capacitor/core';
import { AdMob, BannerAdPluginEvents } from '@capacitor-community/admob';
import type { AdMobBannerSize } from '@capacitor-community/admob';
import { showBanner, removeBanner, prepareInterstitial, showInterstitialIfDue } from '../../services/adService';
import { useGameStore } from '../../store/gameStore';
import { useProgressStore } from '../../store/progressStore';
import { getPuzzleById, getNextPuzzle } from '../../data/puzzleIndex';
import { submitScore } from '../../services/scoreService';
import { soundService } from '../../services/soundService';
import { Board } from '../../components/Board/Board';
import { GameHUD } from '../../components/GameHUD/GameHUD';
import { ControlBar } from '../../components/ControlBar/ControlBar';
import { GameHeader } from '../../components/GameHeader/GameHeader';
import { WinModal } from './WinModal';
import styles from './GameScreen.module.css';

export function GameScreen() {
  const { difficulty, puzzleId } = useParams<{ difficulty: string; puzzleId: string }>();
  const navigate = useNavigate();

  const loadPuzzle = useGameStore((s) => s.loadPuzzle);
  const state = useGameStore((s) => s.state);
  const minMoves = useGameStore((s) => s.minMoves);
  const recordCompletion = useProgressStore((s) => s.recordCompletion);
  const getBest = useProgressStore((s) => s.getBest);

  const [showWinModal, setShowWinModal] = useState(false);
  const [isNewPersonalBest, setIsNewPersonalBest] = useState(false);
  const [isWinAnimating, setIsWinAnimating] = useState(false);
  const [bannerHeight, setBannerHeight] = useState(0);

  // Load puzzle when puzzleId changes
  useEffect(() => {
    if (!puzzleId) {
      navigate('/puzzles', { replace: true });
      return;
    }

    const puzzle = getPuzzleById(puzzleId);
    if (!puzzle) {
      navigate('/puzzles', { replace: true });
      return;
    }

    loadPuzzle(puzzle.gridString, puzzle.minMoves);
    soundService.playStart();
    setShowWinModal(false);
    setIsNewPersonalBest(false);
    setIsWinAnimating(false);
  }, [puzzleId, loadPuzzle, navigate]);

  // Detect win and run celebration sequence
  useEffect(() => {
    if (state?.isWon && puzzleId && state.startTime && state.endTime) {
      const timeMs = state.endTime - state.startTime;
      const moves = state.moveCount;

      // Compute personal best BEFORE recordCompletion mutates the store
      const prevBest = getBest(puzzleId);
      const newPB =
        !prevBest ||
        moves < prevBest.bestMoves ||
        (moves === prevBest.bestMoves && timeMs < prevBest.bestTimeMs);

      setIsNewPersonalBest(newPB);
      recordCompletion(puzzleId, moves, timeMs);
      void submitScore(puzzleId, moves, timeMs, minMoves);

      // Win celebration sequence (animation first, then WinModal)
      soundService.playWin();

      void import('canvas-confetti').then(({ default: confetti }) => {
        confetti({
          particleCount: 150,
          spread: 100,
          origin: { x: 0.5, y: 0.6 },
          colors: ['#e63946', '#f5c842', '#4a90d9', '#2ecc71', '#9b59b6'],
          gravity: 1.2,
          scalar: 0.9,
        });
      });

      setIsWinAnimating(true);

      const timer = setTimeout(() => {
        setIsWinAnimating(false);
        setShowWinModal(true);
      }, 2000);

      return () => clearTimeout(timer);
    }
  }, [state?.isWon]);

  // Banner ad lifecycle (Phase 8 — BANNER-01..05)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    let listenerHandle: PluginListenerHandle | null = null;

    AdMob.addListener(
      BannerAdPluginEvents.SizeChanged,
      (info: AdMobBannerSize) => {
        setBannerHeight(info.height);
      }
    ).then((handle) => {
      listenerHandle = handle;
    });

    void showBanner();

    return () => {
      listenerHandle?.remove();
      void removeBanner();
      setBannerHeight(0);
    };
  }, []);

  // Interstitial preload (Phase 9 — INTER-01)
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;
    void prepareInterstitial();
  }, []);

  // Win-flow navigation wrapper — awaits interstitial on native (Phase 9 — INTER-02)
  const handleWinNavigate = async (action: () => void) => {
    if (Capacitor.isNativePlatform()) {
      await showInterstitialIfDue(); // always resolves within 5s (timeout guard)
    }
    action();
  };

  if (!state) {
    return (
      <div className={styles.loading}>
        <p>Loading puzzle...</p>
      </div>
    );
  }

  return (
    <div className={styles.container} style={{ paddingBottom: bannerHeight }}>
      <GameHeader />
      <GameHUD />
      <Board isWinAnimating={isWinAnimating} />
      <ControlBar />
      {showWinModal && puzzleId && (
        <WinModal
          puzzleId={puzzleId}
          moveCount={state.moveCount}
          minMoves={minMoves}
          timeMs={(state.endTime ?? Date.now()) - (state.startTime ?? Date.now())}
          isNewPersonalBest={isNewPersonalBest}
          onNextPuzzle={() => {
            const nextPuzzle = getNextPuzzle(puzzleId);
            void handleWinNavigate(() => {
              if (nextPuzzle) {
                navigate(`/play/${nextPuzzle.difficulty}/${nextPuzzle.id}`);
              } else {
                navigate(`/puzzles?difficulty=${difficulty ?? 'beginner'}`);
              }
              setShowWinModal(false);
            });
          }}
          onBackToSelection={() => {
            void handleWinNavigate(() => {
              navigate(`/puzzles?difficulty=${difficulty ?? 'beginner'}`);
              setShowWinModal(false);
            });
          }}
        />
      )}
    </div>
  );
}
