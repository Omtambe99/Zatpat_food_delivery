import axios from "axios";
import React from "react";
import { FaPen, FaTrashAlt } from "react-icons/fa";
import { useNavigate } from "react-router-dom";
import { serverUrl } from "../App";
import { useDispatch } from "react-redux";
import { setMyShopData } from "../redux/ownerSlice";

function OwnerItemCard({ data }) {
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const handleDelete = async () => {
    if (!window.confirm(`Delete ${data.name}?`)) return;
    try {
      const result = await axios.get(`${serverUrl}/api/item/delete/${data._id}`, {
        withCredentials: true,
      });
      dispatch(setMyShopData(result.data));
    } catch (error) {
      console.log(error);
    }
  };

  return (
    <div className="flex bg-white rounded-2xl shadow-xs overflow-hidden border border-[#e8e6df] w-full hover:border-[#c9e5da] transition">
      <div className="w-32 sm:w-36 shrink-0 bg-gray-50">
        <img src={data.image} alt={data.name} className="w-full h-full object-cover" />
      </div>

      <div className="flex flex-col justify-between p-3.5 flex-1">
        <div>
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-[#18221e]">{data.name}</h3>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#0e5644] bg-[#edf7f3] px-2 py-0.5 rounded-md">
              {data.foodType}
            </span>
          </div>
          <p className="text-xs text-[#52605b] mt-0.5">
            <span className="font-medium text-[#18221e]">Category:</span> {data.category}
          </p>
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-gray-100 mt-2">
          <div className="text-sm font-extrabold text-[#0e5644]">₹{data.price}</div>
          <div className="flex items-center gap-1.5">
            <button
              className="p-2 cursor-pointer rounded-lg hover:bg-gray-100 text-[#52605b] hover:text-[#0e5644] transition"
              onClick={() => navigate(`/edit-item/${data._id}`)}
              title="Edit dish"
              aria-label="Edit dish"
            >
              <FaPen size={13} />
            </button>
            <button
              className="p-2 cursor-pointer rounded-lg hover:bg-rose-50 text-[#83928c] hover:text-rose-600 transition"
              onClick={handleDelete}
              title="Delete dish"
              aria-label="Delete dish"
            >
              <FaTrashAlt size={13} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default OwnerItemCard;
