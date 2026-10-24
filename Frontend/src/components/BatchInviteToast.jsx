import React from "react";
import { useSelector, useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { removeInvite } from "../redux/batchSlice";
import { useCountdown } from "../hooks/useCountdown";
import { MdOutlineTimer, MdClose, MdDeliveryDining } from "react-icons/md";
import { FaUsers, FaArrowRight } from "react-icons/fa";

function SingleBatchInviteCard({ invite, onDismiss }) {
  const navigate = useNavigate();
  const { formatted, isExpired } = useCountdown(invite.expiresAt);

  if (isExpired) return null;

  const currentDiscountPct = invite.currentDiscountPct || 0;
  const originalFee = 40;
  const currentFee = Math.round(originalFee * (1 - currentDiscountPct / 100));

  const handleJoin = () => {
    navigate(`/batch/${invite.batchId}`);
  };

  return (
    <div className="bg-white/95 backdrop-blur-md border border-[#d1e7dc] rounded-2xl shadow-xl p-4 transition-all duration-300 hover:shadow-2xl hover:border-[#0e5644] animate-in fade-in slide-in-from-bottom-2">
      {/* Header */}
      <div className="flex items-center justify-between gap-3 mb-3">
        <div className="flex items-center gap-3">
          {invite.shopImage ? (
            <img
              src={invite.shopImage}
              alt={invite.shopName}
              className="w-11 h-11 rounded-xl object-cover border border-[#e8e6df] shadow-xs"
            />
          ) : (
            <div className="w-11 h-11 rounded-xl bg-[#edf7f3] flex items-center justify-center text-[#0e5644]">
              <MdDeliveryDining size={22} />
            </div>
          )}
          <div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <p className="text-[10px] font-bold uppercase tracking-wider text-[#0e5644]">
                Neighbor Batch Open
              </p>
            </div>
            <h4 className="font-bold text-[#18221e] text-sm leading-tight line-clamp-1">
              {invite.shopName}
            </h4>
            <p className="text-[11px] text-[#52605b]">
              Host: <span className="font-medium text-[#18221e]">{invite.hostFirstName || "Neighbor"}</span> • ~{invite.approxDistanceM || 150}m away
            </p>
          </div>
        </div>

        <button
          onClick={() => onDismiss(invite.batchId)}
          className="text-gray-400 hover:text-gray-600 p-1 rounded-full hover:bg-gray-100 transition cursor-pointer"
          aria-label="Dismiss invite"
        >
          <MdClose size={18} />
        </button>
      </div>

      {/* Discount & Countdown bar */}
      <div className="bg-[#edf7f3]/80 rounded-xl p-2.5 mb-3 border border-[#d1e7dc] flex items-center justify-between">
        <div>
          <div className="flex items-center gap-1.5 text-xs font-semibold text-[#18221e]">
            <FaUsers className="text-[#0e5644]" size={13} />
            <span>
              {invite.memberCount || 1} neighbor joined
            </span>
          </div>
          <div className="text-xs text-[#52605b] mt-0.5">
            Delivery: <span className="line-through text-gray-400">₹{originalFee}</span>{" "}
            <span className="font-bold text-[#0e5644]">₹{currentFee}</span>
            {currentDiscountPct > 0 && (
              <span className="ml-1.5 px-1.5 py-0.2 bg-white text-[#0e5644] border border-[#d1e7dc] rounded text-[10px] font-bold">
                {currentDiscountPct}% OFF
              </span>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1 bg-white px-2.5 py-1 rounded-lg border border-[#d1e7dc] shadow-2xs">
          <MdOutlineTimer className="text-[#0e5644] animate-pulse" size={15} />
          <span className="text-xs font-bold text-[#18221e] font-mono">
            {formatted}
          </span>
        </div>
      </div>

      {/* Action buttons */}
      <div className="flex items-center gap-2">
        <button
          onClick={() => onDismiss(invite.batchId)}
          className="flex-1 text-xs font-medium text-gray-500 hover:text-gray-700 py-2 rounded-xl hover:bg-gray-100 transition text-center cursor-pointer"
        >
          Not now
        </button>
        <button
          onClick={handleJoin}
          className="flex-[2] bg-[#0e5644] hover:bg-[#07392d] text-white text-xs font-semibold py-2 px-3 rounded-xl shadow-xs flex items-center justify-center gap-1.5 active:scale-98 transition-all cursor-pointer"
        >
          <span>Join & Pool</span>
          <FaArrowRight size={11} />
        </button>
      </div>
    </div>
  );
}

export default function BatchInviteToast() {
  const dispatch = useDispatch();
  const invites = useSelector((state) => state.batch.invites || []);

  if (!invites || invites.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-[9999] flex flex-col gap-3 w-[92vw] max-w-sm pointer-events-auto">
      {invites.slice(0, 3).map((invite) => (
        <SingleBatchInviteCard
          key={invite.batchId}
          invite={invite}
          onDismiss={(id) => dispatch(removeInvite(id))}
        />
      ))}
    </div>
  );
}
