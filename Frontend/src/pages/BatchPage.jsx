import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { serverUrl } from "../App";
import { setBatchCheckout, setActiveBatch } from "../redux/batchSlice";
import { clearCart } from "../redux/userSlice";
import { useCountdown } from "../hooks/useCountdown";
import FoodCard from "../components/FoodCard";
import { FaArrowLeft, FaStore, FaUsers, FaCheckCircle, FaExclamationTriangle, FaShoppingBag } from "react-icons/fa";
import { MdOutlineTimer, MdDeliveryDining } from "react-icons/md";
import { IoLocationSharp } from "react-icons/io5";

export default function BatchPage() {
  const { batchId } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { userData, cartItems } = useSelector((state) => state.user);
  const { activeBatch } = useSelector((state) => state.batch);

  const [batch, setBatch] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Fetch Batch Details
  const fetchBatch = async () => {
    try {
      const res = await axios.get(`${serverUrl}/api/batch/${batchId}`, {
        withCredentials: true,
      });
      setBatch(res.data);
      dispatch(setActiveBatch(res.data));
    } catch (err) {
      console.error("Error fetching batch:", err);
      setErrorMsg(err.response?.data?.message || "Failed to load batch window.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Shop Menu Items once batch is loaded
  const fetchShopItems = async (shopId) => {
    try {
      const res = await axios.get(`${serverUrl}/api/item/get-by-shop/${shopId}`, {
        withCredentials: true,
      });
      setItems(res.data.items || []);
    } catch (err) {
      console.error("Error fetching shop items:", err);
    }
  };

  useEffect(() => {
    fetchBatch();
  }, [batchId]);

  useEffect(() => {
    if (batch?.shop?._id) {
      fetchShopItems(batch.shop._id);
    }
  }, [batch?.shop?._id]);

  // Sync with activeBatch in Redux if socket updates it
  useEffect(() => {
    if (activeBatch && activeBatch.batchId === batchId) {
      setBatch((prev) => (prev ? { ...prev, ...activeBatch } : activeBatch));
    }
  }, [activeBatch, batchId]);

  const countdown = useCountdown(batch?.expiresAt);

  // Cart validations
  const batchShopId = batch?.shop?._id;
  const hasItemsFromOtherShop = cartItems.some(
    (item) => item.shop && String(item.shop) !== String(batchShopId)
  );

  const batchCartItems = cartItems.filter(
    (item) => item.shop && String(item.shop) === String(batchShopId)
  );
  const batchCartTotal = batchCartItems.reduce(
    (sum, item) => sum + (Number(item.price) || 0) * (Number(item.quantity) || 1),
    0
  );

  const minOrderAmount = 99;
  const isMinOrderMet = batchCartTotal >= minOrderAmount;

  const discountTiers = [
    { count: 1, discount: 0, fee: 40 },
    { count: 2, discount: 30, fee: 28 },
    { count: 3, discount: 50, fee: 20 },
    { count: 4, discount: 65, fee: 14 },
    { count: 5, discount: 80, fee: 8 },
  ];

  const currentMemberCount = batch?.memberCount || 1;
  const currentDiscountPct = batch?.discountPct || 0;

  const handleProceedToCheckout = () => {
    if (!isMinOrderMet) return;
    dispatch(
      setBatchCheckout({
        batchId: batch._id || batch.batchId,
        shopId: batch.shop._id,
        shopName: batch.shop.name,
        discountPct: currentDiscountPct,
      })
    );
    navigate("/checkout");
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fbfaf7] flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-3 border-[#0e5644] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[#52605b] font-medium text-sm">Loading Neighbor Batch window...</p>
      </div>
    );
  }

  if (errorMsg || !batch) {
    return (
      <div className="min-h-screen bg-[#fbfaf7] flex flex-col items-center justify-center p-6 text-center">
        <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center text-rose-600 mb-4">
          <FaExclamationTriangle size={24} />
        </div>
        <h2 className="text-xl font-bold text-[#18221e] mb-1">Batch Window Unavailable</h2>
        <p className="text-xs text-[#52605b] max-w-sm mb-5">
          {errorMsg || "This neighbor batch window may have closed or expired."}
        </p>
        <button
          onClick={() => navigate("/")}
          className="bg-[#0e5644] hover:bg-[#07392d] text-white px-5 py-2.5 rounded-xl font-semibold text-xs shadow-xs transition cursor-pointer"
        >
          Return to Home
        </button>
      </div>
    );
  }

  const isClosed = batch.status !== "open" || countdown.isExpired;

  return (
    <div className="min-h-screen bg-[#fbfaf7] pb-28">
      {/* Top Header */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#e8e6df] px-4 sm:px-8 py-3 flex items-center justify-between shadow-2xs">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-2 text-xs font-semibold text-[#52605b] hover:text-[#18221e] transition cursor-pointer"
        >
          <FaArrowLeft size={13} />
          <span>Back</span>
        </button>
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs uppercase tracking-wider font-bold text-[#0e5644]">
            {isClosed ? "Batch Window Closed" : "Community Delivery Pool Active"}
          </span>
        </div>
      </header>

      {/* Hero Banner with Shop Info */}
      <div className="relative bg-gradient-to-r from-[#0e5644] via-[#0b4737] to-[#07392d] text-white overflow-hidden">
        {batch.shop?.image && (
          <img
            src={batch.shop.image}
            alt={batch.shop?.name}
            className="absolute inset-0 w-full h-full object-cover opacity-15 filter blur-xs"
          />
        )}
        <div className="relative max-w-5xl mx-auto px-6 py-8 md:py-10 flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-1.5 bg-white/15 backdrop-blur-md px-3 py-1 rounded-full text-xs font-semibold">
              <FaStore size={12} />
              <span>Neighbor Batch Kitchen</span>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold tracking-tight">
              {batch.shop?.name}
            </h1>
            <p className="flex items-center gap-1.5 text-xs text-gray-200">
              <IoLocationSharp size={14} className="text-[#a8e0cb]" />
              <span>{batch.shop?.address}</span>
            </p>
            <p className="text-xs text-gray-300">
              Initiated by <span className="font-semibold text-white">{batch.hostFirstName || "Neighbor"}</span>
            </p>
          </div>

          {/* Countdown Card */}
          <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-2xl p-4 flex items-center gap-4 shadow-md">
            <div className="w-12 h-12 rounded-xl bg-white text-[#0e5644] flex items-center justify-center shadow-xs">
              <MdOutlineTimer size={26} className={!isClosed ? "animate-pulse" : ""} />
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider font-bold text-gray-200">
                {isClosed ? "Window Status" : "Batch Closes In"}
              </p>
              <p className="text-2xl font-mono font-bold tracking-tight">
                {isClosed ? "CLOSED" : countdown.formatted}
              </p>
              {!isClosed && (
                <p className="text-[11px] text-gray-300">Rider dispatches when timer ends</p>
              )}
            </div>
          </div>
        </div>
      </div>

      <main className="max-w-5xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Discount Progress Ladder */}
        <section className="bg-white rounded-2xl border border-[#e8e6df] shadow-xs p-5 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-5">
            <div>
              <h2 className="text-base font-bold text-[#18221e] flex items-center gap-2">
                <MdDeliveryDining className="text-[#0e5644]" size={20} />
                <span>Delivery Fee Discount Ladder</span>
              </h2>
              <p className="text-xs text-[#52605b]">
                As more neighbors join within 300m, everyone's delivery fee progressively drops!
              </p>
            </div>
            <div className="bg-[#edf7f3] border border-[#d1e7dc] text-[#0e5644] px-3 py-1 rounded-xl text-xs font-bold self-start sm:self-auto">
              Current: {currentDiscountPct}% OFF (₹{Math.round(40 * (1 - currentDiscountPct / 100))})
            </div>
          </div>

          {/* 5-step progress track */}
          <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
            {discountTiers.map((tier) => {
              const isCurrent = currentMemberCount === tier.count;
              const isUnlocked = currentMemberCount >= tier.count;
              return (
                <div
                  key={tier.count}
                  className={`rounded-xl p-3 border text-center transition-all duration-200 relative ${
                    isCurrent
                      ? "border-[#0e5644] bg-[#edf7f3] shadow-xs ring-2 ring-[#0e5644]/20"
                      : isUnlocked
                      ? "border-[#d1e7dc] bg-[#f4faf7]"
                      : "border-[#e8e6df] bg-gray-50/50 opacity-50"
                  }`}
                >
                  {isUnlocked && (
                    <FaCheckCircle className="absolute top-2 right-2 text-[#0e5644]" size={12} />
                  )}
                  <p className="text-[11px] font-semibold text-[#52605b]">
                    {tier.count} {tier.count === 1 ? "Order" : "Orders"}
                  </p>
                  <p className="text-base font-extrabold text-[#18221e] mt-0.5">
                    {tier.discount}% <span className="text-[10px] font-normal text-[#83928c]">OFF</span>
                  </p>
                  <p className="text-xs font-bold text-[#0e5644] mt-0.5">₹{tier.fee} fee</p>
                </div>
              );
            })}
          </div>

          {/* Participants list */}
          <div className="mt-5 pt-4 border-t border-gray-100 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <FaUsers className="text-[#0e5644]" size={15} />
              <span className="text-xs font-bold text-[#18221e]">
                {currentMemberCount} of 5 Neighbors Joined
              </span>
            </div>

            <div className="flex items-center gap-1.5 flex-wrap">
              {batch.members &&
                batch.members.map((m, idx) => (
                  <span
                    key={idx}
                    className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                      m.isSelf
                        ? "bg-[#0e5644] text-white font-semibold"
                        : "bg-[#edf7f3] text-[#0e5644] border border-[#d1e7dc]"
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                    {m.displayName}
                  </span>
                ))}
            </div>
          </div>
        </section>

        {/* Cart conflict warning if items from another shop are present */}
        {hasItemsFromOtherShop && (
          <div className="bg-amber-50 border border-amber-200 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-xs">
            <div className="flex items-start gap-2.5">
              <FaExclamationTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
              <div>
                <h4 className="font-bold text-[#18221e] text-xs">Cart contains items from another shop</h4>
                <p className="text-xs text-[#52605b]">
                  Batch orders must be exclusively from <span className="font-semibold">{batch.shop?.name}</span>. Clear your cart to add items from this restaurant.
                </p>
              </div>
            </div>
            <button
              onClick={() => dispatch(clearCart())}
              className="bg-amber-700 hover:bg-amber-800 text-white text-xs font-semibold px-3.5 py-1.5 rounded-lg transition whitespace-nowrap cursor-pointer"
            >
              Clear Cart
            </button>
          </div>
        )}

        {/* Restaurant Menu */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-bold text-[#18221e]">Restaurant Menu</h2>
              <p className="text-xs text-[#52605b]">
                Select dishes to join this batch (minimum order ₹{minOrderAmount})
              </p>
            </div>
            {batchCartItems.length > 0 && (
              <span className="bg-[#edf7f3] text-[#0e5644] border border-[#d1e7dc] font-bold text-xs px-3 py-1 rounded-full">
                {batchCartItems.length} items (₹{batchCartTotal})
              </span>
            )}
          </div>

          {items.length > 0 ? (
            <div className="flex flex-wrap gap-5 justify-center sm:justify-start">
              {items.map((item) => (
                <FoodCard key={item._id} data={item} />
              ))}
            </div>
          ) : (
            <div className="bg-white rounded-2xl p-10 text-center border border-[#e8e6df]">
              <p className="text-xs text-gray-500">No menu items available for this restaurant.</p>
            </div>
          )}
        </section>
      </main>

      {/* Floating Bottom Bar for Checkout */}
      <footer className="fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-[#e8e6df] shadow-lg px-4 sm:px-8 py-3.5">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[#edf7f3] text-[#0e5644] flex items-center justify-center font-bold shrink-0">
              <FaShoppingBag size={16} />
            </div>
            <div>
              <p className="text-xs text-[#52605b]">
                Batch Order Subtotal: <span className="font-bold text-[#18221e] text-sm">₹{batchCartTotal}</span>
              </p>
              {!isMinOrderMet && (
                <p className="text-[11px] font-semibold text-amber-700">
                  Add ₹{minOrderAmount - batchCartTotal} more to reach ₹{minOrderAmount} minimum
                </p>
              )}
              {isMinOrderMet && (
                <p className="text-[11px] font-semibold text-[#0e5644]">
                  Eligible to join batch! You will receive up to {currentDiscountPct}% discount.
                </p>
              )}
            </div>
          </div>

          <button
            onClick={handleProceedToCheckout}
            disabled={isClosed || !isMinOrderMet || hasItemsFromOtherShop}
            className={`w-full sm:w-auto px-7 py-2.5 rounded-xl font-bold text-xs shadow-xs transition-all cursor-pointer ${
              isClosed || !isMinOrderMet || hasItemsFromOtherShop
                ? "bg-gray-200 text-gray-500 cursor-not-allowed"
                : "bg-[#0e5644] hover:bg-[#07392d] text-white active:scale-98"
            }`}
          >
            {isClosed
              ? "Batch Window Closed"
              : !isMinOrderMet
              ? `Add ₹${minOrderAmount - batchCartTotal} to Join`
              : "Continue to Checkout"}
          </button>
        </div>
      </footer>
    </div>
  );
}
