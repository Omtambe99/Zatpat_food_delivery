import React, { useEffect, useRef, useState } from "react";
import Nav from "./Nav.jsx";
import { categories } from "../category";
import CategoryCard from "./CategoryCard";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa6";
import { useSelector } from "react-redux";
import FoodCard from "./FoodCard";
import { useNavigate } from "react-router-dom";
import { FiUsers, FiClock, FiPercent } from "react-icons/fi";

function UserDashboard() {
  const { currentCity, shopInMyCity, itemsInMyCity, searchItems } = useSelector(
    (state) => state.user
  );
  const cateScrollRef = useRef();
  const shopScrollRef = useRef();
  const navigate = useNavigate();

  const [showLeftCateButton, setShowLeftCateButton] = useState(false);
  const [showRightCateButton, setShowRightCateButton] = useState(false);
  const [showLeftShopButton, setShowLeftShopButton] = useState(false);
  const [showRightShopButton, setShowRightShopButton] = useState(false);
  const [activeCategory, setActiveCategory] = useState("All");
  const [updatedItemsList, setUpdatedItemsList] = useState([]);

  const handleFilterByCategory = (category) => {
    setActiveCategory(category);
    if (category === "All") {
      setUpdatedItemsList(itemsInMyCity || []);
    } else {
      const filteredList = itemsInMyCity?.filter((i) => i.category === category);
      setUpdatedItemsList(filteredList || []);
    }
  };

  useEffect(() => {
    setUpdatedItemsList(itemsInMyCity || []);
  }, [itemsInMyCity]);

  const updateButton = (ref, setLeftButton, setRightButton) => {
    const element = ref.current;
    if (element) {
      setLeftButton(element.scrollLeft > 10);
      setRightButton(element.scrollLeft + element.clientWidth < element.scrollWidth - 10);
    }
  };

  const scrollHandler = (ref, direction) => {
    if (ref.current) {
      ref.current.scrollBy({
        left: direction === "left" ? -240 : 240,
        behavior: "smooth",
      });
    }
  };

  useEffect(() => {
    if (cateScrollRef.current) {
      updateButton(cateScrollRef, setShowLeftCateButton, setShowRightCateButton);
      const onScrollCate = () => updateButton(cateScrollRef, setShowLeftCateButton, setShowRightCateButton);
      cateScrollRef.current.addEventListener("scroll", onScrollCate);
      return () => cateScrollRef.current?.removeEventListener("scroll", onScrollCate);
    }
  }, [categories]);

  useEffect(() => {
    if (shopScrollRef.current) {
      updateButton(shopScrollRef, setShowLeftShopButton, setShowRightShopButton);
      const onScrollShop = () => updateButton(shopScrollRef, setShowLeftShopButton, setShowRightShopButton);
      shopScrollRef.current.addEventListener("scroll", onScrollShop);
      return () => shopScrollRef.current?.removeEventListener("scroll", onScrollShop);
    }
  }, [shopInMyCity]);

  return (
    <div className="w-full min-h-screen flex flex-col items-center bg-[#fbfaf7] overflow-x-hidden">
      <Nav />

      <main className="w-full max-w-6xl flex flex-col gap-8 px-4 sm:px-6 pt-24 pb-16">
        {/* Subtle Community Batch Hero Callout */}
        <div className="w-full rounded-2xl bg-gradient-to-r from-[#edf7f3] to-[#f4faf7] border border-[#d1e7dc] p-5 sm:p-6 shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="flex flex-col gap-1 max-w-xl">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#0e5644]">
              <span className="w-2 h-2 rounded-full bg-[#0e5644] animate-pulse" />
              Community Hyperlocal Batching
            </div>
            <h2 className="text-lg sm:text-xl font-bold text-[#18221e]">
              Pool delivery with neighbors within 300m & save up to 80%
            </h2>
            <p className="text-xs sm:text-sm text-[#52605b]">
              Place an order or join a neighbor's 10-minute window. Single-rider delivery saves you delivery fees and cuts neighborhood carbon emissions.
            </p>
          </div>

          <div className="flex items-center gap-2 sm:shrink-0">
            <button
              onClick={() => navigate("/rewards")}
              className="px-4 py-2 rounded-xl bg-white border border-[#d1e7dc] text-[#0e5644] hover:bg-[#edf7f3] text-xs font-semibold shadow-2xs transition cursor-pointer flex items-center gap-1.5"
            >
              <FiPercent size={14} />
              <span>View Savings</span>
            </button>
          </div>
        </div>

        {/* Search Results */}
        {searchItems && searchItems.length > 0 && (
          <section className="w-full flex flex-col gap-4 p-5 bg-white border border-[#e8e6df] rounded-2xl shadow-xs">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h2 className="text-lg sm:text-xl font-bold text-[#18221e]">
                Search Results
              </h2>
              <span className="text-xs text-gray-500 font-medium">
                {searchItems.length} items found
              </span>
            </div>
            <div className="w-full flex flex-wrap gap-5 justify-center sm:justify-start">
              {searchItems.map((item) => (
                <FoodCard data={item} key={item._id} />
              ))}
            </div>
          </section>
        )}

        {/* Categories Section */}
        <section className="w-full flex flex-col gap-3">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-lg sm:text-xl font-bold text-[#18221e]">
                Explore Cuisines
              </h2>
              <p className="text-xs text-[#52605b]">
                Select a category to filter dishes
              </p>
            </div>
            {activeCategory !== "All" && (
              <button
                onClick={() => handleFilterByCategory("All")}
                className="text-xs font-semibold text-[#0e5644] hover:underline cursor-pointer"
              >
                Reset to All
              </button>
            )}
          </div>

          <div className="w-full relative group">
            {showLeftCateButton && (
              <button
                className="absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/95 border border-[#e8e6df] text-[#18221e] shadow-md hover:bg-white hover:border-[#0e5644] flex items-center justify-center z-10 transition cursor-pointer"
                onClick={() => scrollHandler(cateScrollRef, "left")}
                aria-label="Previous categories"
              >
                <FaChevronLeft size={12} />
              </button>
            )}

            <div
              className="w-full flex overflow-x-auto gap-3.5 pb-2 scroll-smooth no-scrollbar"
              ref={cateScrollRef}
            >
              {categories.map((cate, index) => (
                <CategoryCard
                  name={cate.category}
                  image={cate.image}
                  key={index}
                  onClick={() => handleFilterByCategory(cate.category)}
                />
              ))}
            </div>

            {showRightCateButton && (
              <button
                className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/95 border border-[#e8e6df] text-[#18221e] shadow-md hover:bg-white hover:border-[#0e5644] flex items-center justify-center z-10 transition cursor-pointer"
                onClick={() => scrollHandler(cateScrollRef, "right")}
                aria-label="Next categories"
              >
                <FaChevronRight size={12} />
              </button>
            )}
          </div>
        </section>

        {/* Featured Restaurants Nearby */}
        <section className="w-full flex flex-col gap-3">
          <div className="flex flex-col">
            <h2 className="text-lg sm:text-xl font-bold text-[#18221e]">
              Featured Restaurants in {currentCity || "Your City"}
            </h2>
            <p className="text-xs text-[#52605b]">
              Local partner kitchens ready for individual or pooled deliveries
            </p>
          </div>

          <div className="w-full relative group">
            {showLeftShopButton && (
              <button
                className="absolute left-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/95 border border-[#e8e6df] text-[#18221e] shadow-md hover:bg-white hover:border-[#0e5644] flex items-center justify-center z-10 transition cursor-pointer"
                onClick={() => scrollHandler(shopScrollRef, "left")}
                aria-label="Previous restaurants"
              >
                <FaChevronLeft size={12} />
              </button>
            )}

            <div
              className="w-full flex overflow-x-auto gap-3.5 pb-2 scroll-smooth no-scrollbar"
              ref={shopScrollRef}
            >
              {shopInMyCity && shopInMyCity.length > 0 ? (
                shopInMyCity.map((shop, index) => (
                  <CategoryCard
                    name={shop.name}
                    image={shop.image}
                    key={index}
                    onClick={() => navigate(`/shop/${shop._id}`)}
                  />
                ))
              ) : (
                <div className="py-6 px-4 bg-white border border-[#e8e6df] rounded-xl text-center text-xs text-gray-500 w-full">
                  No registered restaurants found in this location yet. Update your location above to discover nearby food!
                </div>
              )}
            </div>

            {showRightShopButton && (
              <button
                className="absolute right-1 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-white/95 border border-[#e8e6df] text-[#18221e] shadow-md hover:bg-white hover:border-[#0e5644] flex items-center justify-center z-10 transition cursor-pointer"
                onClick={() => scrollHandler(shopScrollRef, "right")}
                aria-label="Next restaurants"
              >
                <FaChevronRight size={12} />
              </button>
            )}
          </div>
        </section>

        {/* Food Items Catalog */}
        <section className="w-full flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <h2 className="text-lg sm:text-xl font-bold text-[#18221e]">
                {activeCategory === "All" ? "Suggested Dishes" : `${activeCategory} Dishes`}
              </h2>
              <p className="text-xs text-[#52605b]">
                Freshly prepared and available for instant order
              </p>
            </div>
            <span className="text-xs text-gray-500 font-medium">
              {updatedItemsList?.length || 0} items
            </span>
          </div>

          {updatedItemsList && updatedItemsList.length > 0 ? (
            <div className="w-full flex flex-wrap gap-5 justify-center sm:justify-start">
              {updatedItemsList.map((item, index) => (
                <FoodCard key={item._id || index} data={item} />
              ))}
            </div>
          ) : (
            <div className="py-12 bg-white border border-[#e8e6df] rounded-2xl text-center text-sm text-gray-500 w-full flex flex-col items-center gap-2">
              <p className="font-semibold text-gray-700">No dishes found in this category</p>
              <button
                onClick={() => handleFilterByCategory("All")}
                className="text-xs text-[#0e5644] font-semibold underline cursor-pointer"
              >
                View all available dishes
              </button>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default UserDashboard;
