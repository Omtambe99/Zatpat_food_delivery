import React, { useEffect, useState } from "react";
import axios from "axios";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { TbCurrentLocation } from "react-icons/tb";
import { FaLocationDot } from "react-icons/fa6";
import { RxCross2 } from "react-icons/rx";

function RecenterMap({ location }) {
  const map = useMap();

  useEffect(() => {
    // Invalidate map size so Leaflet recalculates viewport bounds when modal opens
    const timer = setTimeout(() => {
      map.invalidateSize();
    }, 150);
    return () => clearTimeout(timer);
  }, [map]);

  useEffect(() => {
    if (location.lat && location.lon) {
      map.setView([location.lat, location.lon], 16, { animate: true });
    }
  }, [location, map]);

  return null;
}

function LocationPickerModal({
  open,
  initialLocation,
  initialAddress,
  initialMode = "auto",
  onClose,
  onSave,
}) {
  const apiKey = import.meta.env.VITE_GEOAPIKEY;
  const [searchText, setSearchText] = useState("");
  const [location, setLocation] = useState({ lat: null, lon: null });
  const [resolvedAddress, setResolvedAddress] = useState("");
  const [resolvedCity, setResolvedCity] = useState("");
  const [resolvedState, setResolvedState] = useState("");
  const [locationMode, setLocationMode] = useState(initialMode);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  // Close on Escape key press
  useEffect(() => {
    if (!open) return;
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) {
      return;
    }

    setMessage("");
    setSearchText(initialAddress || "");
    setResolvedAddress(initialAddress || "");
    setResolvedCity("");
    setResolvedState("");
    setLocationMode(initialMode || "auto");

    if (initialLocation?.lat && initialLocation?.lon) {
      setLocation(initialLocation);
      return;
    }

    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition((position) => {
        setLocation({
          lat: position.coords.latitude,
          lon: position.coords.longitude,
        });
      });
    }
  }, [open, initialAddress, initialLocation, initialMode]);

  const reverseGeocode = async (lat, lon) => {
    try {
      const result = await axios.get(
        `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&format=json&apiKey=${apiKey}`
      );
      const firstResult = result?.data?.results?.[0];
      const address =
        firstResult?.address_line2 ||
        firstResult?.address_line1 ||
        firstResult?.formatted ||
        searchText;
      setResolvedAddress(address || "");
      setSearchText(address || "");
      setResolvedCity(
        firstResult?.city ||
          firstResult?.county ||
          firstResult?.suburb ||
          firstResult?.village ||
          ""
      );
      setResolvedState(firstResult?.state || "");
    } catch (err) {
      console.log("Reverse geocoding error:", err);
    }
  };

  const handleUseCurrentLocation = () => {
    setMessage("");
    if (!navigator.geolocation) {
      setMessage("Geolocation is not available in this browser.");
      return;
    }

    setLoading(true);
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const lat = position.coords.latitude;
        const lon = position.coords.longitude;
        setLocation({ lat, lon });
        try {
          await reverseGeocode(lat, lon);
        } catch (error) {
          console.log(error);
          setMessage("Could not reverse-geocode your GPS location.");
        } finally {
          setLoading(false);
        }
      },
      (err) => {
        setLoading(false);
        setMessage("Unable to retrieve your location. Please check browser permissions.");
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };

  const handleSearch = async () => {
    if (!searchText.trim()) {
      setMessage("Please enter an address or area name to search.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      const result = await axios.get(
        `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
          searchText
        )}&format=json&apiKey=${apiKey}`
      );
      const firstResult = result?.data?.results?.[0];

      if (!firstResult) {
        setMessage("No place found for that search. Try a more specific locality.");
        return;
      }

      const nextLocation = {
        lat: Number(firstResult.lat),
        lon: Number(firstResult.lon),
      };
      setLocation(nextLocation);
      const address =
        firstResult.address_line2 ||
        firstResult.address_line1 ||
        firstResult.formatted ||
        searchText;
      setResolvedAddress(address);
      setResolvedCity(
        firstResult.city ||
          firstResult.county ||
          firstResult.suburb ||
          firstResult.village ||
          ""
      );
      setResolvedState(firstResult.state || "");
    } catch (error) {
      console.log(error);
      setMessage("Search failed. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkerDragEnd = async (event) => {
    const nextLatLng = event.target.getLatLng();
    const lat = nextLatLng.lat;
    const lon = nextLatLng.lng;
    setLocation({ lat, lon });
    try {
      setLoading(true);
      await reverseGeocode(lat, lon);
    } catch (error) {
      console.log(error);
      setMessage("Could not fetch address for this pin location.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = () => {
    if (!location.lat || !location.lon) {
      setMessage("Choose a location on the map before saving.");
      return;
    }

    onSave({
      lat: location.lat,
      lon: location.lon,
      address: resolvedAddress || searchText,
      city: resolvedCity,
      state: resolvedState,
      locationMode,
    });
  };

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[99999] overflow-y-auto bg-black/60 backdrop-blur-xs flex min-h-screen items-center justify-center p-3 sm:p-4 md:p-6"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-4xl bg-white rounded-3xl shadow-2xl border border-[#e8e6df] overflow-hidden my-auto flex flex-col max-h-[calc(100vh-2rem)] sm:max-h-[min(90vh,760px)]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky Header - Always visible at top */}
        <div className="flex items-center justify-between border-b border-[#e8e6df] px-5 sm:px-6 py-3.5 sm:py-4 bg-white shrink-0">
          <div>
            <h2 className="text-base sm:text-lg font-bold text-[#18221e]">
              Select Delivery Location
            </h2>
            <p className="text-[11px] sm:text-xs text-[#52605b]">
              Pinpoints local restaurants and finds neighbors within 300m for batch discounts
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-400 hover:bg-gray-100 hover:text-gray-900 transition cursor-pointer shrink-0"
            aria-label="Close modal"
          >
            <RxCross2 size={20} />
          </button>
        </div>

        {/* Scrollable Modal Content */}
        <div className="overflow-y-auto flex-1 bg-[#fbfaf7] p-4 sm:p-5">
          <div className="grid gap-4 lg:grid-cols-[1.15fr_0.85fr] items-start">
            {/* Left Column: Search & Map */}
            <div className="space-y-3.5">
              {/* Location Mode Selector */}
              <div className="rounded-2xl border border-[#e8e6df] bg-white p-3.5 shadow-xs">
                <label className="mb-2 block text-xs font-bold text-[#18221e]">
                  Location Mode
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLocationMode("auto")}
                    className={`rounded-xl border p-2.5 text-left transition cursor-pointer ${
                      locationMode === "auto"
                        ? "border-[#0e5644] bg-[#edf7f3] text-[#0e5644]"
                        : "border-[#e8e6df] bg-white text-[#52605b] hover:border-gray-300"
                    }`}
                  >
                    <span className="block font-bold text-xs">Automatic</span>
                    <span className="block text-[11px] opacity-75 mt-0.5">Keep syncing GPS</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setLocationMode("manual")}
                    className={`rounded-xl border p-2.5 text-left transition cursor-pointer ${
                      locationMode === "manual"
                        ? "border-[#0e5644] bg-[#edf7f3] text-[#0e5644]"
                        : "border-[#e8e6df] bg-white text-[#52605b] hover:border-gray-300"
                    }`}
                  >
                    <span className="block font-bold text-xs">Manual Pin</span>
                    <span className="block text-[11px] opacity-75 mt-0.5">Drag to entrance</span>
                  </button>
                </div>
              </div>

              {/* Search Bar */}
              <div className="rounded-2xl border border-[#d1e7dc] bg-[#edf7f3]/50 p-3.5">
                <label className="mb-1.5 block text-xs font-bold text-[#18221e]">
                  Search Address or Landmark
                </label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={searchText}
                    onChange={(e) => setSearchText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        handleSearch();
                      }
                    }}
                    placeholder="Street, apartment, society, area..."
                    className="w-full rounded-xl border border-[#e8e6df] bg-white px-3 py-2 text-xs text-[#18221e] outline-none focus:border-[#0e5644] focus:ring-2 focus:ring-[#0e5644]/15"
                  />
                  <button
                    type="button"
                    onClick={handleSearch}
                    disabled={loading}
                    className="rounded-xl bg-[#0e5644] px-4 py-2 text-xs font-bold text-white hover:bg-[#07392d] transition cursor-pointer disabled:opacity-60 shrink-0"
                  >
                    Search
                  </button>
                </div>
                {message && (
                  <p className="mt-2 text-xs text-rose-600 font-medium">{message}</p>
                )}
                <p className="mt-1.5 text-[11px] text-[#52605b]">
                  Search your address, then drag the pin to your exact building entrance.
                </p>
              </div>

              {/* Interactive Map */}
              <div className="overflow-hidden rounded-2xl border border-[#e8e6df] shadow-xs">
                <MapContainer
                  className="h-[250px] sm:h-[280px] w-full"
                  center={[location.lat || 20.5937, location.lon || 78.9629]}
                  zoom={15}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  {location.lat && location.lon && (
                    <>
                      <RecenterMap location={location} />
                      <Marker
                        position={[location.lat, location.lon]}
                        draggable
                        eventHandlers={{ dragend: handleMarkerDragEnd }}
                      />
                    </>
                  )}
                </MapContainer>
              </div>
            </div>

            {/* Right Column: Address Details, GPS Trigger, and Save Button */}
            <div className="flex flex-col gap-3 rounded-2xl border border-[#e8e6df] bg-white p-4 sm:p-5 shadow-xs">
              {/* Selected Coordinates & Address Card */}
              <div className="rounded-xl bg-[#edf7f3]/50 border border-[#d1e7dc] p-3.5">
                <p className="text-xs font-bold text-[#18221e] uppercase tracking-wider">
                  Selected Location
                </p>
                <div className="mt-2 flex items-start gap-2.5">
                  <FaLocationDot className="mt-0.5 text-[#0e5644] shrink-0" size={15} />
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-xs text-[#18221e] break-words">
                      {resolvedAddress || searchText || "No address selected yet"}
                    </p>
                    <p className="text-[11px] text-[#55635e] font-mono mt-1">
                      {location.lat && location.lon
                        ? `${location.lat.toFixed(5)}, ${location.lon.toFixed(5)}`
                        : "Drag marker to select"}
                    </p>
                  </div>
                </div>
              </div>

              {/* GPS Button */}
              <button
                type="button"
                onClick={handleUseCurrentLocation}
                disabled={loading}
                className="flex items-center justify-center gap-2 rounded-xl border border-[#d1e7dc] bg-[#edf7f3] px-4 py-2.5 text-xs font-bold text-[#0e5644] hover:bg-[#e2f1eb] transition cursor-pointer disabled:opacity-60"
              >
                <TbCurrentLocation size={16} />
                <span>{loading ? "Detecting GPS..." : "Use Current GPS Location"}</span>
              </button>

              {/* Neighbor Batch Explainer */}
              <div className="rounded-xl border border-[#e8e6df] bg-[#fbfaf7] p-3 text-xs text-[#52605b] leading-relaxed">
                <p className="font-semibold text-[#18221e] mb-0.5">💡 Hyperlocal Pooling</p>
                Your exact coordinates power the 300-meter Neighbor Batch radius so you never miss discounts when neighbors order.
              </div>

              {/* Action Button: Save Delivery Location */}
              <button
                type="button"
                onClick={handleSave}
                disabled={loading || !location.lat || !location.lon}
                className="mt-2 sm:mt-auto rounded-xl bg-[#0e5644] hover:bg-[#07392d] px-4 py-3 font-bold text-xs text-white transition active:scale-98 disabled:opacity-60 cursor-pointer shadow-sm flex items-center justify-center"
              >
                {loading ? "Saving..." : "Save Delivery Location"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LocationPickerModal;
