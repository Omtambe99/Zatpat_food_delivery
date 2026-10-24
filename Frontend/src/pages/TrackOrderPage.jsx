import axios from "axios";
import React, { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { serverUrl } from "../App";
import { IoIosArrowRoundBack } from "react-icons/io";
import DeliveryBoyTracking from "../components/DeliveryBoyTracking";
import { useSelector } from "react-redux";
import { useCountdown } from "../hooks/useCountdown";
import { FaUsers, FaCheckCircle } from "react-icons/fa";
import { MdOutlineTimer, MdDeliveryDining } from "react-icons/md";

function BatchStatusCard({ batchId, isHostProp, onBatchUpdated }) {
  const [batch, setBatch] = useState(null);
  const [closing, setClosing] = useState(false);
  const { socket } = useSelector((state) => state.user);

  const fetchBatch = async () => {
    if (!batchId) return;
    try {
      const res = await axios.get(`${serverUrl}/api/batch/${batchId}`, {
        withCredentials: true,
      });
      setBatch(res.data);
    } catch (err) {
      console.log("Error fetching batch details in TrackOrder:", err.message);
    }
  };

  useEffect(() => {
    fetchBatch();
  }, [batchId]);

  useEffect(() => {
    if (!socket || !batchId) return;

    const handleBatchUpdate = (data) => {
      if (data.batchId === batchId) {
        setBatch((prev) =>
          prev
            ? { ...prev, memberCount: data.memberCount, discountPct: data.discountPct }
            : null
        );
        if (onBatchUpdated) onBatchUpdated();
      }
    };

    const handleBatchClosed = (data) => {
      if (data.batchId === batchId) {
        setBatch((prev) =>
          prev
            ? {
                ...prev,
                status: "closed",
                discountPct: data.finalDiscountPct,
                memberCount: data.memberCount,
              }
            : null
        );
        if (onBatchUpdated) onBatchUpdated();
      }
    };

    socket.on("batchUpdate", handleBatchUpdate);
    socket.on("batchClosed", handleBatchClosed);

    return () => {
      socket.off("batchUpdate", handleBatchUpdate);
      socket.off("batchClosed", handleBatchClosed);
    };
  }, [socket, batchId]);

  const countdown = useCountdown(batch?.expiresAt);

  const handleCloseEarly = async () => {
    setClosing(true);
    try {
      await axios.post(
        `${serverUrl}/api/batch/${batchId}/close`,
        {},
        { withCredentials: true }
      );
      await fetchBatch();
      if (onBatchUpdated) onBatchUpdated();
    } catch (err) {
      console.error("Error closing batch early:", err.message);
    } finally {
      setClosing(false);
    }
  };

  if (!batch) return null;

  const isClosed = batch.status !== "open" || countdown.isExpired;
  const discountPct = batch.discountPct || 0;
  const savedAmount = Math.round(40 * (discountPct / 100));
  const isHost = isHostProp || batch.isHost;

  return (
    <div
      className={`rounded-2xl p-5 border shadow-xs transition-all ${
        isClosed
          ? "bg-[#edf7f3] border-[#d1e7dc]"
          : "bg-white border-[#d1e7dc]"
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span
              className={`w-2 h-2 rounded-full ${
                isClosed ? "bg-emerald-600" : "bg-[#0e5644] animate-pulse"
              }`}
            />
            <h3 className="font-bold text-[#18221e] text-base flex items-center gap-2">
              <MdDeliveryDining className="text-[#0e5644]" size={20} />
              <span>Neighbor Batch Status</span>
            </h3>
          </div>
          <p className="text-xs text-[#52605b]">
            {isClosed
              ? `🎉 Pool finalized! You saved ₹${savedAmount} with ${batch.memberCount || 1} neighbors.`
              : "10-minute pooling window is active. Neighbors within 300m can join to lower everyone's delivery fee!"}
          </p>
        </div>

        {/* Live Timer or Closed Badge */}
        {!isClosed ? (
          <div className="flex items-center gap-2 self-start sm:self-auto bg-gray-50 px-3.5 py-1.5 rounded-xl border border-[#e8e6df]">
            <MdOutlineTimer className="text-[#0e5644] animate-pulse" size={16} />
            <span className="font-mono font-bold text-[#18221e] text-xs">
              {countdown.formatted} left
            </span>
          </div>
        ) : (
          <div className="flex items-center gap-1.5 bg-emerald-100 text-emerald-800 px-3 py-1 rounded-xl text-xs font-bold self-start sm:self-auto">
            <FaCheckCircle size={12} />
            <span>Pool Finalized</span>
          </div>
        )}
      </div>

      {/* Stats bar */}
      <div className="mt-4 pt-3 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 text-[#52605b] font-semibold">
            <FaUsers className="text-[#0e5644]" size={14} />
            <span>
              {batch.memberCount || 1} / {batch.maxMembers || 5} Neighbors Joined
            </span>
          </span>
          <span className="text-[#0e5644] font-bold bg-[#edf7f3] px-2.5 py-0.5 rounded-lg border border-[#d1e7dc]">
            {discountPct}% Discount
          </span>
        </div>

        {/* Close Early button for Host */}
        {!isClosed && isHost && (
          <button
            onClick={handleCloseEarly}
            disabled={closing}
            className="bg-[#0e5644] hover:bg-[#07392d] text-white px-3.5 py-1.5 rounded-xl font-semibold text-xs shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
          >
            {closing ? "Closing..." : "Close Early & Dispatch to Kitchen"}
          </button>
        )}
      </div>
    </div>
  );
}

function TrackOrderPage() {
  const { orderId } = useParams();
  const [currentOrder, setCurrentOrder] = useState();
  const navigate = useNavigate();
  const { socket, userData } = useSelector((state) => state.user);
  const [liveLocations, setLiveLocations] = useState({});

  const handleGetOrder = async () => {
    try {
      const result = await axios.get(
        `${serverUrl}/api/order/get-order-by-id/${orderId}`,
        { withCredentials: true }
      );
      setCurrentOrder(result.data);
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (!socket || !orderId) return;

    socket.emit("joinOrderRoom", orderId);

    const handleDeliveryLocation = ({ deliveryBoyId, latitude, longitude }) => {
      setLiveLocations((prev) => ({
        ...prev,
        [deliveryBoyId]: { lat: latitude, lon: longitude },
      }));
    };

    const handleStatusUpdate = (data) => {
      if (data.orderId === orderId) {
        handleGetOrder();
      }
    };

    socket.on("updateDeliveryLocation", handleDeliveryLocation);
    socket.on("update-status", handleStatusUpdate);

    return () => {
      socket.off("updateDeliveryLocation", handleDeliveryLocation);
      socket.off("update-status", handleStatusUpdate);
    };
  }, [socket, orderId]);

  useEffect(() => {
    handleGetOrder();
  }, [orderId]);

  const batchId = currentOrder?.batch?._id || currentOrder?.batch;

  return (
    <div className="min-h-screen bg-[#fbfaf7] py-6 px-4">
      <div className="max-w-4xl mx-auto flex flex-col gap-6 pb-20">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate("/")}
            className="p-1.5 rounded-full hover:bg-gray-200/60 text-[#18221e] transition cursor-pointer"
            aria-label="Back"
          >
            <IoIosArrowRoundBack size={28} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#18221e]">Live Order Tracking</h1>
            <p className="text-xs text-[#52605b]">Real-time status and delivery updates</p>
          </div>
        </div>

        {/* Neighbor Batch Card if order belongs to a batch */}
        {batchId && (
          <BatchStatusCard
            batchId={batchId}
            isHostProp={
              currentOrder?.openToNeighbors ||
              currentOrder?.user?._id === userData?._id
            }
            currentOrder={currentOrder}
            onBatchUpdated={handleGetOrder}
          />
        )}

        {currentOrder?.shopOrders?.map((shopOrder, index) => (
          <div
            className="bg-white p-5 sm:p-6 rounded-3xl shadow-xs border border-[#e8e6df] space-y-4"
            key={index}
          >
            <div className="flex items-start justify-between border-b border-gray-100 pb-3">
              <div>
                <p className="text-lg font-bold text-[#18221e]">{shopOrder.shop?.name}</p>
                <p className="font-medium text-xs text-[#52605b] mt-1">
                  <span>Dishes:</span>{" "}
                  {shopOrder.shopOrderItems?.map((i) => i.name).join(", ")}
                </p>
                <p className="text-xs text-[#52605b] mt-0.5">
                  <span className="font-semibold text-[#18221e]">Subtotal:</span> ₹{shopOrder.subtotal}
                </p>
                <p className="mt-2 text-[11px] text-[#83928c]">
                  <span className="font-semibold text-[#52605b]">Delivery to:</span>{" "}
                  {currentOrder.deliveryAddress?.text}
                </p>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                  shopOrder.status === "delivered"
                    ? "bg-emerald-100 text-emerald-800"
                    : shopOrder.status === "out of delivery"
                    ? "bg-purple-100 text-purple-700 animate-pulse"
                    : shopOrder.status === "preparing"
                    ? "bg-amber-100 text-amber-800"
                    : "bg-gray-100 text-gray-700"
                }`}
              >
                {shopOrder.status}
              </span>
            </div>

            {shopOrder.status !== "delivered" ? (
              <>
                {shopOrder.assignedDeliveryBoy ? (
                  <div className="text-xs text-[#52605b] bg-[#edf7f3]/60 p-3.5 rounded-xl border border-[#d1e7dc]">
                    <p className="font-semibold text-[#18221e]">
                      <span>Delivery Partner:</span> {shopOrder.assignedDeliveryBoy.fullName}
                    </p>
                    <p className="text-[11px] text-[#52605b] mt-0.5">
                      <span>Contact:</span> {shopOrder.assignedDeliveryBoy.mobile}
                    </p>
                  </div>
                ) : (
                  <div className="text-xs text-gray-500 bg-gray-50/80 p-3 rounded-xl border border-gray-100">
                    {shopOrder.status === "preparing"
                      ? "Your order is being prepared fresh in the kitchen."
                      : "Waiting for kitchen confirmation."}
                  </div>
                )}
              </>
            ) : (
              <p className="text-emerald-700 font-semibold text-sm flex items-center gap-1.5">
                <FaCheckCircle size={15} />
                <span>Order delivered successfully</span>
              </p>
            )}

            {shopOrder.assignedDeliveryBoy && shopOrder.status !== "delivered" && (
              <div className="h-[380px] w-full rounded-2xl overflow-hidden border border-[#e8e6df] shadow-xs">
                <DeliveryBoyTracking
                  data={{
                    deliveryBoyLocation: liveLocations[
                      shopOrder.assignedDeliveryBoy._id
                    ] || {
                      lat: shopOrder.assignedDeliveryBoy.location?.coordinates?.[1],
                      lon: shopOrder.assignedDeliveryBoy.location?.coordinates?.[0],
                    },
                    customerLocation: {
                      lat: currentOrder.deliveryAddress?.latitude,
                      lon: currentOrder.deliveryAddress?.longitude,
                    },
                  }}
                />
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default TrackOrderPage;
