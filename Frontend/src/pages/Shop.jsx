import axios from "axios";
import React, { useEffect, useState } from "react";
import { serverUrl } from "../App";
import { useNavigate, useParams } from "react-router-dom";
import { FaStore, FaLocationDot, FaUtensils, FaArrowLeft, FaUsers } from "react-icons/fa6";
import FoodCard from "../components/FoodCard";
import { ClipLoader } from "react-spinners";

function Shop() {
  const { shopId } = useParams();
  const [items, setItems] = useState([]);
  const [shop, setShop] = useState(null);
  const [creatingGroup, setCreatingGroup] = useState(false);
  const navigate = useNavigate();

  const handleShop = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/item/get-by-shop/${shopId}`, {
        withCredentials: true,
      });
      setShop(result.data.shop);
      setItems(result.data.items || []);
    } catch (error) {
      console.log(error);
    }
  };

  const handleStartGroupOrder = async () => {
    setCreatingGroup(true);
    try {
      const result = await axios.post(
        `${serverUrl}/api/group-cart/create`,
        { shopId },
        { withCredentials: true }
      );
      const code = result.data.code;
      navigate(`/group/${code}`);
    } catch (error) {
      console.error("Start group order error:", error);
      alert(error.response?.data?.message || "Failed to start group order");
    } finally {
      setCreatingGroup(false);
    }
  };

  useEffect(() => {
    handleShop();
  }, [shopId]);

  return (
    <div className="min-h-screen bg-[#fbfaf7] pb-20">
      {/* Back Button */}
      <button
        className="fixed top-5 left-5 z-30 flex items-center gap-2 bg-white/90 hover:bg-white text-[#18221e] border border-[#e8e6df] px-3.5 py-1.5 rounded-full shadow-sm text-xs font-semibold backdrop-blur-md transition cursor-pointer"
        onClick={() => navigate("/")}
      >
        <FaArrowLeft size={12} />
        <span>Back to Home</span>
      </button>

      {/* Restaurant Hero Banner */}
      {shop && (
        <div className="relative w-full h-72 md:h-80 bg-[#18221e] overflow-hidden">
          <img
            src={shop.image}
            alt={shop.name}
            className="w-full h-full object-cover opacity-60"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#18221e] via-[#18221e]/50 to-transparent flex flex-col justify-end p-6 md:p-12 max-w-6xl mx-auto">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#a8e0cb] mb-1">
              <FaStore size={14} />
              <span>Partner Kitchen</span>
            </div>
            <h1 className="text-3xl md:text-5xl font-extrabold text-white tracking-tight drop-shadow-xs">
              {shop.name}
            </h1>
            <div className="flex items-center gap-2 mt-2 text-gray-300 text-xs md:text-sm font-medium">
              <FaLocationDot size={14} className="text-[#a8e0cb] shrink-0" />
              <p className="truncate">{shop.address}</p>
            </div>

            {/* Start Group Order Action */}
            <div className="mt-5 flex flex-wrap items-center gap-3">
              <button
                onClick={handleStartGroupOrder}
                disabled={creatingGroup}
                className="bg-[#0e5644] hover:bg-[#07392d] text-white px-5 py-2.5 rounded-full font-semibold text-xs shadow-md flex items-center gap-2 active:scale-95 transition-all cursor-pointer disabled:opacity-75"
              >
                {creatingGroup ? (
                  <ClipLoader size={14} color="white" />
                ) : (
                  <>
                    <FaUsers size={14} />
                    <span>Start Group Order</span>
                  </>
                )}
              </button>
              <span className="text-xs text-gray-300 hidden sm:inline">
                Order together in real-time & split bills fairly
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Menu Section */}
      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-8">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6 border-b border-[#e8e6df] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[#edf7f3] text-[#0e5644] flex items-center justify-center">
              <FaUtensils size={15} />
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-bold text-[#18221e]">
                Restaurant Menu
              </h2>
              <p className="text-xs text-[#52605b]">
                {items.length} dishes freshly available
              </p>
            </div>
          </div>

          <button
            onClick={handleStartGroupOrder}
            disabled={creatingGroup}
            className="bg-[#edf7f3] hover:bg-[#e2f1eb] text-[#0e5644] border border-[#d1e7dc] px-4 py-2 rounded-xl text-xs font-semibold transition flex items-center gap-1.5 cursor-pointer"
          >
            <FaUsers size={14} />
            <span>Invite Friends to Order</span>
          </button>
        </div>

        {items.length > 0 ? (
          <div className="flex flex-wrap gap-5 justify-center sm:justify-start">
            {items.map((item) => (
              <FoodCard key={item._id} data={item} />
            ))}
          </div>
        ) : (
          <div className="py-16 bg-white border border-[#e8e6df] rounded-2xl text-center text-sm text-gray-500 w-full flex flex-col items-center justify-center gap-2">
            <FaUtensils className="text-gray-300 text-3xl" />
            <p className="font-semibold text-gray-700">No dishes listed yet</p>
            <p className="text-xs text-gray-400">The kitchen is preparing its menu items</p>
          </div>
        )}
      </main>
    </div>
  );
}

export default Shop;
