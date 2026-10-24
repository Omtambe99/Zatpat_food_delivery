import React, { useState } from "react";
import { IoIosArrowRoundBack } from "react-icons/io";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FaUtensils } from "react-icons/fa";
import axios from "axios";
import { serverUrl } from "../App";
import { setMyShopData } from "../redux/ownerSlice";
import { ClipLoader } from "react-spinners";

function AddItem() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [price, setPrice] = useState("");
  const [frontendImage, setFrontendImage] = useState(null);
  const [backendImage, setBackendImage] = useState(null);
  const [category, setCategory] = useState("");
  const [foodType, setFoodType] = useState("veg");

  const categories = [
    "Snacks",
    "Main Course",
    "Desserts",
    "Pizza",
    "Burgers",
    "Sandwiches",
    "South Indian",
    "North Indian",
    "Chinese",
    "Fast Food",
    "Others",
  ];
  const dispatch = useDispatch();

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      setBackendImage(file);
      setFrontendImage(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append("name", name);
      formData.append("category", category);
      formData.append("foodType", foodType);
      formData.append("price", price);
      if (backendImage) {
        formData.append("image", backendImage);
      }
      const result = await axios.post(`${serverUrl}/api/item/add-item`, formData, {
        withCredentials: true,
      });
      dispatch(setMyShopData(result.data));
      setLoading(false);
      navigate("/");
    } catch (error) {
      console.log(error);
      setLoading(false);
    }
  };

  return (
    <div className="flex justify-center flex-col items-center p-4 sm:p-8 bg-[#fbfaf7] min-h-screen">
      <div className="w-full max-w-lg mb-4">
        <button
          onClick={() => navigate("/")}
          className="p-1.5 rounded-full hover:bg-gray-200/60 text-[#18221e] transition cursor-pointer"
          aria-label="Back"
        >
          <IoIosArrowRoundBack size={28} />
        </button>
      </div>

      <div className="max-w-lg w-full bg-white shadow-xs rounded-3xl p-6 sm:p-8 border border-[#e8e6df]">
        <div className="flex flex-col items-center mb-6">
          <div className="bg-[#edf7f3] text-[#0e5644] p-3.5 rounded-2xl mb-3">
            <FaUtensils size={24} />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#18221e]">
            Add Menu Dish
          </h1>
          <p className="text-xs text-[#52605b] mt-1 text-center">
            List a new dish for individual and community batched orders
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-bold text-[#18221e] mb-1.5">Dish Name</label>
            <input
              type="text"
              placeholder="e.g. Paneer Butter Masala"
              className="w-full px-3.5 py-2.5 text-xs border border-[#e8e6df] rounded-xl focus:outline-none focus:border-[#0e5644] focus:ring-2 focus:ring-[#0e5644]/15"
              onChange={(e) => setName(e.target.value)}
              value={name}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#18221e] mb-1.5">Dish Image</label>
            <input
              type="file"
              accept="image/*"
              className="w-full px-3 py-2 text-xs border border-[#e8e6df] rounded-xl focus:outline-none focus:border-[#0e5644]"
              onChange={handleImage}
              required
            />
            {frontendImage && (
              <div className="mt-3">
                <img
                  src={frontendImage}
                  alt="Dish Preview"
                  className="w-full h-44 object-cover rounded-xl border border-gray-100"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#18221e] mb-1.5">Price (₹)</label>
              <input
                type="number"
                placeholder="250"
                min="1"
                className="w-full px-3.5 py-2.5 text-xs border border-[#e8e6df] rounded-xl focus:outline-none focus:border-[#0e5644] focus:ring-2 focus:ring-[#0e5644]/15"
                onChange={(e) => setPrice(e.target.value)}
                value={price}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#18221e] mb-1.5">Dietary Type</label>
              <select
                className="w-full px-3.5 py-2.5 text-xs border border-[#e8e6df] rounded-xl focus:outline-none focus:border-[#0e5644] focus:ring-2 focus:ring-[#0e5644]/15 bg-white cursor-pointer"
                onChange={(e) => setFoodType(e.target.value)}
                value={foodType}
              >
                <option value="veg">Vegetarian</option>
                <option value="non veg">Non-Vegetarian</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#18221e] mb-1.5">Category</label>
            <select
              className="w-full px-3.5 py-2.5 text-xs border border-[#e8e6df] rounded-xl focus:outline-none focus:border-[#0e5644] focus:ring-2 focus:ring-[#0e5644]/15 bg-white cursor-pointer"
              onChange={(e) => setCategory(e.target.value)}
              value={category}
              required
            >
              <option value="">Select Cuisine / Category</option>
              {categories.map((cate, index) => (
                <option value={cate} key={index}>
                  {cate}
                </option>
              ))}
            </select>
          </div>

          <button
            className="w-full bg-[#0e5644] text-white px-6 py-3 rounded-xl font-bold text-xs shadow-xs hover:bg-[#07392d] transition active:scale-98 cursor-pointer disabled:opacity-60 mt-2"
            disabled={loading}
          >
            {loading ? <ClipLoader size={16} color="white" /> : "Save Dish"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default AddItem;
