import User from "../models/user.model.js";
import { BADGES } from "../utils/gamification.js";

export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(400).json({ message: "userId is not found" });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ message: "user is not found" });
    }
    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: `get current user error ${error}` });
  }
};

export const updateUserLocation = async (req, res) => {
  try {
    const { lat, lon, locationMode } = req.body;
    const latitude = Number(lat);
    const longitude = Number(lon);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return res
        .status(400)
        .json({ message: "valid latitude and longitude are required" });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(400).json({ message: "user is not found" });
    }

    if (user.role === "deliveryBoy") {
      return res
        .status(403)
        .json({ message: "delivery boy location cannot be updated here" });
    }

    user.location = {
      type: "Point",
      coordinates: [longitude, latitude],
    };
    user.locationMode = locationMode || user.locationMode || "auto";
    await user.save();

    return res.status(200).json({ message: "location updated", user });
  } catch (error) {
    return res
      .status(500)
      .json({ message: `update location user error ${error}` });
  }
};

/**
 * GET /api/user/rewards
 * Returns points, streakDays, totalSaved, badges, nextBadgeProgress, and neighborhood leaderboard
 */
export const getUserRewards = async (req, res) => {
  try {
    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const gamification = user.gamification || {
      points: 0,
      streakDays: 0,
      batchesHosted: 0,
      batchesJoined: 0,
      totalSaved: 0,
      badges: []
    };

    const userBadgesMap = new Map((gamification.badges || []).map(b => [b.key, b.earnedAt]));

    const badges = Object.values(BADGES).map(badge => ({
      key: badge.key,
      title: badge.title,
      description: badge.description,
      icon: badge.icon,
      earned: userBadgesMap.has(badge.key),
      earnedAt: userBadgesMap.get(badge.key) || null
    }));

    // Calculate next badge progress
    let nextBadgeProgress = null;
    if (!userBadgesMap.has("first_neighbor")) {
      nextBadgeProgress = {
        key: "first_neighbor",
        title: "First Neighbor",
        current: gamification.batchesJoined || 0,
        target: 1,
        pct: (gamification.batchesJoined || 0) >= 1 ? 100 : 0
      };
    } else if (!userBadgesMap.has("block_captain")) {
      nextBadgeProgress = {
        key: "block_captain",
        title: "Block Captain",
        current: gamification.batchesHosted || 0,
        target: 5,
        pct: Math.min(100, Math.round(((gamification.batchesHosted || 0) / 5) * 100))
      };
    } else if (!userBadgesMap.has("penny_saver")) {
      nextBadgeProgress = {
        key: "penny_saver",
        title: "Penny Saver",
        current: gamification.totalSaved || 0,
        target: 500,
        pct: Math.min(100, Math.round(((gamification.totalSaved || 0) / 500) * 100))
      };
    } else if (!userBadgesMap.has("streak_3")) {
      nextBadgeProgress = {
        key: "streak_3",
        title: "3-Day Streak",
        current: gamification.streakDays || 0,
        target: 3,
        pct: Math.min(100, Math.round(((gamification.streakDays || 0) / 3) * 100))
      };
    } else if (!userBadgesMap.has("street_hero")) {
      nextBadgeProgress = {
        key: "street_hero",
        title: "Street Hero",
        current: 0,
        target: 1,
        pct: 0
      };
    }

    // Leaderboard: Top 10 users within 2 km of caller (or global top 10 as fallback)
    let leaderboardUsers = [];
    const coordinates = user.location?.coordinates;
    const hasCoordinates = Array.isArray(coordinates) && coordinates.length === 2 && (coordinates[0] !== 0 || coordinates[1] !== 0);

    if (hasCoordinates) {
      try {
        leaderboardUsers = await User.find({
          role: "user",
          location: {
            $near: {
              $geometry: {
                type: "Point",
                coordinates: coordinates
              },
              $maxDistance: 2000 // 2 km
            }
          }
        })
          .select("fullName gamification _id")
          .limit(20);
      } catch (e) {
        console.error("Geo leaderboard error, falling back:", e.message);
      }
    }

    if (leaderboardUsers.length === 0) {
      leaderboardUsers = await User.find({ role: "user" })
        .select("fullName gamification _id")
        .sort({ "gamification.points": -1 })
        .limit(10);
    }

    // Sort by points descending and take top 10
    const leaderboard = leaderboardUsers
      .map(u => {
        const firstName = u.fullName ? u.fullName.trim().split(" ")[0] : "Neighbor";
        return {
          userId: u._id,
          firstName,
          points: u.gamification?.points || 0,
          streakDays: u.gamification?.streakDays || 0,
          totalSaved: u.gamification?.totalSaved || 0,
          isSelf: String(u._id) === String(req.userId)
        };
      })
      .sort((a, b) => b.points - a.points)
      .slice(0, 10);

    return res.status(200).json({
      points: gamification.points || 0,
      streakDays: gamification.streakDays || 0,
      totalSaved: gamification.totalSaved || 0,
      batchesHosted: gamification.batchesHosted || 0,
      batchesJoined: gamification.batchesJoined || 0,
      badges,
      nextBadgeProgress,
      leaderboard
    });
  } catch (error) {
    return res.status(500).json({ message: `get rewards error: ${error.message || error}` });
  }
};
