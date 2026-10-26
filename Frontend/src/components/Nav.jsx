import React, { useEffect, useState } from "react";
import { FaLocationDot } from "react-icons/fa6";
import { IoIosSearch } from "react-icons/io";
import { FiShoppingCart } from "react-icons/fi";
import { useDispatch, useSelector } from "react-redux";
import { RxCross2 } from "react-icons/rx";
import axios from "axios";
import { serverUrl } from "../App";
import { setSearchItems, setUserData } from "../redux/userSlice";
import { FaPlus } from "react-icons/fa6";
import { TbReceipt2 } from "react-icons/tb";
import { useNavigate } from "react-router-dom";
import LocationPickerModal from "./LocationPickerModal";

function Nav() {
  const { userData, currentCity, currentAddress, cartItems } = useSelector(
    (state) => state.user
  );
  const { myShopData } = useSelector((state) => state.owner);
  const [showInfo, setShowInfo] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [query, setQuery] = useState("");
  const [activeGroupCartCode, setActiveGroupCartCode] = useState(null);
  const dispatch = useDispatch();
  const navigate = useNavigate();

  useEffect(() => {
    const checkActiveCart = async () => {
      try {
        const res = await axios.get(`${serverUrl}/api/group-cart/user/active`, {
          withCredentials: true,
        });
        if (res.data?.cart?.code) {
          setActiveGroupCartCode(res.data.cart.code);
        } else {
          const localCode = localStorage.getItem("lastGroupCartCode");
          if (localCode) setActiveGroupCartCode(localCode);
        }
      } catch (_) {
        const localCode = localStorage.getItem("lastGroupCartCode");
        if (localCode) setActiveGroupCartCode(localCode);
      }
    };
    if (userData) {
      checkActiveCart();
    }
  }, [userData]);

  const locationLabel = currentAddress || currentCity || "Set delivery location";
  const savedLocation =
    userData?.location?.coordinates?.length === 2
      ? {
          lat: userData.location.coordinates[1],
          lon: userData.location.coordinates[0],
        }
      : null;

  const handleLogOut = async () => {
    try {
      await axios.get(`${serverUrl}/api/auth/signout`, {
        withCredentials: true,
      });
      dispatch(setUserData(null));
    } catch (error) {
      console.log(error);
    }
  };

  const handleSearchItems = async () => {
    try {
      const result = await axios.get(
        `${serverUrl}/api/item/search-items?query=${query}&city=${currentCity}`,
        { withCredentials: true }
      );
      dispatch(setSearchItems(result.data));
    } catch (error) {
      console.log(error);
    }
  };

  useEffect(() => {
    if (query) {
      handleSearchItems();
    } else {
      dispatch(setSearchItems(null));
    }
  }, [query]);

  return (
    <>
      <LocationPickerModal
        open={showLocationPicker}
        initialLocation={savedLocation}
        initialAddress={currentAddress || currentCity || ""}
        initialMode={userData?.locationMode || "auto"}
        onClose={() => setShowLocationPicker(false)}
        onSave={async ({ lat, lon, locationMode }) => {
          const result = await axios.post(
            `${serverUrl}/api/user/update-location`,
            { lat, lon, locationMode },
            { withCredentials: true }
          );
          dispatch(setUserData(result.data.user));
          setShowLocationPicker(false);
        }}
      />

      <header className="w-full h-[72px] flex items-center justify-between gap-4 px-4 sm:px-8 fixed top-0 z-[9999] bg-[#fbfaf7]/95 backdrop-blur-md border-b border-[#e8e6df]">

      {/* Brand Logo */}
      <div
        className="flex items-center gap-2.5 cursor-pointer select-none shrink-0"
        onClick={() => navigate("/")}
      >
        <div className="w-9 h-9 rounded-xl bg-[#0e5644] flex items-center justify-center text-white shadow-sm">
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
          </svg>
        </div>
        <div className="flex flex-col">
          <span className="text-xl font-bold tracking-tight text-[#18221e] leading-none">
            Zatpat
          </span>
          <span className="text-[10px] font-semibold text-[#0e5644] tracking-wider uppercase">
            Community Food
          </span>
        </div>
      </div>

      {/* Location Picker Pill */}
      {userData?.role !== "deliveryBoy" && (
        <button
          type="button"
          className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-[#edf7f3] hover:bg-[#e2f1eb] text-[#0e5644] border border-[#d1e7dc] text-xs font-medium transition cursor-pointer max-w-[220px]"
          onClick={() => setShowLocationPicker(true)}
          title={locationLabel}
        >
          <FaLocationDot size={13} className="text-[#0e5644] shrink-0" />
          <span className="truncate">{locationLabel}</span>
        </button>
      )}

      {/* Desktop Search Bar (User Role) */}
      {userData?.role === "user" && (
        <div className="hidden md:flex items-center flex-1 max-w-md h-[44px] bg-white rounded-full border border-[#e8e6df] px-3.5 gap-2 shadow-xs focus-within:border-[#0e5644] focus-within:ring-2 focus-within:ring-[#0e5644]/15 transition">
          <IoIosSearch size={20} className="text-[#83928c] shrink-0" />
          <input
            type="text"
            placeholder="Search dishes, restaurants, or cuisines..."
            className="w-full text-sm text-[#18221e] placeholder-[#83928c] outline-none bg-transparent"
            onChange={(e) => setQuery(e.target.value)}
            value={query}
          />
          {query && (
            <button
              onClick={() => setQuery("")}
              className="text-xs text-gray-400 hover:text-gray-600 p-1"
            >
              <RxCross2 size={14} />
            </button>
          )}
        </div>
      )}

      {/* Mobile Search Overlay */}
      {showSearch && userData?.role === "user" && (
        <div className="w-[92%] h-[56px] bg-white border border-[#e8e6df] shadow-xl rounded-2xl items-center gap-3 px-4 flex fixed top-[76px] left-[4%] md:hidden z-[9999]">
          <IoIosSearch size={20} className="text-[#0e5644] shrink-0" />
          <input
            type="text"
            placeholder="Search dishes or restaurants..."
            className="text-sm text-[#18221e] outline-none w-full bg-transparent"
            onChange={(e) => setQuery(e.target.value)}
            value={query}
            autoFocus
          />
          <button onClick={() => setShowSearch(false)} className="text-gray-400 p-1">
            <RxCross2 size={18} />
          </button>
        </div>
      )}

      {/* Right Navigation Actions */}
      <div className="flex items-center gap-2.5 sm:gap-3.5">
        {/* Mobile Search Toggle */}
        {userData?.role === "user" && (
          <button
            onClick={() => setShowSearch((prev) => !prev)}
            className="md:hidden p-2 text-[#52605b] hover:text-[#0e5644] rounded-lg transition"
            aria-label="Search"
          >
            <IoIosSearch size={22} />
          </button>
        )}

        {/* Mobile Location Icon */}
        {userData?.role !== "deliveryBoy" && (
          <button
            type="button"
            className="sm:hidden p-2 text-[#0e5644] hover:bg-[#edf7f3] rounded-lg transition"
            onClick={() => setShowLocationPicker(true)}
            aria-label="Update location"
          >
            <FaLocationDot size={18} />
          </button>
        )}

        {/* Role: Owner Controls */}
        {userData?.role === "owner" ? (
          <>
            {myShopData && (
              <button
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#0e5644] hover:bg-[#07392d] text-white text-xs font-semibold shadow-xs transition cursor-pointer"
                onClick={() => navigate("/add-item")}
              >
                <FaPlus size={12} />
                <span className="hidden sm:inline">Add Food Item</span>
              </button>
            )}

            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#edf7f3] hover:bg-[#e2f1eb] text-[#0e5644] border border-[#d1e7dc] text-xs font-semibold transition cursor-pointer"
              onClick={() => navigate("/my-orders")}
            >
              <TbReceipt2 size={16} />
              <span className="hidden sm:inline">Shop Orders</span>
            </button>
          </>
        ) : (
          <>
            {/* Role: User Controls */}
            {userData?.role === "user" && (
              <>
                <button
                  className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#edf7f3] hover:bg-[#e2f1eb] text-[#0e5644] border border-[#d1e7dc] text-xs font-semibold transition cursor-pointer"
                  onClick={() => navigate("/rewards")}
                >
                  <span>🏆</span>
                  <span>Rewards</span>
                </button>

                <button
                  className="hidden sm:block text-xs font-medium text-[#52605b] hover:text-[#18221e] px-2.5 py-1.5 rounded-lg hover:bg-gray-100 transition cursor-pointer"
                  onClick={() => navigate("/my-orders")}
                >
                  My Orders
                </button>

                {/* Active Group Cart Resumption Pill */}
                {activeGroupCartCode && (
                  <button
                    className="flex items-center gap-1.5 px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-full bg-[#edf7f3] hover:bg-[#d1e7dc] text-[#0e5644] border border-[#d1e7dc] text-xs font-bold transition cursor-pointer shadow-2xs"
                    onClick={() => navigate(`/group/${activeGroupCartCode}`)}
                    title={`Return to active group cart #${activeGroupCartCode}`}
                  >
                    <span className="w-2 h-2 rounded-full bg-emerald-600 animate-pulse" />
                    <span className="hidden sm:inline">Group Cart ({activeGroupCartCode})</span>
                    <span className="sm:hidden">Group</span>
                  </button>
                )}

                {/* Cart Icon with Counter */}
                <button
                  className="relative p-2 text-[#18221e] hover:text-[#0e5644] transition cursor-pointer"
                  onClick={() => navigate("/cart")}
                  aria-label="View Cart"
                >
                  <FiShoppingCart size={22} />
                  {cartItems?.length > 0 && (
                    <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-[#0e5644] text-white text-[10px] font-bold rounded-full flex items-center justify-center leading-none">
                      {cartItems.length}
                    </span>
                  )}
                </button>
              </>
            )}
          </>
        )}

        {/* User Profile Avatar */}
        <div className="relative">
          <button
            className="w-9 h-9 rounded-full flex items-center justify-center bg-[#0e5644] text-white text-sm font-bold shadow-xs hover:ring-2 hover:ring-[#0e5644]/25 transition cursor-pointer select-none"
            onClick={() => setShowInfo((prev) => !prev)}
            aria-label="User Menu"
          >
            {userData?.fullName ? userData.fullName.charAt(0).toUpperCase() : "U"}
          </button>

          {/* User Dropdown Menu */}
          {showInfo && (
            <div className="absolute right-0 top-[48px] w-52 bg-white rounded-2xl border border-[#e8e6df] shadow-xl p-2 flex flex-col gap-1 z-[9999] animate-in fade-in slide-in-from-top-1 duration-150">
              <div className="px-3 py-2 border-b border-gray-100">
                <p className="text-xs text-gray-500 font-medium">Signed in as</p>
                <p className="text-sm font-semibold text-[#18221e] truncate">{userData?.fullName}</p>
                <span className="inline-block mt-1 text-[10px] font-bold uppercase tracking-wider text-[#0e5644] bg-[#edf7f3] px-2 py-0.5 rounded-md">
                  {userData?.role}
                </span>
              </div>

              {userData?.role === "user" && (
                <>
                  <button
                    className="flex sm:hidden items-center gap-2 px-3 py-2 text-xs font-semibold text-[#18221e] hover:bg-[#edf7f3] hover:text-[#0e5644] rounded-lg transition text-left cursor-pointer"
                    onClick={() => {
                      setShowInfo(false);
                      navigate("/rewards");
                    }}
                  >
                    <span>🏆</span>
                    <span>Rewards & Badges</span>
                  </button>

                  <button
                    className="flex sm:hidden items-center gap-2 px-3 py-2 text-xs font-semibold text-[#18221e] hover:bg-[#edf7f3] hover:text-[#0e5644] rounded-lg transition text-left cursor-pointer"
                    onClick={() => {
                      setShowInfo(false);
                      navigate("/my-orders");
                    }}
                  >
                    <TbReceipt2 size={15} />
                    <span>My Orders</span>
                  </button>
                </>
              )}

              <button
                className="w-full text-left px-3 py-2 text-xs font-semibold text-rose-600 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                onClick={handleLogOut}
              >
                Log Out
              </button>
            </div>
          )}
        </div>
      </div>
    </header>
    </>
  );
}

export default Nav;
