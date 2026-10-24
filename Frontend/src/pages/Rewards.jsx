import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { serverUrl } from "../App";
import { IoIosArrowRoundBack } from "react-icons/io";
import { FaFire, FaCoins, FaPiggyBank, FaUsers, FaTrophy, FaLock, FaCheckCircle, FaAward } from "react-icons/fa";

export default function Rewards() {
  const navigate = useNavigate();
  const [rewards, setRewards] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  const fetchRewards = async () => {
    try {
      const res = await axios.get(`${serverUrl}/api/user/rewards`, {
        withCredentials: true,
      });
      setRewards(res.data);
    } catch (err) {
      console.error("Error fetching rewards:", err);
      setErrorMsg(err.response?.data?.message || "Failed to load rewards.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRewards();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fbfaf7] flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-3 border-[#0e5644] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[#52605b] font-medium text-sm">Loading Community Rewards...</p>
      </div>
    );
  }

  if (errorMsg || !rewards) {
    return (
      <div className="min-h-screen bg-[#fbfaf7] flex flex-col items-center justify-center p-6 text-center">
        <p className="text-sm text-[#52605b] mb-4">{errorMsg || "Unable to load rewards data."}</p>
        <button
          onClick={() => navigate("/")}
          className="bg-[#0e5644] text-white px-5 py-2.5 rounded-xl font-bold text-xs"
        >
          Return Home
        </button>
      </div>
    );
  }

  const {
    points,
    streakDays,
    totalSaved,
    batchesHosted,
    batchesJoined,
    badges,
    nextBadgeProgress,
    leaderboard,
  } = rewards;

  return (
    <div className="min-h-screen bg-[#fbfaf7] pb-24">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#e8e6df] px-4 sm:px-8 py-3 flex items-center justify-between shadow-2xs">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-[#52605b] hover:text-[#18221e] transition font-medium text-xs cursor-pointer"
        >
          <IoIosArrowRoundBack size={26} />
          <span>Home</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="text-xs uppercase tracking-wider font-bold text-[#0e5644] bg-[#edf7f3] border border-[#d1e7dc] px-3 py-1 rounded-full">
            Neighbor Rewards Club
          </span>
        </div>
      </header>

      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-[#0e5644] via-[#0b4737] to-[#07392d] text-white py-10 px-6 sm:px-10 shadow-sm">
        <div className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="space-y-2 text-center sm:text-left">
            <div className="inline-flex items-center gap-2 bg-white/15 px-3 py-1 rounded-full text-xs font-bold tracking-wide">
              <span>🏆 Community Milestones</span>
            </div>
            <h1 className="text-2xl sm:text-4xl font-extrabold tracking-tight">
              Community Rewards & Impact
            </h1>
            <p className="text-gray-200 text-xs sm:text-sm max-w-md">
              Pool orders with neighbors within 300m, eliminate redundant courier trips, save delivery fees, and collect neighborhood achievements.
            </p>
          </div>

          <div className="bg-white/10 backdrop-blur-md border border-white/20 p-5 rounded-2xl text-center shadow-md min-w-[170px]">
            <p className="text-[11px] uppercase tracking-wider font-semibold text-gray-200">Total Points</p>
            <p className="text-3xl sm:text-4xl font-extrabold font-mono mt-1 text-amber-300">{points}</p>
            <p className="text-[10px] text-gray-300 mt-0.5">Zatpat Credits</p>
          </div>
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 sm:px-6 py-8 space-y-7">
        {/* Key Stats Cards */}
        <section className="grid grid-cols-2 sm:grid-cols-4 gap-3.5">
          {/* Card 1: Points */}
          <div className="bg-white p-4 rounded-2xl border border-[#e8e6df] shadow-xs flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 border border-amber-200/60 flex items-center justify-center mb-2">
              <FaCoins size={18} />
            </div>
            <p className="text-2xl font-extrabold text-[#18221e]">{points}</p>
            <p className="text-xs text-[#52605b] font-medium">Points Balance</p>
          </div>

          {/* Card 2: Streak */}
          <div className="bg-white p-4 rounded-2xl border border-[#e8e6df] shadow-xs flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-xl bg-rose-50 text-rose-600 border border-rose-200/60 flex items-center justify-center mb-2">
              <FaFire size={18} className="animate-pulse" />
            </div>
            <p className="text-2xl font-extrabold text-[#18221e]">{streakDays} Days</p>
            <p className="text-xs text-[#52605b] font-medium">Order Streak</p>
          </div>

          {/* Card 3: Total Saved */}
          <div className="bg-white p-4 rounded-2xl border border-[#e8e6df] shadow-xs flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-xl bg-[#edf7f3] text-[#0e5644] border border-[#d1e7dc] flex items-center justify-center mb-2">
              <FaPiggyBank size={18} />
            </div>
            <p className="text-2xl font-extrabold text-[#0e5644]">₹{totalSaved}</p>
            <p className="text-xs text-[#52605b] font-medium">Delivery Saved</p>
          </div>

          {/* Card 4: Batches Participated */}
          <div className="bg-white p-4 rounded-2xl border border-[#e8e6df] shadow-xs flex flex-col items-center text-center">
            <div className="w-10 h-10 rounded-xl bg-gray-100 text-[#18221e] border border-gray-200 flex items-center justify-center mb-2">
              <FaUsers size={18} />
            </div>
            <p className="text-2xl font-extrabold text-[#18221e]">{batchesHosted + batchesJoined}</p>
            <p className="text-xs text-[#52605b] font-medium">{batchesHosted} host • {batchesJoined} join</p>
          </div>
        </section>

        {/* Next Badge Milestone Progress */}
        {nextBadgeProgress && (
          <section className="bg-white rounded-2xl border border-[#d1e7dc] p-5 shadow-xs">
            <div className="flex items-center justify-between gap-4 mb-2.5">
              <div className="flex items-center gap-2">
                <FaAward className="text-[#0e5644]" size={18} />
                <h3 className="font-bold text-[#18221e] text-xs sm:text-sm">
                  Next Milestone: <span className="text-[#0e5644]">{nextBadgeProgress.title}</span>
                </h3>
              </div>
              <span className="text-xs font-bold text-[#18221e] font-mono">
                {nextBadgeProgress.current} / {nextBadgeProgress.target} ({nextBadgeProgress.pct}%)
              </span>
            </div>
            <div className="w-full h-2.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-[#0e5644] rounded-full transition-all duration-500"
                style={{ width: `${Math.min(100, Math.max(5, nextBadgeProgress.pct))}%` }}
              />
            </div>
          </section>
        )}

        {/* Badges Showcase Grid */}
        <section className="bg-white rounded-2xl border border-[#e8e6df] p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-5">
            <div>
              <h2 className="text-lg font-bold text-[#18221e] flex items-center gap-2">
                <FaTrophy className="text-amber-500" size={17} />
                <span>Neighbor Badges</span>
              </h2>
              <p className="text-xs text-[#52605b]">
                Earn badges through community ordering and eco-friendly batching
              </p>
            </div>
            <span className="text-xs font-bold text-[#0e5644] bg-[#edf7f3] border border-[#d1e7dc] px-3 py-1 rounded-full">
              {badges.filter((b) => b.earned).length} of {badges.length} Unlocked
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3.5">
            {badges.map((badge) => (
              <div
                key={badge.key}
                className={`p-4 rounded-xl border transition-all duration-200 relative ${
                  badge.earned
                    ? "border-[#d1e7dc] bg-[#edf7f3]/50 shadow-2xs"
                    : "border-[#e8e6df] bg-gray-50/50 opacity-55"
                }`}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`w-11 h-11 rounded-xl flex items-center justify-center text-xl shrink-0 ${
                      badge.earned
                        ? "bg-white shadow-xs border border-[#d1e7dc]"
                        : "bg-gray-100 text-gray-400 grayscale"
                    }`}
                  >
                    {badge.icon}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className="font-bold text-[#18221e] text-xs truncate">{badge.title}</h4>
                      {badge.earned ? (
                        <FaCheckCircle className="text-[#0e5644] shrink-0" size={13} />
                      ) : (
                        <FaLock className="text-gray-400 shrink-0" size={11} />
                      )}
                    </div>
                    <p className="text-[11px] text-[#52605b] mt-1 leading-snug">{badge.description}</p>
                    <p className="text-[10px] mt-1.5 font-semibold">
                      {badge.earned ? (
                        <span className="text-[#0e5644]">
                          ✓ Unlocked {badge.earnedAt ? new Date(badge.earnedAt).toLocaleDateString() : ""}
                        </span>
                      ) : (
                        <span className="text-gray-400">Locked</span>
                      )}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Neighborhood Leaderboard */}
        <section className="bg-white rounded-2xl border border-[#e8e6df] p-5 sm:p-6 shadow-xs">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="text-lg font-bold text-[#18221e]">
                📍 Neighborhood Leaderboard
              </h2>
              <p className="text-xs text-[#52605b]">
                Top neighbors in your vicinity this month (privacy-protected)
              </p>
            </div>
          </div>

          <div className="overflow-hidden border border-[#e8e6df] rounded-xl">
            <table className="w-full text-left text-xs">
              <thead className="bg-gray-50 text-gray-500 font-semibold uppercase tracking-wider border-b border-[#e8e6df]">
                <tr>
                  <th className="py-2.5 px-3.5 w-14 text-center">Rank</th>
                  <th className="py-2.5 px-3.5">Neighbor</th>
                  <th className="py-2.5 px-3.5 text-center">Streak</th>
                  <th className="py-2.5 px-3.5 text-right">Points</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e8e6df]">
                {leaderboard.length > 0 ? (
                  leaderboard.map((user, idx) => {
                    const rank = idx + 1;
                    return (
                      <tr key={user._id || idx} className="hover:bg-gray-50/60 transition">
                        <td className="py-2.5 px-3.5 text-center font-bold text-[#18221e]">
                          {rank === 1 ? "🥇" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : `#${rank}`}
                        </td>
                        <td className="py-2.5 px-3.5 font-medium text-[#18221e]">
                          {user.firstName || user.fullName?.split(" ")[0] || "Neighbor"}
                        </td>
                        <td className="py-2.5 px-3.5 text-center font-mono text-[#52605b]">
                          {user.streakDays ? `${user.streakDays}d` : "-"}
                        </td>
                        <td className="py-2.5 px-3.5 text-right font-mono font-bold text-[#0e5644]">
                          {user.points || 0}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="4" className="py-6 text-center text-xs text-gray-400">
                      No leaderboard entries yet. Be the first neighbor to pool an order!
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </main>
    </div>
  );
}
