import React, { useState } from "react";
import { FaStar } from "react-icons/fa";
import { FaMinus, FaPlus, FaShoppingCart } from "react-icons/fa";
import { useDispatch, useSelector } from "react-redux";
import { addToCart } from "../redux/userSlice";

function FoodCard({ data }) {
  const [quantity, setQuantity] = useState(1);
  const dispatch = useDispatch();
  const { cartItems } = useSelector((state) => state.user);

  const isInCart = cartItems.some((i) => i.id === data._id);

  const handleIncrease = () => {
    setQuantity((prev) => prev + 1);
  };

  const handleDecrease = () => {
    setQuantity((prev) => (prev > 1 ? prev - 1 : 1));
  };

  const handleAddToCart = () => {
    dispatch(
      addToCart({
        id: data._id,
        name: data.name,
        price: data.price,
        image: data.image,
        shop: data.shop,
        quantity,
        foodType: data.foodType,
      })
    );
  };

  return (
    <div className="w-[260px] rounded-2xl border border-[#e8e6df] hover:border-[#c9e5da] bg-white shadow-xs hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col group">
      {/* Food Image Container */}
      <div className="relative w-full h-[165px] bg-[#f4f2ea] overflow-hidden">
        {/* Veg / Non-Veg Indicator (FSSAI Standard Style) */}
        <div className="absolute top-2.5 right-2.5 z-10 bg-white/95 backdrop-blur-xs p-1 rounded-md shadow-xs flex items-center justify-center">
          {data.foodType === "veg" ? (
            <div className="w-3.5 h-3.5 border border-emerald-600 flex items-center justify-center rounded-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-600" />
            </div>
          ) : (
            <div className="w-3.5 h-3.5 border border-rose-700 flex items-center justify-center rounded-xs">
              <div className="w-0 h-0 border-l-[3.5px] border-l-transparent border-r-[3.5px] border-r-transparent border-b-[6px] border-b-rose-700" />
            </div>
          )}
        </div>

        <img
          src={data.image}
          alt={data.name}
          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          loading="lazy"
        />
      </div>

      {/* Food Details */}
      <div className="flex-1 flex flex-col p-3.5">
        <h3 className="font-semibold text-[#18221e] text-sm leading-snug truncate" title={data.name}>
          {data.name}
        </h3>

        {/* Rating Pill */}
        <div className="flex items-center gap-1.5 mt-1.5">
          <div className="flex items-center gap-1 bg-amber-50 text-amber-800 border border-amber-200/60 text-[11px] font-bold px-1.5 py-0.5 rounded-md">
            <FaStar className="text-amber-500 text-[10px]" />
            <span>{data.rating?.average ? Number(data.rating.average).toFixed(1) : "4.2"}</span>
          </div>
          <span className="text-[11px] text-[#83928c]">
            ({data.rating?.count || 12}+)
          </span>
        </div>
      </div>

      {/* Price & Action Row */}
      <div className="flex items-center justify-between px-3.5 pb-3.5 pt-1 mt-auto border-t border-gray-100">
        <span className="font-bold text-[#18221e] text-base">
          ₹{data.price}
        </span>

        <div className="flex items-center gap-1.5">
          {/* Quantity Stepper */}
          <div className="flex items-center border border-[#e8e6df] rounded-lg overflow-hidden bg-gray-50/70 text-xs font-semibold text-[#18221e]">
            <button
              className="px-2 py-1.5 hover:bg-gray-200/80 transition cursor-pointer text-gray-600"
              onClick={handleDecrease}
              aria-label="Decrease quantity"
            >
              <FaMinus size={9} />
            </button>
            <span className="px-2 min-w-[20px] text-center">{quantity}</span>
            <button
              className="px-2 py-1.5 hover:bg-gray-200/80 transition cursor-pointer text-gray-600"
              onClick={handleIncrease}
              aria-label="Increase quantity"
            >
              <FaPlus size={9} />
            </button>
          </div>

          {/* Add to Cart Button */}
          <button
            className={`p-2 rounded-lg font-medium text-xs transition cursor-pointer flex items-center justify-center ${
              isInCart
                ? "bg-[#18221e] text-white hover:bg-gray-800"
                : "bg-[#0e5644] text-white hover:bg-[#07392d]"
            }`}
            onClick={handleAddToCart}
            title={isInCart ? "Add more to Cart" : "Add to Cart"}
            aria-label="Add to cart"
          >
            <FaShoppingCart size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default FoodCard;
