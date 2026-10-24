import React, { useEffect, useState } from "react";
import { IoIosArrowRoundBack } from "react-icons/io";
import { IoSearchOutline } from "react-icons/io5";
import { TbCurrentLocation } from "react-icons/tb";
import { IoLocationSharp } from "react-icons/io5";
import { MapContainer, Marker, TileLayer, useMap } from "react-leaflet";
import { useDispatch, useSelector } from "react-redux";
import "leaflet/dist/leaflet.css";
import { setAddress, setLocation } from "../redux/mapSlice";
import { MdDeliveryDining } from "react-icons/md";
import { FaCreditCard, FaUsers, FaExclamationCircle } from "react-icons/fa";
import axios from "axios";
import { FaMobileScreenButton } from "react-icons/fa6";
import { useNavigate } from "react-router-dom";
import { serverUrl } from "../App";
import { addMyOrder, clearCart } from "../redux/userSlice";
import { clearBatchCheckout } from "../redux/batchSlice";

function RecenterMap({ location }) {
  if (location.lat && location.lon) {
    const map = useMap();
    map.setView([location.lat, location.lon], 16, { animate: true });
  }
  return null;
}

function CheckOut() {
  const { location, address } = useSelector((state) => state.map);
  const { cartItems, userData } = useSelector((state) => state.user);
  const { batchCheckout } = useSelector((state) => state.batch);
  const [addressInput, setAddressInput] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [openToNeighbors, setOpenToNeighbors] = useState(false);
  const [quote, setQuote] = useState(null);
  const [loadingOrder, setLoadingOrder] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const navigate = useNavigate();
  const dispatch = useDispatch();
  const apiKey = import.meta.env.VITE_GEOAPIKEY;

  // Determine if all items in cart are from a single shop
  const uniqueShopIds = [
    ...new Set(
      cartItems.map((i) => String(i.shop?._id || i.shop)).filter(Boolean)
    ),
  ];
  const isSingleShop = uniqueShopIds.length === 1;

  // Fetch Pricing Quote from server
  const fetchQuote = async () => {
    if (!cartItems || cartItems.length === 0) return;
    try {
      const prospectiveMembers = batchCheckout ? 2 : 1;
      const res = await axios.post(
        `${serverUrl}/api/order/quote`,
        { cartItems, memberCount: prospectiveMembers },
        { withCredentials: true }
      );
      setQuote(res.data);
    } catch (err) {
      console.log("Quote error:", err.message);
    }
  };

  useEffect(() => {
    fetchQuote();
  }, [cartItems, batchCheckout]);

  const itemsTotal =
    quote?.itemsTotal ??
    cartItems.reduce(
      (sum, i) => sum + Number(i.price) * Number(i.quantity),
      0
    );
  const deliveryFee = quote?.deliveryFee ?? (itemsTotal > 500 ? 0 : 40);
  const totalAmount = quote?.total ?? itemsTotal + deliveryFee;

  const onDragEnd = (e) => {
    const { lat, lng } = e.target._latlng;
    dispatch(setLocation({ lat, lon: lng }));
    getAddressByLatLng(lat, lng);
  };

  const getCurrentLocation = () => {
    if (userData?.location?.coordinates) {
      const latitude = userData.location.coordinates[1];
      const longitude = userData.location.coordinates[0];
      dispatch(setLocation({ lat: latitude, lon: longitude }));
      getAddressByLatLng(latitude, longitude);
    }
  };

  const getAddressByLatLng = async (lat, lng) => {
    try {
      const result = await axios.get(
        `https://api.geoapify.com/v1/geocode/reverse?lat=${lat}&lon=${lng}&format=json&apiKey=${apiKey}`
      );
      dispatch(setAddress(result?.data?.results[0]?.address_line2 || ""));
    } catch (error) {
      console.log(error);
    }
  };

  const getLatLngByAddress = async () => {
    try {
      const result = await axios.get(
        `https://api.geoapify.com/v1/geocode/search?text=${encodeURIComponent(
          addressInput
        )}&apiKey=${apiKey}`
      );
      const { lat, lon } = result.data.features[0].properties;
      dispatch(setLocation({ lat, lon }));
    } catch (error) {
      console.log(error);
    }
  };

  const handlePlaceOrder = async () => {
    setErrorMessage("");
    if (!location?.lat || !location?.lon || !addressInput) {
      setErrorMessage("Please set a valid delivery address.");
      return;
    }

    setLoadingOrder(true);
    try {
      // 1. If joining a batch
      if (batchCheckout) {
        const payload = {
          cartItems,
          paymentMethod,
          deliveryAddress: {
            text: addressInput,
            latitude: location.lat,
            longitude: location.lon,
          },
        };

        const res = await axios.post(
          `${serverUrl}/api/batch/${batchCheckout.batchId}/join`,
          payload,
          { withCredentials: true }
        );

        if (paymentMethod === "cod") {
          dispatch(addMyOrder(res.data.order));
          dispatch(clearCart());
          dispatch(clearBatchCheckout());
          navigate(`/batch/${batchCheckout.batchId}`);
        } else if (paymentMethod === "online") {
          initiateRazorpayPayment(
            res.data.razorOrder,
            res.data.order._id,
            batchCheckout.batchId,
            true
          );
        }
        return;
      }

      // 2. Standard Individual Order or Host Batch Order
      const payload = {
        paymentMethod,
        deliveryAddress: {
          text: addressInput,
          latitude: location.lat,
          longitude: location.lon,
        },
        cartItems,
        openToNeighbors: isSingleShop && openToNeighbors,
      };

      const res = await axios.post(`${serverUrl}/api/order/place-order`, payload, {
        withCredentials: true,
      });

      if (paymentMethod === "cod") {
        dispatch(addMyOrder(res.data.order));
        dispatch(clearCart());
        if (res.data.batchId) {
          navigate(`/batch/${res.data.batchId}`);
        } else {
          navigate("/order-placed");
        }
      } else if (paymentMethod === "online") {
        initiateRazorpayPayment(
          res.data.razorOrder,
          res.data.orderId,
          res.data.batchId,
          false
        );
      }
    } catch (err) {
      console.error("Place order error:", err);
      setErrorMessage(
        err.response?.data?.message || "Failed to place order. Please try again."
      );
    } finally {
      setLoadingOrder(false);
    }
  };

  const initiateRazorpayPayment = (razorOrder, orderId, batchId, isBatch) => {
    const options = {
      key: import.meta.env.VITE_RAZORPAY_KEY_ID,
      amount: razorOrder.amount,
      currency: "INR",
      name: "Zatpat Food Delivery",
      description: "Community Food Order Payment",
      order_id: razorOrder.id,
      handler: async (response) => {
        try {
          const result = await axios.post(
            `${serverUrl}/api/order/verify-payment`,
            {
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_order_id: response.razorpay_order_id,
              razorpay_signature: response.razorpay_signature,
              orderId,
            },
            { withCredentials: true }
          );

          dispatch(addMyOrder(result.data));
          dispatch(clearCart());
          if (isBatch) {
            dispatch(clearBatchCheckout());
            navigate(`/batch/${batchId}`);
          } else if (batchId) {
            navigate(`/batch/${batchId}`);
          } else {
            navigate("/order-placed");
          }
        } catch (error) {
          console.error("Payment verification error:", error);
          setErrorMessage("Payment verification failed.");
        }
      },
    };

    const rzp = new window.Razorpay(options);
    rzp.open();
  };

  useEffect(() => {
    setAddressInput(address);
  }, [address]);

  return (
    <div className="min-h-screen bg-[#fbfaf7] flex items-center justify-center p-4 sm:p-8">
      {/* Back Button */}
      <button
        onClick={() => navigate("/")}
        className="fixed top-5 left-5 z-20 p-2 rounded-full bg-white border border-[#e8e6df] text-[#18221e] hover:bg-gray-100 shadow-xs transition cursor-pointer"
        aria-label="Back"
      >
        <IoIosArrowRoundBack size={28} />
      </button>

      <div className="w-full max-w-[860px] bg-white rounded-3xl border border-[#e8e6df] shadow-sm p-6 sm:p-8 space-y-6 mt-12 sm:mt-0">
        <div className="flex items-center justify-between border-b border-gray-100 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-[#18221e]">Order Checkout</h1>
            <p className="text-xs text-[#52605b]">Complete your delivery details and payment</p>
          </div>
          {batchCheckout && (
            <span className="text-xs bg-[#edf7f3] text-[#0e5644] border border-[#d1e7dc] px-3 py-1 rounded-full font-bold">
              Neighbor Batch Active
            </span>
          )}
        </div>

        {/* Batch Info Card (if joining a batch) */}
        {batchCheckout && (
          <div className="bg-[#edf7f3]/80 border border-[#d1e7dc] rounded-2xl p-4.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
                <span className="text-xs font-bold uppercase tracking-wider text-[#0e5644]">
                  Pooling With Neighbors
                </span>
              </div>
              <button
                onClick={() => dispatch(clearBatchCheckout())}
                className="text-xs text-gray-500 hover:text-rose-600 underline cursor-pointer"
              >
                Order individually instead
              </button>
            </div>
            <p className="text-sm font-bold text-[#18221e]">
              Restaurant: {batchCheckout.shopName}
            </p>
            <p className="text-xs text-[#52605b]">
              Current discount: <span className="font-bold text-[#0e5644]">{batchCheckout.discountPct}% OFF</span> delivery fee.
              If more neighbors join during this window, your fee will decrease further and any prepaid difference will be automatically refunded!
            </p>
            <div className="text-[11px] text-[#0e5644] bg-white/80 p-2 rounded-lg border border-[#d1e7dc]">
              📍 Delivery address must be within 300m of the batch host.
            </div>
          </div>
        )}

        {/* Delivery Location Section */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-[#18221e] flex items-center gap-2">
            <IoLocationSharp className="text-[#0e5644]" size={18} />
            <span>Delivery Address</span>
          </h2>

          <div className="flex gap-2">
            <input
              type="text"
              className="flex-1 border border-[#e8e6df] rounded-xl px-3.5 py-2.5 text-sm text-[#18221e] placeholder-gray-400 focus:outline-none focus:border-[#0e5644] focus:ring-2 focus:ring-[#0e5644]/15 transition"
              placeholder="House/flat no, street, locality..."
              value={addressInput}
              onChange={(e) => setAddressInput(e.target.value)}
            />
            <button
              className="bg-[#0e5644] hover:bg-[#07392d] text-white px-3.5 py-2.5 rounded-xl flex items-center justify-center transition cursor-pointer"
              onClick={getLatLngByAddress}
              title="Search address coordinates"
            >
              <IoSearchOutline size={18} />
            </button>
            <button
              className="bg-gray-100 hover:bg-gray-200 text-[#18221e] border border-[#e8e6df] px-3.5 py-2.5 rounded-xl flex items-center justify-center transition cursor-pointer"
              onClick={getCurrentLocation}
              title="Locate my position"
            >
              <TbCurrentLocation size={18} />
            </button>
          </div>

          <div className="rounded-2xl border border-[#e8e6df] overflow-hidden shadow-2xs">
            <div className="h-60 w-full">
              <MapContainer
                className="w-full h-full"
                center={[location?.lat || 20.5937, location?.lon || 78.9629]}
                zoom={16}
              >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                <RecenterMap location={location} />
                {location?.lat && location?.lon && (
                  <Marker
                    position={[location.lat, location.lon]}
                    draggable
                    eventHandlers={{ dragend: onDragEnd }}
                  />
                )}
              </MapContainer>
            </div>
          </div>
        </section>

        {/* Single-Shop Neighbor Batch Opt-in Toggle */}
        {!batchCheckout && isSingleShop && (
          <section className="bg-[#edf7f3]/60 border border-[#d1e7dc] rounded-2xl p-4 flex items-center justify-between gap-4">
            <div className="flex items-start gap-3">
              <div className="p-2.5 rounded-xl bg-white text-[#0e5644] border border-[#d1e7dc] mt-0.5 shrink-0">
                <FaUsers size={18} />
              </div>
              <div>
                <p className="font-bold text-[#18221e] text-sm">
                  Open 10-Min Neighbor Batch Window
                </p>
                <p className="text-xs text-[#52605b] mt-0.5">
                  Allow neighbors within 300m to pool delivery from this restaurant. Earn rewards and unlock up to 80% delivery fee discount for everyone!
                </p>
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer shrink-0">
              <input
                type="checkbox"
                checked={openToNeighbors}
                onChange={(e) => setOpenToNeighbors(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#0e5644]"></div>
            </label>
          </section>
        )}

        {/* Payment Method Selector */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-[#18221e]">Payment Method</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <div
              className={`flex items-center gap-3.5 rounded-2xl border p-4 text-left cursor-pointer transition ${
                paymentMethod === "cod"
                  ? "border-[#0e5644] bg-[#edf7f3]/60 shadow-xs ring-1 ring-[#0e5644]"
                  : "border-[#e8e6df] hover:border-gray-300 bg-white"
              }`}
              onClick={() => setPaymentMethod("cod")}
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-[#0e5644] flex items-center justify-center shrink-0">
                <MdDeliveryDining size={22} />
              </div>
              <div>
                <p className="font-bold text-[#18221e] text-sm">Cash on Delivery</p>
                <p className="text-xs text-[#52605b]">Pay with cash or QR upon arrival</p>
              </div>
            </div>

            <div
              className={`flex items-center gap-3.5 rounded-2xl border p-4 text-left cursor-pointer transition ${
                paymentMethod === "online"
                  ? "border-[#0e5644] bg-[#edf7f3]/60 shadow-xs ring-1 ring-[#0e5644]"
                  : "border-[#e8e6df] hover:border-gray-300 bg-white"
              }`}
              onClick={() => setPaymentMethod("online")}
            >
              <div className="w-10 h-10 rounded-xl bg-emerald-100/70 text-[#0e5644] flex items-center justify-center shrink-0">
                <FaCreditCard size={18} />
              </div>
              <div>
                <p className="font-bold text-[#18221e] text-sm">UPI / Card / NetBanking</p>
                <p className="text-xs text-[#52605b]">Instant online payment via Razorpay</p>
              </div>
            </div>
          </div>
        </section>

        {/* Order Summary */}
        <section className="space-y-3">
          <h2 className="text-base font-bold text-[#18221e]">Order Summary</h2>
          <div className="rounded-2xl border border-[#e8e6df] bg-gray-50/70 p-4.5 space-y-2.5">
            {cartItems.map((item, index) => (
              <div key={index} className="flex justify-between text-xs sm:text-sm text-[#52605b]">
                <span>
                  {item.name} × {item.quantity}
                </span>
                <span className="font-medium text-[#18221e]">
                  ₹{Number(item.price) * Number(item.quantity)}
                </span>
              </div>
            ))}

            <div className="border-t border-gray-200/70 pt-2.5 space-y-1.5">
              <div className="flex justify-between text-xs sm:text-sm text-[#52605b]">
                <span>Subtotal</span>
                <span className="font-semibold text-[#18221e]">₹{itemsTotal}</span>
              </div>

              <div className="flex justify-between text-xs sm:text-sm text-[#52605b]">
                <span className="flex items-center gap-1.5">
                  <span>Delivery Fee</span>
                  {quote?.discountPct > 0 && (
                    <span className="bg-[#edf7f3] text-[#0e5644] border border-[#d1e7dc] text-[10px] font-bold px-1.5 py-0.2 rounded">
                      {quote.discountPct}% Batch Savings
                    </span>
                  )}
                </span>
                <span className="font-semibold text-[#18221e]">
                  {deliveryFee === 0 ? "Free" : `₹${deliveryFee}`}
                </span>
              </div>

              <div className="flex justify-between text-base sm:text-lg font-extrabold text-[#0e5644] pt-2 border-t border-gray-200">
                <span>Total Amount</span>
                <span>₹{totalAmount}</span>
              </div>
            </div>
          </div>
        </section>

        {errorMessage && (
          <div className="flex items-center gap-2 p-3.5 bg-rose-50 text-rose-700 rounded-xl border border-rose-200 text-xs font-medium">
            <FaExclamationCircle className="shrink-0" size={16} />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Place Order CTA */}
        <button
          className="w-full bg-[#0e5644] hover:bg-[#07392d] text-white py-3.5 rounded-xl font-bold text-sm shadow-md transition active:scale-98 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
          onClick={handlePlaceOrder}
          disabled={loadingOrder || cartItems.length === 0}
        >
          {loadingOrder
            ? "Processing Order..."
            : paymentMethod === "cod"
            ? `Place Order • ₹${totalAmount}`
            : `Pay & Place Order • ₹${totalAmount}`}
        </button>
      </div>
    </div>
  );
}

export default CheckOut;
