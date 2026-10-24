import axios from "axios";
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { serverUrl } from "../App";

function UserOrderCard({ data }) {
  const navigate = useNavigate();
  const [selectedRating, setSelectedRating] = useState({});

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };

  const handleRating = async (itemId, rating) => {
    try {
      await axios.post(
        `${serverUrl}/api/item/rating`,
        { itemId, rating },
        { withCredentials: true }
      );
      setSelectedRating((prev) => ({
        ...prev,
        [itemId]: rating,
      }));
    } catch (error) {
      console.log(error);
    }
  };

  const firstShopOrder = data.shopOrders?.[0];
  const statusColor =
    firstShopOrder?.status === "delivered"
      ? "text-emerald-700 bg-emerald-50 border-emerald-200"
      : firstShopOrder?.status === "out_for_delivery"
      ? "text-blue-700 bg-blue-50 border-blue-200"
      : "text-amber-800 bg-amber-50 border-amber-200";

  return (
    <div className="bg-white rounded-2xl border border-[#e8e6df] shadow-xs p-5 space-y-4">
      <div className="flex items-center justify-between border-b border-gray-100 pb-3">
        <div>
          <p className="font-bold text-sm text-[#18221e]">
            Order #{data._id.slice(-6).toUpperCase()}
          </p>
          <p className="text-xs text-[#83928c] mt-0.5">
            Placed on {formatDate(data.createdAt)}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-bold uppercase tracking-wider text-[#52605b] bg-gray-100 px-2.5 py-1 rounded-md">
            {data.paymentMethod === "cod" ? "COD" : "Online Paid"}
          </span>
          <span className={`text-[10px] font-bold uppercase tracking-wider px-2.5 py-1 rounded-md border ${statusColor}`}>
            {firstShopOrder?.status || "pending"}
          </span>
        </div>
      </div>

      {data.shopOrders.map((shopOrder, index) => (
        <div className="border border-[#e8e6df] rounded-xl p-3.5 bg-[#fbfaf7] space-y-3" key={index}>
          <div className="flex items-center justify-between">
            <p className="font-semibold text-xs text-[#18221e]">{shopOrder.shop?.name}</p>
            <span className="text-xs text-[#52605b] font-medium">Subtotal: ₹{shopOrder.subtotal}</span>
          </div>

          <div className="flex space-x-3 overflow-x-auto pb-1">
            {shopOrder.shopOrderItems.map((item, itIdx) => (
              <div key={itIdx} className="shrink-0 w-36 border border-[#e8e6df] rounded-xl p-2 bg-white flex flex-col justify-between">
                <img src={item.item?.image} alt={item.name} className="w-full h-20 object-cover rounded-lg" />
                <p className="text-xs font-semibold text-[#18221e] mt-1.5 truncate">{item.name}</p>
                <p className="text-[11px] text-[#83928c]">
                  {item.quantity} × ₹{item.price}
                </p>

                {shopOrder.status === "delivered" && (
                  <div className="flex space-x-1 mt-1.5 pt-1 border-t border-gray-100">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        className={`text-sm cursor-pointer ${
                          (selectedRating[item.item?._id] || 0) >= star
                            ? "text-amber-400"
                            : "text-gray-300"
                        }`}
                        onClick={() => handleRating(item.item?._id, star)}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      ))}

      <div className="flex justify-between items-center pt-2">
        <div>
          <p className="text-xs text-[#83928c]">Total Amount</p>
          <p className="text-lg font-extrabold text-[#0e5644]">₹{data.totalAmount}</p>
        </div>
        <button
          className="bg-[#0e5644] hover:bg-[#07392d] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-2xs transition active:scale-95 cursor-pointer"
          onClick={() => navigate(`/track-order/${data._id}`)}
        >
          Track Order
        </button>
      </div>
    </div>
  );
}

export default UserOrderCard;
