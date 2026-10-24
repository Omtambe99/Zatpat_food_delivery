import React, { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { IoIosArrowRoundBack } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import UserOrderCard from "../components/UserOrderCard";
import OwnerOrderCard from "../components/OwnerOrderCard";
import { setMyOrders, updateRealtimeOrderStatus } from "../redux/userSlice";

function MyOrders() {
  const { userData, myOrders, socket } = useSelector((state) => state.user);
  const navigate = useNavigate();
  const dispatch = useDispatch();

  useEffect(() => {
    socket?.on("newOrder", (data) => {
      if (data.shopOrders?.owner._id === userData._id) {
        dispatch(setMyOrders([data, ...myOrders]));
      }
    });

    socket?.on("update-status", ({ orderId, shopId, status, userId }) => {
      if (userId === userData._id) {
        dispatch(updateRealtimeOrderStatus({ orderId, shopId, status }));
      }
    });

    return () => {
      socket?.off("newOrder");
      socket?.off("update-status");
    };
  }, [socket, userData, myOrders, dispatch]);

  return (
    <div className="w-full min-h-screen bg-[#fbfaf7] flex justify-center px-4 py-8">
      <div className="w-full max-w-[800px]">
        {/* Header */}
        <div className="flex items-center gap-3 mb-6">
          <button
            onClick={() => navigate("/")}
            className="p-1.5 rounded-full hover:bg-gray-200/60 text-[#18221e] transition cursor-pointer"
            aria-label="Back"
          >
            <IoIosArrowRoundBack size={28} />
          </button>
          <div>
            <h1 className="text-2xl font-bold text-[#18221e]">Order History</h1>
            <p className="text-xs text-[#52605b]">
              Track recent meals and deliveries
            </p>
          </div>
        </div>

        {myOrders && myOrders.length > 0 ? (
          <div className="space-y-4">
            {myOrders.map((order, index) =>
              userData?.role === "user" ? (
                <UserOrderCard data={order} key={order._id || index} />
              ) : userData?.role === "owner" ? (
                <OwnerOrderCard data={order} key={order._id || index} />
              ) : null
            )}
          </div>
        ) : (
          <div className="py-20 bg-white rounded-3xl border border-[#e8e6df] text-center p-6 flex flex-col items-center justify-center gap-2">
            <h3 className="font-bold text-base text-[#18221e]">No orders placed yet</h3>
            <p className="text-xs text-[#52605b]">Explore nearby restaurants to place your first order!</p>
            <button
              onClick={() => navigate("/")}
              className="mt-3 bg-[#0e5644] text-white px-5 py-2.5 rounded-xl font-bold text-xs"
            >
              Order Food
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default MyOrders;
