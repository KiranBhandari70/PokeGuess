export async function persistGameResult(game, { User, Result }) {
  if (!game.userId) return { saved: false, reason: 'guest' };
  if (await Result.exists({ gameId: game.id })) {
    game.resultSaved = true;
    return { saved: true, alreadySaved: true };
  }

  const user = await User.findById(game.userId);
  if (!user) throw new Error('Player account no longer exists');

  try {
    await Result.create({
      gameId: game.id,
      user: user.id,
      username: user.username,
      score: game.score,
      correct: game.correct,
      rounds: game.rounds,
      difficulty: game.difficulty,
      streak: game.bestStreak,
    });
  } catch (error) {
    if (error.code === 11000) {
      game.resultSaved = true;
      return { saved: true, alreadySaved: true };
    }
    throw error;
  }

  user.experience += game.score;
  await user.save();
  game.resultSaved = true;
  return { saved: true, alreadySaved: false };
}
