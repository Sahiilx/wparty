import { RoomState, QuizGameState, QuizQuestion, QuizLifeline } from '../types';
import { buildQuizRound, getPrizeValues, getSafeHavens, QUIZ_QUESTIONS } from '../words/quiz-questions';

export class QuizEngine {
  private static questionsByRoom: Record<string, QuizQuestion[]> = {};

  static initGame(roomState: RoomState): void {
    const playerIds = Object.keys(roomState.players).filter(id => roomState.players[id].isConnected);
    if (playerIds.length === 0) return;

    for (const id of playerIds) {
      roomState.players[id].score = 0;
    }

    const category = roomState.settings.quizCategory || 'All';
    const difficulty = roomState.settings.quizDifficulty || 'progressive';
    const questions = buildQuizRound(15, category, difficulty);
    QuizEngine.questionsByRoom[roomState.code] = questions;

    const usedLifelines: Record<string, QuizLifeline[]> = {};
    const playerHistory: Record<string, boolean[]> = {};
    for (const id of playerIds) {
      usedLifelines[id] = [];
      playerHistory[id] = [];
    }

    // Each question carries the exact same fixed amount of cash (₹10,000)
    const fixedPrizeValues = Array(15).fill(10000);

    roomState.quizState = {
      phase: 'question',
      currentQuestion: 0,
      totalQuestions: 15,
      question: questions[0],
      timer: 30, // 30s per question
      lockedAnswers: {},
      doubleSecondAnswers: {},
      hasLocked: {},
      usedLifelines,
      eliminatedOptions: {},
      prizeValues: fixedPrizeValues,
      safeHavens: getSafeHavens(),
      playerHistory,
    };

    roomState.status = 'playing';
  }

  static lockAnswer(
    roomState: RoomState,
    playerId: string,
    answer: string,
    isDouble = false
  ): boolean {
    const qState = roomState.quizState;
    if (!qState || qState.phase !== 'question') return false;

    const opt = answer.toUpperCase().charAt(0);
    if (!['A', 'B', 'C', 'D'].includes(opt)) return false;

    if (!qState.lockedAnswers) qState.lockedAnswers = {};
    if (!qState.doubleSecondAnswers) qState.doubleSecondAnswers = {};

    // Check if option was eliminated for this player (via 50:50)
    const eliminated = qState.eliminatedOptions[playerId] || [];
    if (eliminated.includes(opt as 'A' | 'B' | 'C' | 'D')) return false;

    if (isDouble) {
      // If player already used double dip and locked first answer
      if (qState.lockedAnswers[playerId] && !qState.doubleSecondAnswers[playerId]) {
        qState.doubleSecondAnswers[playerId] = opt;
        return true;
      }
    }

    if (qState.lockedAnswers[playerId]) return false; // Already locked

    qState.lockedAnswers[playerId] = opt;
    qState.hasLocked[playerId] = true;

    // If all connected players have locked, expedite timer to 2s
    const connectedIds = Object.keys(roomState.players).filter(id => roomState.players[id].isConnected);
    const allLocked = connectedIds.every(id => qState.lockedAnswers![id] !== undefined);
    if (allLocked && qState.timer > 2) {
      qState.timer = 2;
    }

    return true;
  }

  static useLifeline(
    roomState: RoomState,
    playerId: string,
    lifeline: QuizLifeline
  ): boolean {
    const qState = roomState.quizState;
    if (!qState || qState.phase !== 'question') return false;

    const userLifelines = qState.usedLifelines[playerId] || [];
    if (userLifelines.includes(lifeline)) return false; // Already used

    const questions = QuizEngine.questionsByRoom[roomState.code];
    const currentQ = questions?.[qState.currentQuestion] || qState.question;
    const correctOpt = currentQ.correct;

    if (lifeline === 'fifty_fifty') {
      // Eliminate 2 wrong options for this player
      const wrongOpts = (['A', 'B', 'C', 'D'] as ('A' | 'B' | 'C' | 'D')[]).filter(o => o !== correctOpt);
      const shuffledWrong = wrongOpts.sort(() => Math.random() - 0.5);
      const toEliminate = shuffledWrong.slice(0, 2);
      qState.eliminatedOptions[playerId] = toEliminate;
      userLifelines.push('fifty_fifty');
      qState.usedLifelines[playerId] = userLifelines;
      return true;
    }

    if (lifeline === 'audience_poll') {
      // Generate simulated poll with high probability on correct answer (60-80%)
      const poll: Record<string, number> = { A: 0, B: 0, C: 0, D: 0 };
      const correctPct = Math.floor(Math.random() * 21) + 60; // 60-80%
      poll[correctOpt] = correctPct;
      let remaining = 100 - correctPct;

      const wrongOpts = ['A', 'B', 'C', 'D'].filter(o => o !== correctOpt);
      const p1 = Math.floor(Math.random() * (remaining - 4)) + 1;
      remaining -= p1;
      const p2 = Math.floor(Math.random() * (remaining - 2)) + 1;
      remaining -= p2;
      const p3 = remaining;

      poll[wrongOpts[0]] = p1;
      poll[wrongOpts[1]] = p2;
      poll[wrongOpts[2]] = p3;

      if (!qState.audiencePolls) qState.audiencePolls = {};
      qState.audiencePolls[playerId] = poll;
      userLifelines.push('audience_poll');
      qState.usedLifelines[playerId] = userLifelines;
      return true;
    }

    if (lifeline === 'skip') {
      if (!qState.lockedAnswers) qState.lockedAnswers = {};
      // Award the current question's value automatically as correct for this player
      userLifelines.push('skip');
      qState.usedLifelines[playerId] = userLifelines;
      qState.lockedAnswers[playerId] = correctOpt;
      qState.hasLocked[playerId] = true;

      // Check all locked
      const connectedIds = Object.keys(roomState.players).filter(id => roomState.players[id].isConnected);
      if (connectedIds.every(id => qState.lockedAnswers![id] !== undefined) && qState.timer > 2) {
        qState.timer = 2;
      }
      return true;
    }

    if (lifeline === 'double_dip') {
      // Allows guessing two options if first is wrong
      userLifelines.push('double_dip');
      qState.usedLifelines[playerId] = userLifelines;
      return true;
    }

    return false;
  }

  static revealRound(roomState: RoomState): void {
    const qState = roomState.quizState;
    if (!qState) return;

    const questions = QuizEngine.questionsByRoom[roomState.code];
    const currentQ = questions?.[qState.currentQuestion] || qState.question;
    const correct = currentQ.correct;

    qState.phase = 'reveal';
    qState.correctReveal = correct;
    qState.timer = 7; // 7 seconds reveal suspense & breakdown

    // Each question carries the exact same prize (₹10,000)
    const questionVal = 10000;
    const summary: Record<string, { answer: string; isCorrect: boolean; points: number }> = {};
    const lockedMap = qState.lockedAnswers || {};
    const doubleMap = qState.doubleSecondAnswers || {};

    if (!qState.playerHistory) qState.playerHistory = {};

    for (const [id, player] of Object.entries(roomState.players)) {
      if (!player.isConnected) continue;

      const locked = lockedMap[id];
      const secondLocked = doubleMap[id];
      const isCorrect = locked === correct || secondLocked === correct;

      if (!qState.playerHistory[id]) qState.playerHistory[id] = [];
      qState.playerHistory[id][qState.currentQuestion] = isCorrect;

      if (isCorrect) {
        player.score += questionVal;
        summary[id] = { answer: locked || '-', isCorrect: true, points: questionVal };
      } else {
        // Strictly 0 points for incorrect answers
        summary[id] = { answer: locked || 'No Answer', isCorrect: false, points: 0 };
      }
    }

    qState.answerSummary = summary;
  }

  static nextQuestion(roomState: RoomState): void {
    const qState = roomState.quizState;
    if (!qState) return;

    const nextIndex = qState.currentQuestion + 1;
    if (nextIndex >= qState.totalQuestions) {
      qState.phase = 'game_over';
      roomState.status = 'game_over';
      qState.timer = 15;
      return;
    }

    const questions = QuizEngine.questionsByRoom[roomState.code];
    const nextQ = questions?.[nextIndex];
    if (!nextQ) {
      qState.phase = 'game_over';
      roomState.status = 'game_over';
      return;
    }

    qState.currentQuestion = nextIndex;
    qState.question = nextQ;
    qState.phase = 'question';
    qState.timer = nextIndex < 5 ? 30 : nextIndex < 10 ? 45 : 60; // More time for harder questions
    qState.lockedAnswers = {};
    qState.doubleSecondAnswers = {};
    qState.hasLocked = {};
    qState.eliminatedOptions = {};
    qState.audiencePolls = {};
    qState.audiencePoll = undefined;
    qState.correctReveal = undefined;
    qState.answerSummary = undefined;
  }

  static tick(roomState: RoomState): { phaseChanged: boolean } {
    const qState = roomState.quizState;
    if (!qState || roomState.status !== 'playing') return { phaseChanged: false };

    qState.timer = Math.max(0, qState.timer - 1);

    if (qState.phase === 'question') {
      if (qState.timer <= 0) {
        QuizEngine.revealRound(roomState);
        return { phaseChanged: true };
      }
      return { phaseChanged: false };
    }

    if (qState.phase === 'reveal') {
      if (qState.timer <= 0) {
        QuizEngine.nextQuestion(roomState);
        return { phaseChanged: true };
      }
      return { phaseChanged: false };
    }

    if (qState.phase === 'game_over') {
      if (qState.timer <= 0) {
        delete QuizEngine.questionsByRoom[roomState.code];
        roomState.status = 'lobby';
        return { phaseChanged: true };
      }
      return { phaseChanged: false };
    }

    return { phaseChanged: false };
  }
}
