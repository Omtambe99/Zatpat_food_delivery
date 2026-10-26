import React, { useEffect, useState } from "react";
import { IoIosArrowRoundBack } from "react-icons/io";
import { useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import CartItemCard from "../components/CartItemCard";
import { FiShoppingBag } from "react-icons/fi";
import { FaUsers, FaArrowRight } from "react-icons/fa";
import axios from "axios";
import { serverUrl } from "../App";

function CartPage() {
  const navigate = useNavigate();
  const { cartItems, totalAmount, userData } = useSelector((state) => state.user);
  const [activeGroupCart, setActiveGroupCart] = useState(null);

  useEffect(() => {
    const fetchActiveGroupCart = async () => {
      try {
        const res = await axios.get(`${serverUrl}/api/group-cart/user/active`, {
          withCredentials: true,
        });
        if (res.data?.cart) {
          setActiveGroupCart(res.data.cart);
        } else {
          // Check localStorage fallback
          const localCode = localStorage.getItem("lastGroupCartCode");
          if (localCode) {
            try {
              const directRes = await axios.get(`${serverUrl}/api/group-cart/${localCode}`, {
                withCredentials: true,
              });
              if (
                directRes.data?.cart &&
                directRes.data.cart.status !== "expired" &&
                directRes.data.cart.status !== "checked_out"
              ) {
                setActiveGroupCart(directRes.data.cart);
              }
            } catch (_) {}
          }
        }
      } catch (err) {
        console.error("Fetch active group cart error:", err);
      }
    };

    if (userData) {
      fetchActiveGroupCart();
    }
  }, [userData]);

  return (
    <div className="min-h-screen bg-[#fbfaf7] flex justify-center px-4 py-8 sm:py-12">
      <div className="w-full max-w-[760px]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate("/")}
            className="p-1.5 rounded-full hover:bg-gray-200/60 text-[#18221e] transition cursor-pointer"
            aria-label="Back to home"
          >
            <IoIosArrowRoundBack size={32} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#18221e]">Your Cart</h1>
            <p className="text-xs text-[#52605b]">
              {cartItems?.length || 0} items from restaurant
            </p>
          </div>
        </div>

        {/* Active Group Cart Resumption Banner */}
        {activeGroupCart && (
          <div className="bg-[#edf7f3] border-2 border-[#0e5644]/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0e5644] text-white flex items-center justify-center shrink-0 shadow-xs">
                <FaUsers size={18} />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-[#18221e]">
                    Active Group Cart ({activeGroupCart.code})
                  </span>
                  <span className="bg-white text-[#0e5644] font-bold text-[10px] px-2 py-0.5 rounded-full border border-[#d1e7dc] uppercase tracking-wide">
                    {activeGroupCart.status === "locked" ? "Locked" : "Open"}
                  </span>
                </div>
                <p className="text-xs text-[#52605b] mt-0.5">
                  Restaurant: <span className="font-semibold text-[#18221e]">{activeGroupCart.shop?.name || "Restaurant"}</span> • {activeGroupCart.participants?.length || 1} participant(s)
                </p>
              </div>
            </div>
            <button
              onClick={() => navigate(`/group/${activeGroupCart.code}`)}
              className="w-full sm:w-auto bg-[#0e5644] hover:bg-[#07392d] text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs transition active:scale-95 cursor-pointer flex items-center justify-center gap-1.5 shrink-0"
            >
              <span>Resume Group Cart</span>
              <FaArrowRight size={11} />
            </button>
          </div>
        )}

        {cartItems?.length === 0 ? (
          <div className="py-20 bg-white rounded-3xl border border-[#e8e6df] shadow-xs text-center flex flex-col items-center justify-center gap-3">
            <div className="w-14 h-14 rounded-2xl bg-[#edf7f3] text-[#0e5644] flex items-center justify-center">
              <FiShoppingBag size={26} />
            </div>
            <h2 className="text-lg font-bold text-[#18221e]">Your personal cart is empty</h2>
            <p className="text-xs text-[#52605b] max-w-sm">
              Discover delicious dishes from local restaurants and pool deliveries with neighbors to save!
            </p>
            <button
              onClick={() => navigate("/")}
              className="mt-2 px-5 py-2.5 rounded-full bg-[#0e5644] hover:bg-[#07392d] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
            >
              Browse Restaurants
            </button>
          </div>
        ) : (
          <>
            <div className="space-y-3.5">
              {cartItems?.map((item, index) => (
                <CartItemCard data={item} key={item.id || index} />
              ))}
            </div>

            {/* Total Summary */}
            <div className="mt-6 bg-white p-5 rounded-2xl border border-[#e8e6df] shadow-xs flex justify-between items-center">
              <div>
                <p className="text-xs text-[#83928c]">Estimated Subtotal</p>
                <h3 className="text-base font-bold text-[#18221e]">Items Total</h3>
              </div>
              <span className="text-2xl font-extrabold text-[#0e5644]">
                ₹{totalAmount}
              </span>
            </div>

            {/* Actions */}
            <div className="mt-5 flex items-center justify-between gap-4">
              <button
                onClick={() => navigate("/")}
                className="text-xs font-semibold text-[#52605b] hover:text-[#18221e] cursor-pointer"
              >
                + Add more items
              </button>
              <button
                className="bg-[#0e5644] text-white px-7 py-3 rounded-xl text-sm font-bold hover:bg-[#07392d] shadow-sm transition active:scale-98 cursor-pointer"
                onClick={() => navigate("/checkout")}
              >
                Proceed to Checkout
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default CartPage;
