import React, { useEffect, useState } from "react";
import axios from "axios";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { TbCurrentLocation } from "react-icons/tb";
import { FaLocationDot } from "react-icons/fa6";
import { RxCross2 } from "react-icons/rx";

function RecenterMap({ location }) {
  const map = useMap();

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
    const result = await axios.get(
      `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lon}&format=json&apiKey=${apiKey}`,
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
      "",
    );
    setResolvedState(firstResult?.state || "");
  };

  const handleUseCurrentLocation = () => {
    setMessage("");
    if (!navigator.geolocation) {
      setMessage("Geolocation is not available in this browser.");
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const lat = position.coords.latitude;
      const lon = position.coords.longitude;
      setLocation({ lat, lon });
      try {
        setLoading(true);
        await reverseGeocode(lat, lon);
      } catch (error) {
        console.log(error);
        setMessage("Unable to resolve the current location.");
      } finally {
        setLoading(false);
      }
    });
  };

  const handleSearch = async () => {
    if (!searchText.trim()) {
      setMessage("Enter an address or landmark to search.");
      return;
    }

    try {
      setLoading(true);
      setMessage("");
      const result = await axios.get(
        `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(searchText)}&apiKey=${apiKey}`,
      );
      const firstFeature = result?.data?.features?.[0];
      const latitude = firstFeature?.properties?.lat;
      const longitude = firstFeature?.properties?.lon;

      if (latitude === undefined || longitude === undefined) {
        setMessage("No matching location found.");
        return;
      }

      setLocation({ lat: latitude, lon: longitude });
      setResolvedAddress(firstFeature?.properties?.formatted || searchText);
      setSearchText(firstFeature?.properties?.formatted || searchText);
      setResolvedCity(firstFeature?.properties?.city || firstFeature?.properties?.county || "");
      setResolvedState(firstFeature?.properties?.state || "");
    } catch (error) {
      console.log(error);
      setMessage("Unable to search that location.");
    } finally {
      setLoading(false);
    }
  };

  const handleMarkerDragEnd = async (event) => {
    const marker = event.target;
    const { lat, lng } = marker.getLatLng();
    setLocation({ lat, lon: lng });

    try {
      setLoading(true);
      await reverseGeocode(lat, lng);
    } catch (error) {
      console.log(error);
      setMessage("Unable to resolve the selected point.");
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    if (!location.lat || !location.lon) {
      setMessage("Select a valid location first.");
      return;
    }

    try {
      setLoading(true);
      await onSave({
        lat: location.lat,
        lon: location.lon,
        locationMode,
        address: resolvedAddress || searchText,
        city: resolvedCity,
        state: resolvedState,
      });
    } catch (error) {
      console.log(error);
      setMessage("Failed to save the location.");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-5xl overflow-hidden rounded-[32px] border border-white/60 bg-white shadow-[0_30px_120px_rgba(15,23,42,0.28)]">
        <div className="flex items-center justify-between border-b border-orange-100 px-5 py-4">
          <div>
            <p className="text-sm uppercase tracking-[0.25em] text-[#ff4d2d] font-semibold">
              Location
            </p>
            <h2 className="text-xl font-bold text-gray-900">Set your delivery spot</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full p-2 text-gray-500 hover:bg-gray-100 hover:text-gray-900"
          >
            <RxCross2 size={22} />
          </button>
        </div>

        <div className="grid gap-5 bg-[linear-gradient(180deg,#fffaf7_0%,#ffffff_40%)] p-5 lg:grid-cols-[1.15fr_0.85fr]">
          <div className="space-y-4">
            <div className="rounded-[24px] border border-orange-100 bg-white p-4 shadow-sm">
              <label className="mb-3 block text-sm font-semibold text-gray-700">
                Location mode
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setLocationMode("auto")}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    locationMode === "auto"
                      ? "border-[#ff4d2d] bg-[#ff4d2d]/10 text-[#ff4d2d]"
                      : "border-gray-200 bg-white text-gray-700 hover:border-orange-200"
                  }`}
                >
                  <span className="block font-semibold">Automatic</span>
                    <span className="block text-xs opacity-80">Keep syncing GPS automatically</span>
                </button>
                <button
                  type="button"
                  onClick={() => setLocationMode("manual")}
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    locationMode === "manual"
                      ? "border-[#ff4d2d] bg-[#ff4d2d]/10 text-[#ff4d2d]"
                      : "border-gray-200 bg-white text-gray-700 hover:border-orange-200"
                  }`}
                >
                  <span className="block font-semibold">Manual</span>
                    <span className="block text-xs opacity-80">Choose the spot on the map yourself</span>
                </button>
              </div>
            </div>

            <div className="rounded-[24px] border border-orange-100 bg-orange-50/40 p-4">
              <label className="mb-2 block text-sm font-semibold text-gray-700">
                Search address or landmark
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
                  placeholder="Try: home, office, market, street name..."
                  className="w-full rounded-xl border border-gray-200 bg-white px-4 py-3 outline-none focus:border-[#ff4d2d]"
                />
                <button
                  type="button"
                  onClick={handleSearch}
                  className="rounded-xl bg-[#ff4d2d] px-4 py-3 text-white hover:bg-orange-600"
                >
                  Search
                </button>
              </div>
              {message && (
                <p className="mt-2 text-sm text-red-500">{message}</p>
              )}
              <p className="mt-2 text-xs text-gray-500">Search first, then drag the pin to the exact building or entrance.</p>
            </div>

            <div className="overflow-hidden rounded-[24px] border border-gray-200 shadow-sm">
              <MapContainer
                className="h-[360px] w-full"
                center={[location.lat || 20.5937, location.lon || 78.9629]}
                zoom={15}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
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

          <div className="flex flex-col gap-4 rounded-[24px] border border-orange-100 bg-white p-4 shadow-sm">
            <div className="rounded-[20px] bg-[#fff8f5] p-4">
              <p className="text-sm font-semibold text-gray-700">Selected location</p>
              <div className="mt-2 flex items-start gap-3">
                <FaLocationDot className="mt-1 text-[#ff4d2d]" />
                <div>
                  <p className="font-medium text-gray-900">
                    {resolvedAddress || searchText || "No address selected yet"}
                  </p>
                  <p className="text-sm text-gray-500">Pick a point on the map or search for a place to update your saved location.</p>
                </div>
              </div>
            </div>

            <button
              type="button"
              onClick={handleUseCurrentLocation}
              className="flex items-center justify-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-4 py-3 text-blue-600 hover:bg-blue-100"
            >
              <TbCurrentLocation size={18} />
              Use current location
            </button>

            <div className="rounded-[20px] border border-dashed border-orange-200 bg-orange-50/30 p-4 text-sm text-gray-600">
              Your saved spot drives restaurant suggestions and order checkout.
            </div>

            <button
              type="button"
              onClick={handleSave}
              disabled={loading}
              className="mt-auto rounded-xl bg-[#ff4d2d] px-4 py-3 font-semibold text-white hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-70"
            >
              {loading ? "Saving..." : "Save location"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default LocationPickerModal;
