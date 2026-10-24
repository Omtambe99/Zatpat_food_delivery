import React from "react";
import Nav from "./Nav.jsx";
import { useSelector } from "react-redux";
import { FaUtensils, FaPen, FaStore } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import OwnerItemCard from "./OwnerItemCard";

function OwnerDashboard() {
  const { myShopData } = useSelector((state) => state.owner);
  const navigate = useNavigate();

  return (
    <div className="w-full min-h-screen bg-[#fbfaf7] flex flex-col items-center">
      <Nav />

      <main className="w-full max-w-4xl px-4 sm:px-6 pt-24 pb-16 flex flex-col items-center gap-6">
        {!myShopData && (
          <div className="w-full max-w-md bg-white shadow-xs rounded-3xl p-8 border border-[#e8e6df] text-center flex flex-col items-center">
            <div className="w-16 h-16 rounded-2xl bg-[#edf7f3] text-[#0e5644] flex items-center justify-center text-3xl mb-4">
              <FaStore />
            </div>
            <h2 className="text-xl font-bold text-[#18221e] mb-1">Add Your Kitchen</h2>
            <p className="text-xs text-[#52605b] mb-5 leading-relaxed">
              Register your restaurant on Zatpat to participate in community batch pooling and reach local customers.
            </p>
            <button
              className="bg-[#0e5644] hover:bg-[#07392d] text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
              onClick={() => navigate("/create-edit-shop")}
            >
              Register Restaurant
            </button>
          </div>
        )}

        {myShopData && (
          <div className="w-full flex flex-col items-center gap-6">
            {/* Restaurant Profile Card */}
            <div className="bg-white shadow-xs rounded-3xl overflow-hidden border border-[#e8e6df] w-full relative">
              <button
                className="absolute top-4 right-4 bg-white/95 hover:bg-white text-[#18221e] border border-[#e8e6df] p-2.5 rounded-full shadow-sm transition cursor-pointer"
                onClick={() => navigate("/create-edit-shop")}
                title="Edit Restaurant Info"
                aria-label="Edit Restaurant"
              >
                <FaPen size={14} />
              </button>
              <img
                src={myShopData.image}
                alt={myShopData.name}
                className="w-full h-48 sm:h-64 object-cover"
              />
              <div className="p-5 sm:p-6">
                <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0e5644] mb-1">
                  <span>Merchant Kitchen</span>
                </div>
                <h1 className="text-2xl font-extrabold text-[#18221e] mb-1">
                  {myShopData.name}
                </h1>
                <p className="text-xs text-[#52605b]">
                  {myShopData.city}, {myShopData.state}
                </p>
                <p className="text-xs text-[#83928c] mt-0.5">{myShopData.address}</p>
              </div>
            </div>

            {/* Menu Items Section */}
            <div className="w-full flex items-center justify-between border-b border-[#e8e6df] pb-3 mt-2">
              <div>
                <h2 className="text-lg font-bold text-[#18221e]">Menu Dishes</h2>
                <p className="text-xs text-[#52605b]">
                  {myShopData.items?.length || 0} items currently listed
                </p>
              </div>
              <button
                className="bg-[#0e5644] hover:bg-[#07392d] text-white px-4 py-2 rounded-xl font-bold text-xs shadow-xs transition active:scale-95 cursor-pointer"
                onClick={() => navigate("/add-item")}
              >
                + Add Dish
              </button>
            </div>

            {myShopData.items.length === 0 ? (
              <div className="w-full bg-white rounded-3xl p-8 border border-[#e8e6df] text-center flex flex-col items-center justify-center gap-2">
                <FaUtensils className="text-gray-300 text-3xl mb-1" />
                <h3 className="font-bold text-sm text-[#18221e]">No dishes listed yet</h3>
                <p className="text-xs text-[#52605b] max-w-sm mb-3">
                  Add your restaurant's specialties so customers can start ordering and creating Neighbor Batches.
                </p>
                <button
                  className="bg-[#0e5644] text-white px-5 py-2 rounded-xl text-xs font-bold cursor-pointer"
                  onClick={() => navigate("/add-item")}
                >
                  Add First Dish
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3 w-full">
                {myShopData.items.map((item, index) => (
                  <OwnerItemCard data={item} key={item._id || index} />
                ))}
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default OwnerDashboard;
