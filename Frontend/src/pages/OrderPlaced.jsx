import React from "react";
import { FaCircleCheck } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";

function OrderPlaced() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-[#fbfaf7] flex flex-col justify-center items-center px-4 text-center">
      <div className="w-16 h-16 rounded-full bg-[#edf7f3] border border-[#d1e7dc] flex items-center justify-center text-[#0e5644] text-4xl mb-4 shadow-xs">
        <FaCircleCheck />
      </div>
      <h1 className="text-2xl sm:text-3xl font-extrabold text-[#18221e] mb-2">
        Order Successfully Placed!
      </h1>
      <p className="text-xs sm:text-sm text-[#52605b] max-w-md mb-6 leading-relaxed">
        Thank you for your order. The kitchen has received your ticket and is preparing your meal. Track real-time progress in your orders panel.
      </p>
      <div className="flex items-center gap-3">
        <button
          className="bg-[#0e5644] hover:bg-[#07392d] text-white px-6 py-2.5 rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer"
          onClick={() => navigate("/my-orders")}
        >
          View My Orders
        </button>
        <button
          className="bg-white border border-[#e8e6df] hover:bg-gray-50 text-[#18221e] px-6 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer"
          onClick={() => navigate("/")}
        >
          Back to Home
        </button>
      </div>
    </div>
  );
}

export default OrderPlaced;
