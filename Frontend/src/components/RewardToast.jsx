import React, { useEffect, useState } from "react";
import { useSelector } from "react-redux";
import { FaFire, FaTimes, FaTrophy } from "react-icons/fa";

export default function RewardToast() {
  const { socket } = useSelector((state) => state.user);
  const [rewardData, setRewardData] = useState(null);

  useEffect(() => {
    if (!socket) return;

    const handleRewardEarned = (data) => {
      setRewardData(data);
    };

    socket.on("rewardEarned", handleRewardEarned);
    return () => {
      socket.off("rewardEarned", handleRewardEarned);
    };
  }, [socket]);

  useEffect(() => {
    if (!rewardData) return;
    const timer = setTimeout(() => {
      setRewardData(null), 6000;
    });
    return () => clearTimeout(timer);
  }, [rewardData]);

  if (!rewardData) return null;

  return (
    <div className="fixed top-5 right-5 z-[99999] pointer-events-auto max-w-sm w-[92vw] sm:w-auto animate-in fade-in slide-in-from-top-3 duration-300">
      <div className="relative bg-white/95 backdrop-blur-md text-[#18221e] p-4 rounded-2xl shadow-xl border border-[#d1e7dc] flex items-center gap-3.5">
        <div className="w-11 h-11 rounded-xl bg-[#edf7f3] text-[#0e5644] border border-[#d1e7dc] flex items-center justify-center text-xl shrink-0">
          <FaTrophy size={20} />
        </div>

        <div className="flex-1 pr-1">
          <div className="flex items-center gap-1.5">
            <span className="bg-[#edf7f3] text-[#0e5644] border border-[#d1e7dc] font-bold text-[10px] px-2 py-0.5 rounded-full uppercase tracking-wider">
              +{rewardData.pointsEarned || 20} Points
            </span>
            {rewardData.streakDays > 1 && (
              <span className="flex items-center gap-1 text-[10px] font-bold bg-rose-50 text-rose-600 border border-rose-200/60 px-1.5 py-0.5 rounded-full">
                <FaFire size={10} />
                <span>{rewardData.streakDays}d Streak</span>
              </span>
            )}
          </div>
          <p className="font-bold text-xs text-[#18221e] mt-1 leading-tight">
            {rewardData.reason || "Reward Unlocked!"}
          </p>
          <p className="text-[11px] text-[#52605b] font-medium mt-0.5">
            Current balance: {rewardData.points || 0} pts
          </p>
        </div>

        <button
          onClick={() => setRewardData(null)}
          className="text-gray-400 hover:text-gray-600 p-1.5 rounded-full hover:bg-gray-100 transition shrink-0 cursor-pointer"
          aria-label="Close"
        >
          <FaTimes size={14} />
        </button>
      </div>
    </div>
  );
}
