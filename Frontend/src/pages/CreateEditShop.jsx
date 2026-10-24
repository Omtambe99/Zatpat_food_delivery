import React, { useState } from "react";
import { IoIosArrowRoundBack } from "react-icons/io";
import { useDispatch, useSelector } from "react-redux";
import { useNavigate } from "react-router-dom";
import { FaStore } from "react-icons/fa";
import axios from "axios";
import { serverUrl } from "../App";
import { setMyShopData } from "../redux/ownerSlice";
import { ClipLoader } from "react-spinners";
import LocationPickerModal from "../components/LocationPickerModal";

function CreateEditShop() {
  const navigate = useNavigate();
  const { myShopData } = useSelector((state) => state.owner);
  const { currentCity, currentState, currentAddress } = useSelector(
    (state) => state.user
  );
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [name, setName] = useState(myShopData?.name || "");
  const [address, setAddress] = useState(myShopData?.address || currentAddress || "");
  const [city, setCity] = useState(myShopData?.city || currentCity || "");
  const [state, setState] = useState(myShopData?.state || currentState || "");
  const [shopLocation, setShopLocation] = useState(
    myShopData?.location?.coordinates?.length === 2
      ? {
          lat: myShopData.location.coordinates[1],
          lon: myShopData.location.coordinates[0],
        }
      : null
  );
  const [frontendImage, setFrontendImage] = useState(myShopData?.image || null);
  const [backendImage, setBackendImage] = useState(null);
  const [loading, setLoading] = useState(false);
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
      formData.append("city", city);
      formData.append("state", state);
      formData.append("address", address);
      if (shopLocation?.lat && shopLocation?.lon) {
        formData.append("lat", shopLocation.lat);
        formData.append("lon", shopLocation.lon);
      }
      if (backendImage) {
        formData.append("image", backendImage);
      }
      const result = await axios.post(`${serverUrl}/api/shop/create-edit`, formData, {
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
      <LocationPickerModal
        open={showLocationPicker}
        initialLocation={shopLocation}
        initialAddress={address || city || currentCity || ""}
        initialMode="manual"
        onClose={() => setShowLocationPicker(false)}
        onSave={({
          lat,
          lon,
          address: pickedAddress,
          city: pickedCity,
          state: pickedState,
        }) => {
          setShopLocation({ lat, lon });
          if (pickedAddress) setAddress(pickedAddress);
          if (pickedCity) setCity(pickedCity);
          if (pickedState) setState(pickedState);
          setShowLocationPicker(false);
        }}
      />

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
            <FaStore size={28} />
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#18221e]">
            {myShopData ? "Edit Kitchen Profile" : "Register Restaurant"}
          </h1>
          <p className="text-xs text-[#52605b] mt-1 text-center">
            Set up your kitchen to enable community Neighbor Batch deliveries
          </p>
        </div>

        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <label className="block text-xs font-bold text-[#18221e] mb-1.5">Restaurant Name</label>
            <input
              type="text"
              placeholder="e.g. Spice Symphony Kitchen"
              className="w-full px-3.5 py-2.5 text-xs border border-[#e8e6df] rounded-xl focus:outline-none focus:border-[#0e5644] focus:ring-2 focus:ring-[#0e5644]/15"
              onChange={(e) => setName(e.target.value)}
              value={name}
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-[#18221e] mb-1.5">Cover Image</label>
            <input
              type="file"
              accept="image/*"
              className="w-full px-3 py-2 text-xs border border-[#e8e6df] rounded-xl focus:outline-none focus:border-[#0e5644]"
              onChange={handleImage}
            />
            {frontendImage && (
              <div className="mt-3">
                <img
                  src={frontendImage}
                  alt="Shop Preview"
                  className="w-full h-44 object-cover rounded-xl border border-gray-100"
                />
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-[#18221e] mb-1.5">City</label>
              <input
                type="text"
                placeholder="City"
                className="w-full px-3.5 py-2.5 text-xs border border-[#e8e6df] rounded-xl focus:outline-none focus:border-[#0e5644] focus:ring-2 focus:ring-[#0e5644]/15"
                onChange={(e) => setCity(e.target.value)}
                value={city}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-[#18221e] mb-1.5">State</label>
              <input
                type="text"
                placeholder="State"
                className="w-full px-3.5 py-2.5 text-xs border border-[#e8e6df] rounded-xl focus:outline-none focus:border-[#0e5644] focus:ring-2 focus:ring-[#0e5644]/15"
                onChange={(e) => setState(e.target.value)}
                value={state}
                required
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#18221e] mb-1.5">Street Address</label>
            <input
              type="text"
              placeholder="Shop No, Street, Locality"
              className="w-full px-3.5 py-2.5 text-xs border border-[#e8e6df] rounded-xl focus:outline-none focus:border-[#0e5644] focus:ring-2 focus:ring-[#0e5644]/15"
              onChange={(e) => setAddress(e.target.value)}
              value={address}
              required
            />
          </div>

          <div className="rounded-2xl border border-[#d1e7dc] bg-[#edf7f3]/60 p-4">
            <div className="flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#18221e]">Map Coordinates</p>
                <p className="text-[11px] text-[#52605b]">
                  Essential for precise 300m Neighbor Batch radius matching
                </p>
              </div>
              <button
                type="button"
                onClick={() => setShowLocationPicker(true)}
                className="rounded-xl bg-[#0e5644] px-3.5 py-1.5 text-xs font-bold text-white shadow-2xs hover:bg-[#07392d] transition cursor-pointer"
              >
                {shopLocation ? "Update Pin" : "Set Pin"}
              </button>
            </div>
            <div className="mt-2.5 rounded-lg bg-white p-2.5 text-xs font-mono text-[#52605b] border border-[#d1e7dc]">
              {shopLocation
                ? `Pinned: ${shopLocation.lat.toFixed(5)}, ${shopLocation.lon.toFixed(5)}`
                : "No location pinned yet."}
            </div>
          </div>

          <button
            className="w-full bg-[#0e5644] text-white px-6 py-3 rounded-xl font-bold text-xs shadow-xs hover:bg-[#07392d] transition active:scale-98 cursor-pointer disabled:opacity-60"
            disabled={loading}
          >
            {loading ? <ClipLoader size={16} color="white" /> : "Save Kitchen Details"}
          </button>
        </form>
      </div>
    </div>
  );
}

export default CreateEditShop;
