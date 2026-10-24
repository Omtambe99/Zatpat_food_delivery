import React from "react";
import { FaMinus, FaPlus } from "react-icons/fa";
import { FiTrash2 } from "react-icons/fi";
import { useDispatch } from "react-redux";
import { removeCartItem, updateQuantity } from "../redux/userSlice";

function CartItemCard({ data }) {
  const dispatch = useDispatch();

  const handleIncrease = (id, currentQty) => {
    dispatch(updateQuantity({ id, quantity: currentQty + 1 }));
  };

  const handleDecrease = (id, currentQty) => {
    if (currentQty > 1) {
      dispatch(updateQuantity({ id, quantity: currentQty - 1 }));
    }
  };

  return (
    <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-[#e8e6df] shadow-xs">
      <div className="flex items-center gap-3.5">
        <img
          src={data.image}
          alt={data.name}
          className="w-16 h-16 sm:w-20 sm:h-20 object-cover rounded-xl border border-gray-100 shrink-0"
        />
        <div className="flex flex-col">
          <h3 className="font-semibold text-sm sm:text-base text-[#18221e] line-clamp-1">
            {data.name}
          </h3>
          <p className="text-xs text-[#83928c] mt-0.5">
            ₹{data.price} each
          </p>
          <p className="font-bold text-sm text-[#0e5644] mt-1">
            ₹{data.price * data.quantity}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 sm:gap-3">
        {/* Quantity Stepper */}
        <div className="flex items-center border border-[#e8e6df] rounded-lg bg-gray-50/70 text-xs font-semibold text-[#18221e] overflow-hidden">
          <button
            className="p-2 hover:bg-gray-200/80 transition cursor-pointer text-gray-600"
            onClick={() => handleDecrease(data.id, data.quantity)}
            aria-label="Decrease quantity"
          >
            <FaMinus size={10} />
          </button>
          <span className="px-2 min-w-[20px] text-center">{data.quantity}</span>
          <button
            className="p-2 hover:bg-gray-200/80 transition cursor-pointer text-gray-600"
            onClick={() => handleIncrease(data.id, data.quantity)}
            aria-label="Increase quantity"
          >
            <FaPlus size={10} />
          </button>
        </div>

        {/* Remove Button */}
        <button
          className="p-2 bg-rose-50 text-rose-600 rounded-lg hover:bg-rose-100 transition cursor-pointer"
          onClick={() => dispatch(removeCartItem(data.id))}
          title="Remove item"
          aria-label="Remove item"
        >
          <FiTrash2 size={16} />
        </button>
      </div>
    </div>
  );
}

export default CartItemCard;
