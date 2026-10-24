import User from "../models/user.model.js";

export const BADGES = {
  first_neighbor: {
    key: "first_neighbor",
    title: "First Neighbor",
    description: "Join your first neighbor batch",
    icon: "🤝"
  },
  block_captain: {
    key: "block_captain",
    title: "Block Captain",
    description: "Host 5 community batches",
    icon: "👑"
  },
  penny_saver: {
    key: "penny_saver",
    title: "Penny Saver",
    description: "Save ₹500 or more on delivery fees",
    icon: "💰"
  },
  early_bird: {
    key: "early_bird",
    title: "Early Bird",
    description: "Join a batch within 2 minutes of window opening",
    icon: "⚡"
  },
  street_hero: {
    key: "street_hero",
    title: "Street Hero",
    description: "Host a batch that reaches 4+ members",
    icon: "🦸"
  },
  streak_3: {
    key: "streak_3",
    title: "3-Day Streak",
    description: "Batch order 3 days in a row",
    icon: "🔥"
  }
};

/**
 * Awards points to a user.
 */
export const awardPoints = async (userId, points, reason = "") => {
  if (!points || points <= 0) return null;
  const user = await User.findById(userId);
  if (!user) return null;

  if (!user.gamification) {
    user.gamification = { points: 0, streakDays: 0, batchesHosted: 0, batchesJoined: 0, totalSaved: 0, badges: [] };
  }

  user.gamification.points = (user.gamification.points || 0) + points;
  await user.save();
  return user.gamification.points;
};

/**
 * Grants a badge if not already earned (idempotent).
 * Returns true if newly granted, false if already earned.
 */
export const grantBadge = async (userId, key) => {
  if (!BADGES[key]) return false;
  const user = await User.findById(userId);
  if (!user) return false;

  if (!user.gamification) {
    user.gamification = { points: 0, streakDays: 0, batchesHosted: 0, batchesJoined: 0, totalSaved: 0, badges: [] };
  }

  const alreadyEarned = user.gamification.badges.some(b => b.key === key);
  if (alreadyEarned) return false;

  user.gamification.badges.push({
    key,
    earnedAt: new Date()
  });

  await user.save();
  return true;
};

/**
 * Updates consecutive daily streak for a user upon batch completion.
 */
export const updateStreak = async (userId) => {
  const user = await User.findById(userId);
  if (!user) return 0;

  if (!user.gamification) {
    user.gamification = { points: 0, streakDays: 0, batchesHosted: 0, batchesJoined: 0, totalSaved: 0, badges: [] };
  }

  const now = new Date();
  const lastDate = user.gamification.lastBatchDate;

  if (!lastDate) {
    user.gamification.streakDays = 1;
    user.gamification.lastBatchDate = now;
  } else {
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const startOfLast = new Date(lastDate.getFullYear(), lastDate.getMonth(), lastDate.getDate()).getTime();
    const diffDays = Math.round((startOfToday - startOfLast) / (24 * 60 * 60 * 1000));

    if (diffDays === 1) {
      user.gamification.streakDays = (user.gamification.streakDays || 0) + 1;
      user.gamification.lastBatchDate = now;
    } else if (diffDays === 0) {
      // Same day, streak intact
    } else {
      user.gamification.streakDays = 1;
      user.gamification.lastBatchDate = now;
    }
  }

  if (user.gamification.streakDays >= 3) {
    const hasBadge = user.gamification.badges.some(b => b.key === "streak_3");
    if (!hasBadge) {
      user.gamification.badges.push({ key: "streak_3", earnedAt: new Date() });
    }
  }

  await user.save();
  return user.gamification.streakDays;
};
