import React from "react";

function CategoryCard({ name, image, onClick }) {
  return (
    <button
      type="button"
      className="w-[125px] h-[135px] sm:w-[150px] sm:h-[160px] rounded-2xl border border-[#e8e6df] hover:border-[#0e5644] shrink-0 overflow-hidden bg-white shadow-xs hover:shadow-md transition-all duration-200 relative group cursor-pointer text-left focus:outline-none focus:ring-2 focus:ring-[#0e5644]/20"
      onClick={onClick}
    >
      <div className="w-full h-full overflow-hidden bg-[#f4f2ea]">
        <img
          src={image}
          alt={name}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
          loading="lazy"
        />
      </div>
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/75 via-black/40 to-transparent p-2.5 pt-6">
        <span className="block text-xs sm:text-sm font-semibold text-white drop-shadow-xs truncate text-center">
          {name}
        </span>
      </div>
    </button>
  );
}

export default CategoryCard;
