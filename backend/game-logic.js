export const GAME_ROUNDS = 10;

export function scoreAnswer(game, selectedId) {
  if (game.completed) return { error: 'This game is already complete', status: 409 };
  if (game.answers.has(game.round)) return { error: 'This round was already answered', status: 409 };
  const correct = String(selectedId) === String(game.answerId);
  game.answers.add(game.round);
  if (correct) {
    game.correct += 1;
    game.streak += 1;
    game.bestStreak = Math.max(game.bestStreak, game.streak);
    game.score += (game.difficulty === 'hard' ? 150 : game.difficulty === 'easy' ? 50 : 100) + Math.min(game.streak - 1, 4) * 25;
  } else game.streak = 0;
  game.round += 1;
  game.completed = game.round >= GAME_ROUNDS;
  return { correct, score: game.score, streak: game.streak, completed: game.completed, round: game.round, rounds: GAME_ROUNDS };
}
