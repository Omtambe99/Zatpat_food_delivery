import axios from "axios";
import React, { useState } from "react";
import { MdPhone, MdOutlineTimer } from "react-icons/md";
import { FaUsers, FaExclamationCircle } from "react-icons/fa";
import { serverUrl } from "../App";
import { useDispatch } from "react-redux";
import { updateOrderStatus } from "../redux/userSlice";
import { useCountdown } from "../hooks/useCountdown";

function OwnerOrderCard({ data }) {
  const [availableBoys, setAvailableBoys] = useState([]);
  const [statusError, setStatusError] = useState("");
  const dispatch = useDispatch();

  const batch = data.batch;
  const isBatchOrder = !!batch;
  const isBatchOpen = isBatchOrder && batch.status === "open";
  const batchCountdown = useCountdown(batch?.expiresAt);

  const activeMembersCount = batch?.members
    ? batch.members.filter((m) => m.status === "active").length
    : batch?.memberCount || 1;

  const handleUpdateStatus = async (orderId, shopId, status) => {
    if (!status) return;
    setStatusError("");
    try {
      const result = await axios.post(
        `${serverUrl}/api/order/update-status/${orderId}/${shopId}`,
        { status },
        { withCredentials: true }
      );
      dispatch(updateOrderStatus({ orderId, shopId, status }));
      setAvailableBoys(result.data.availableBoys || []);
    } catch (error) {
      console.error("Update status error:", error);
      const serverMsg = error.response?.data?.message || "Failed to update order status.";
      setStatusError(serverMsg);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-xs border border-[#e8e6df] p-5 space-y-4">
      {/* Batch Header Badge if this order is part of a batch */}
      {isBatchOrder && (
        <div
          className={`p-3 rounded-xl border flex flex-col sm:flex-row sm:items-center justify-between gap-2 ${
            isBatchOpen
              ? "bg-[#edf7f3] border-[#d1e7dc]"
              : "bg-emerald-50 border-emerald-200"
          }`}
        >
          <div className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full ${
                isBatchOpen ? "bg-[#0e5644] animate-pulse" : "bg-emerald-600"
              }`}
            />
            <span className="text-xs font-bold uppercase tracking-wider text-[#18221e] flex items-center gap-1.5">
              <FaUsers className="text-[#0e5644]" size={13} />
              <span>
                Neighbor Batch ({activeMembersCount}{" "}
                {activeMembersCount === 1 ? "Order" : "Orders"})
              </span>
            </span>
            <span className="text-[10px] bg-white text-[#0e5644] font-bold px-2 py-0.5 rounded-full border border-[#d1e7dc]">
              {batch.discountPct || 0}% Discount
            </span>
          </div>

          {isBatchOpen && (
            <div className="flex items-center gap-1.5 text-xs font-mono font-bold text-[#18221e] bg-white px-2.5 py-1 rounded-lg border border-[#d1e7dc]">
              <MdOutlineTimer className="text-[#0e5644] animate-pulse" size={14} />
              <span>Window: {batchCountdown.formatted}</span>
            </div>
          )}
        </div>
      )}

      {/* Customer Info */}
      <div className="flex flex-col sm:flex-row justify-between items-start gap-2">
        <div>
          <h3 className="text-base font-bold text-[#18221e]">{data.user?.fullName}</h3>
          <p className="text-xs text-[#83928c]">{data.user?.email}</p>
          <p className="flex items-center gap-1.5 text-xs text-[#52605b] mt-1 font-medium">
            <MdPhone className="text-[#0e5644]" />
            <span>{data.user?.mobile}</span>
          </p>
        </div>

        <div className="text-right">
          <span
            className={`inline-block px-2.5 py-1 rounded-lg text-xs font-bold uppercase ${
              data.paymentMethod === "online"
                ? data.payment
                  ? "bg-emerald-100 text-emerald-800"
                  : "bg-amber-100 text-amber-800"
                : "bg-blue-100 text-blue-800"
            }`}
          >
            {data.paymentMethod === "online"
              ? data.payment
                ? "Online (Paid)"
                : "Online (Pending)"
              : "Cash On Delivery"}
          </span>
        </div>
      </div>

      {/* Address */}
      <div className="text-[#52605b] text-xs bg-[#fbfaf7] p-2.5 rounded-xl border border-[#e8e6df]">
        <p className="font-medium text-[#18221e]">{data?.deliveryAddress?.text}</p>
      </div>

      {/* Ordered Items */}
      <div className="flex space-x-3 overflow-x-auto pb-1">
        {data.shopOrders?.shopOrderItems?.map((item, index) => (
          <div
            key={index}
            className="shrink-0 w-36 border border-[#e8e6df] rounded-xl p-2 bg-white shadow-2xs"
          >
            <img
              src={item.item?.image}
              alt={item.name}
              className="w-full h-20 object-cover rounded-lg"
            />
            <p className="text-xs font-bold text-[#18221e] mt-1.5 truncate">{item.name}</p>
            <p className="text-[11px] text-[#83928c]">
              Qty: {item.quantity} × ₹{item.price}
            </p>
          </div>
        ))}
      </div>

      {/* Status Error Banner (e.g. Batch window still open) */}
      {statusError && (
        <div className="flex items-center gap-2 p-3 bg-amber-50 text-amber-900 rounded-xl border border-amber-300 text-xs">
          <FaExclamationCircle className="text-amber-600 shrink-0" size={16} />
          <span>
            {statusError === "Batch window still open"
              ? "Cannot dispatch out for delivery while the 10-minute Neighbor Batch window is still pooling. You may set status to 'Preparing', or wait until the window closes."
              : statusError}
          </span>
        </div>
      )}

      {/* Status control */}
      <div className="flex justify-between items-center pt-3 border-t border-gray-100">
        <span className="text-xs text-[#52605b]">
          Status:{" "}
          <span className="font-bold capitalize text-[#0e5644]">
            {data.shopOrders?.status}
          </span>
        </span>

        <select
          className="rounded-xl border border-[#e8e6df] px-3 py-1.5 text-xs font-semibold focus:outline-none focus:border-[#0e5644] focus:ring-2 focus:ring-[#0e5644]/15 text-[#18221e] bg-white cursor-pointer"
          value=""
          onChange={(e) =>
            handleUpdateStatus(data._id, data.shopOrders.shop._id, e.target.value)
          }
        >
          <option value="">Update Status...</option>
          <option value="pending">Pending</option>
          <option value="preparing">Preparing</option>
          <option value="out of delivery">Out Of Delivery</option>
        </select>
      </div>

      {data.shopOrders?.status === "out of delivery" && (
        <div className="mt-2 p-3 border rounded-xl text-xs bg-[#edf7f3]/50 border-[#d1e7dc] space-y-1">
          <p className="font-bold text-[#18221e]">
            {data.shopOrders.assignedDeliveryBoy
              ? "Assigned Delivery Partner:"
              : "Available Delivery Partners:"}
          </p>
          {availableBoys?.length > 0 ? (
            availableBoys.map((b, index) => (
              <div key={index} className="text-[#52605b] font-medium">
                {b.fullName} - {b.mobile}
              </div>
            ))
          ) : data.shopOrders.assignedDeliveryBoy ? (
            <div className="text-[#52605b] font-medium">
              {data.shopOrders.assignedDeliveryBoy.fullName} -{" "}
              {data.shopOrders.assignedDeliveryBoy.mobile}
            </div>
          ) : (
            <div className="text-gray-400">Waiting for delivery partner to accept</div>
          )}
        </div>
      )}

      <div className="text-right font-bold text-[#18221e] text-sm">
        Total: ₹{data.shopOrders?.subtotal}
      </div>
    </div>
  );
}

export default OwnerOrderCard;
