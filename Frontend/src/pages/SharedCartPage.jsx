import React, { useEffect, useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import axios from "axios";
import { serverUrl } from "../App";
import {
  FaUsers,
  FaCopy,
  FaCheck,
  FaPlus,
  FaMinus,
  FaLock,
  FaLockOpen,
  FaWhatsapp,
  FaStore,
  FaLeaf,
  FaDrumstickBite,
} from "react-icons/fa";
import { IoIosArrowRoundBack } from "react-icons/io";
import { ClipLoader } from "react-spinners";

export default function SharedCartPage() {
  const { code } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();

  const { userData, socket } = useSelector((state) => state.user);
  const { location, address } = useSelector((state) => state.map);

  const [cartData, setCartData] = useState(null);
  const [menuItems, setMenuItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [locking, setLocking] = useState(false);
  const [joining, setJoining] = useState(false);

  // Host Checkout Modal
  const [showCheckoutModal, setShowCheckoutModal] = useState(false);
  const [deliveryAddressText, setDeliveryAddressText] = useState(address || "");
  const [paymentMethod, setPaymentMethod] = useState("cod");
  const [openToNeighbors, setOpenToNeighbors] = useState(false);
  const [checkingOut, setCheckingOut] = useState(false);

  const debounceTimerRef = useRef(null);

  // Central payload normalizer for initial fetch, actions, and socket updates
  const applyCartPayload = (payload) => {
    if (!payload) return;
    const cart = payload.cart || payload;
    const bill = payload.bill || payload.billSplit || cart.bill || cart.billSplit;

    const normalized = {
      ...cart,
      billSplit: bill || cart.billSplit,
    };
    setCartData(normalized);

    const targetShopId = cart.shop?._id || cart.shop;
    if (targetShopId) {
      fetchShopMenu(targetShopId);
    }
  };

  // Fetch Shared Cart Data
  const fetchSharedCart = async () => {
    try {
      const res = await axios.get(`${serverUrl}/api/group-cart/${code}`, {
        withCredentials: true,
      });
      applyCartPayload(res.data);
    } catch (err) {
      console.error("Fetch shared cart error:", err);
      setErrorMsg(err.response?.data?.message || "Failed to load shared cart.");
    } finally {
      setLoading(false);
    }
  };

  // Fetch Restaurant Menu
  const fetchShopMenu = async (shopId) => {
    try {
      const res = await axios.get(`${serverUrl}/api/item/get-by-shop/${shopId}`, {
        withCredentials: true,
      });
      const items = res.data.items || (Array.isArray(res.data) ? res.data : []);
      setMenuItems(items);
    } catch (err) {
      console.error("Fetch shop menu error:", err);
    }
  };

  useEffect(() => {
    fetchSharedCart();
  }, [code]);

  useEffect(() => {
    if (address) {
      setDeliveryAddressText(address);
    } else if (userData?.address) {
      setDeliveryAddressText(userData.address);
    }
  }, [address, userData?.address]);

  // Socket setup: Join room & listen for updates
  useEffect(() => {
    if (!socket || !code) return;

    socket.emit("joinCart", { code });

    const handleCartUpdated = (data) => {
      const incomingCode = data.cart?.code || data.code;
      if (incomingCode === code) {
        applyCartPayload(data);
      }
    };

    const handleCartLocked = (data) => {
      const incomingCode = data.cart?.code || data.code;
      if (incomingCode === code) {
        setCartData((prev) => (prev ? { ...prev, status: "locked" } : prev));
      }
    };

    const handleCartUnlocked = (data) => {
      const incomingCode = data.cart?.code || data.code;
      if (incomingCode === code) {
        setCartData((prev) => (prev ? { ...prev, status: "open" } : prev));
      }
    };

    const handleCartCheckedOut = (data) => {
      const incomingCode = data.cart?.code || data.code;
      if (incomingCode === code) {
        const orderId = data.orderId || data.order?._id;
        setCartData((prev) => (prev ? { ...prev, status: "checked_out", order: orderId } : prev));
        alert("The group order has been placed by the host!");
        if (orderId) {
          navigate(`/track-order/${orderId}`);
        }
      }
    };

    socket.on("cartUpdated", handleCartUpdated);
    socket.on("cartLocked", handleCartLocked);
    socket.on("cartUnlocked", handleCartUnlocked);
    socket.on("cartCheckedOut", handleCartCheckedOut);

    return () => {
      socket.off("cartUpdated", handleCartUpdated);
      socket.off("cartLocked", handleCartLocked);
      socket.off("cartUnlocked", handleCartUnlocked);
      socket.off("cartCheckedOut", handleCartCheckedOut);
    };
  }, [socket, code, navigate]);

  // Handle Join as participant
  const handleJoin = async () => {
    setJoining(true);
    try {
      const res = await axios.post(
        `${serverUrl}/api/group-cart/${code}/join`,
        {},
        { withCredentials: true }
      );
      applyCartPayload(res.data);
    } catch (err) {
      console.error("Join cart error:", err);
      alert(err.response?.data?.message || "Failed to join group cart");
    } finally {
      setJoining(false);
    }
  };

  // Toggle Ready state
  const handleToggleReady = async () => {
    try {
      const res = await axios.post(
        `${serverUrl}/api/group-cart/${code}/ready`,
        {},
        { withCredentials: true }
      );
      applyCartPayload(res.data);
    } catch (err) {
      console.error("Toggle ready error:", err);
    }
  };

  // Host Toggles Lock / Unlock
  const handleToggleLock = async () => {
    setLocking(true);
    try {
      const action = isLocked ? "unlock" : "lock";
      const res = await axios.post(
        `${serverUrl}/api/group-cart/${code}/${action}`,
        {},
        { withCredentials: true }
      );
      applyCartPayload(res.data);
    } catch (err) {
      console.error("Toggle lock error:", err);
      alert(err.response?.data?.message || `Failed to ${isLocked ? "unlock" : "lock"} cart`);
    } finally {
      setLocking(false);
    }
  };

  const currentUserId = userData?._id ? String(userData._id) : null;

  // Resolve host & participant status dynamically for the CURRENT user
  const isHost = Boolean(
    currentUserId && String(cartData?.host?._id || cartData?.host) === currentUserId
  );
  const isParticipant = Boolean(
    currentUserId && (cartData?.participants || []).some(
      (p) => String(p.user?._id || p.user) === currentUserId
    )
  );

  // Current participant data - strictly matches current user's ID
  const myParticipant = (cartData?.participants || []).find(
    (p) => currentUserId && String(p.user?._id || p.user) === currentUserId
  );
  const myItems = myParticipant?.items || [];
  const billData = cartData?.billSplit;

  // Compute counts & readiness
  const myDishesCount = myItems.reduce((sum, it) => sum + (Number(it.quantity) || 0), 0);
  const myDishesSubtotal = myItems.reduce((sum, it) => sum + (Number(it.price) * Number(it.quantity) || 0), 0);

  const totalDishesCount = (cartData?.participants || []).reduce(
    (acc, p) => acc + (p.items || []).reduce((s, it) => s + (Number(it.quantity) || 0), 0),
    0
  );

  const participantsWithDishes = (cartData?.participants || []).filter(
    (p) => (p.items || []).length > 0
  );

  const allReady =
    participantsWithDishes.length > 0 &&
    participantsWithDishes.every((p) => p.ready);

  // Add / Update my items in the shared cart
  const updateMyItemQty = (menuItem, delta) => {
    if (!myParticipant || cartData.status === "locked") return;

    const existingIdx = myItems.findIndex(
      (i) => String(i.item?._id || i.item) === String(menuItem._id)
    );
    let updated = [...myItems];

    if (existingIdx >= 0) {
      const newQty = updated[existingIdx].quantity + delta;
      if (newQty <= 0) {
        updated.splice(existingIdx, 1);
      } else {
        updated[existingIdx] = {
          ...updated[existingIdx],
          quantity: newQty,
        };
      }
    } else if (delta > 0) {
      updated.push({
        item: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        quantity: 1,
        image: menuItem.image,
      });
    }

    // Optimistic local update
    setCartData((prev) => {
      if (!prev) return prev;
      const newParticipants = (prev.participants || []).map((p) =>
        currentUserId && String(p.user?._id || p.user) === currentUserId
          ? { ...p, items: updated }
          : p
      );
      return { ...prev, participants: newParticipants };
    });

    // Debounced sync to server
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }
    debounceTimerRef.current = setTimeout(async () => {
      try {
        const payload = updated.map((i) => ({
          item: i.item?._id || i.item,
          quantity: i.quantity,
        }));
        const res = await axios.put(
          `${serverUrl}/api/group-cart/${code}/items`,
          { items: payload },
          { withCredentials: true }
        );
        if (res.data) {
          applyCartPayload(res.data);
        }
      } catch (err) {
        console.error("Sync items error:", err);
      }
    }, 300);
  };

  const copyShareLink = () => {
    const url = window.location.href;
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const openWhatsApp = () => {
    const shareText = `Join our group food order from ${
      cartData?.shop?.name || "Zatpat"
    }! Code: ${code}\n${window.location.href}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(shareText)}`, "_blank");
  };

  const handleCheckoutSubmit = async () => {
    const lat = location?.lat || userData?.location?.coordinates?.[1] || 20.5937;
    const lon = location?.lon || userData?.location?.coordinates?.[0] || 78.9629;
    const addrText = (deliveryAddressText || address || userData?.address || "Selected Delivery Address").trim();

    if (!addrText) {
      alert("Please enter a valid delivery address.");
      return;
    }

    setCheckingOut(true);
    try {
      const res = await axios.post(
        `${serverUrl}/api/group-cart/${code}/checkout`,
        {
          paymentMethod,
          deliveryAddress: {
            text: addrText,
            latitude: lat,
            longitude: lon,
          },
          openToNeighbors,
        },
        { withCredentials: true }
      );

      if (paymentMethod === "online" && res.data.razorOrder) {
        const options = {
          key: import.meta.env.VITE_RAZORPAY_KEY_ID,
          amount: res.data.razorOrder.amount,
          currency: "INR",
          name: "Zatpat Group Order",
          description: `Group Cart #${code}`,
          order_id: res.data.razorOrder.id,
          handler: async function (response) {
            try {
              await axios.post(
                `${serverUrl}/api/order/verify-payment`,
                {
                  razorpay_payment_id: response.razorpay_payment_id,
                  razorpay_order_id: response.razorpay_order_id,
                  razorpay_signature: response.razorpay_signature,
                  orderId: res.data.orderId,
                },
                { withCredentials: true }
              );
              navigate(`/track-order/${res.data.orderId}`);
            } catch (err) {
              console.error(err);
              alert("Payment verification failed.");
            }
          },
        };
        const rzp = new window.Razorpay(options);
        rzp.open();
      } else {
        const finalOrderId = res.data.order?._id || res.data.orderId || res.data.order;
        if (finalOrderId) {
          navigate(`/track-order/${finalOrderId}`);
        } else {
          navigate("/my-orders");
        }
      }
    } catch (err) {
      console.error("Checkout error:", err);
      alert(err.response?.data?.message || "Failed to checkout group cart");
    } finally {
      setCheckingOut(false);
      setShowCheckoutModal(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fbfaf7] flex flex-col items-center justify-center p-6">
        <div className="w-10 h-10 border-3 border-[#0e5644] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[#52605b] font-medium text-sm">Loading Group Cart #{code}...</p>
      </div>
    );
  }

  if (errorMsg || !cartData) {
    return (
      <div className="min-h-screen bg-[#fbfaf7] flex flex-col items-center justify-center p-6 text-center">
        <p className="text-sm text-[#52605b] mb-4">{errorMsg || "Unable to load group cart."}</p>
        <button
          onClick={() => navigate("/")}
          className="bg-[#0e5644] text-white px-5 py-2.5 rounded-xl font-bold text-xs"
        >
          Return Home
        </button>
      </div>
    );
  }

  const isLocked = cartData.status === "locked";
  const isCheckedOut = cartData.status === "checked_out";

  return (
    <div className="min-h-screen bg-[#fbfaf7] pb-24">
      {/* Top Navbar */}
      <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-md border-b border-[#e8e6df] px-4 sm:px-8 py-3 flex items-center justify-between shadow-2xs">
        <button
          onClick={() => navigate("/")}
          className="flex items-center gap-1.5 text-[#52605b] hover:text-[#18221e] transition font-medium text-xs cursor-pointer"
        >
          <IoIosArrowRoundBack size={24} />
          <span>Exit Cart</span>
        </button>

        <div className="flex items-center gap-2">
          <span className="font-mono text-xs font-bold bg-[#edf7f3] text-[#0e5644] px-3 py-1 rounded-full border border-[#d1e7dc]">
            ROOM: {cartData.code}
          </span>
          <span
            className={`text-[10px] font-bold px-2.5 py-0.5 rounded-full uppercase tracking-wider ${
              isCheckedOut
                ? "bg-purple-100 text-purple-700"
                : isLocked
                ? "bg-amber-100 text-amber-800"
                : "bg-emerald-100 text-emerald-800"
            }`}
          >
            {isCheckedOut ? "Checked Out" : isLocked ? "Locked" : "Open Room"}
          </span>
        </div>
      </header>

      {/* Hero Header */}
      <div className="bg-gradient-to-r from-[#0e5644] via-[#0b4737] to-[#07392d] text-white py-6 px-4 sm:px-8 shadow-sm">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-1.5 bg-white/15 px-3 py-0.5 rounded-full text-xs font-bold tracking-wide mb-1">
              <FaUsers size={12} />
              <span>Real-time Group Order</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold">{cartData.shop?.name}</h1>
            <p className="text-xs text-gray-200 mt-0.5">
              Host: <span className="font-bold text-white">{cartData.host?.fullName}</span> • Up to 10 participants
            </p>
          </div>

          {/* Share Links */}
          <div className="flex items-center gap-2 w-full sm:w-auto">
            <button
              onClick={copyShareLink}
              className="flex-1 sm:flex-initial bg-white/15 hover:bg-white/25 border border-white/20 text-white px-3.5 py-2 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 transition cursor-pointer"
            >
              {copied ? <FaCheck className="text-emerald-300" /> : <FaCopy />}
              <span>{copied ? "Link Copied!" : "Copy Link"}</span>
            </button>
            <button
              onClick={openWhatsApp}
              className="flex-1 sm:flex-initial bg-emerald-600 hover:bg-emerald-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1.5 shadow-xs transition cursor-pointer"
            >
              <FaWhatsapp size={14} />
              <span>Share on WhatsApp</span>
            </button>
          </div>
        </div>
      </div>

      {/* Non-participant join banner */}
      {!isParticipant && !isCheckedOut && (
        <div className="max-w-6xl mx-auto px-4 sm:px-6 mt-6">
          <div className="bg-[#edf7f3] border border-[#d1e7dc] rounded-2xl p-4 flex flex-col sm:flex-row items-center justify-between gap-4 shadow-xs">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-[#0e5644] text-white flex items-center justify-center shrink-0">
                <FaUsers size={18} />
              </div>
              <div>
                <h3 className="font-bold text-[#18221e] text-sm">You are currently viewing as a guest</h3>
                <p className="text-xs text-[#52605b]">
                  Join this collaborative cart to add your dishes and automatically calculate your bill share!
                </p>
              </div>
            </div>
            <button
              onClick={handleJoin}
              disabled={joining || !cartData.canJoin}
              className="w-full sm:w-auto bg-[#0e5644] hover:bg-[#07392d] text-white px-6 py-2.5 rounded-xl font-bold text-xs shadow-xs transition active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {joining ? <ClipLoader size={14} color="white" /> : "Join Group Cart"}
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Left = Menu, Right = Live Group & Split */}
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Shared Menu (Col 7) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Prominent Participant Action & Status Banner */}
          {isParticipant && !isCheckedOut && (
            <>
              {myDishesCount === 0 ? (
                <div className="bg-white border border-[#e8e6df] rounded-2xl p-4 flex items-center gap-3.5 shadow-2xs">
                  <span className="w-8 h-8 rounded-full bg-[#edf7f3] text-[#0e5644] font-bold text-xs flex items-center justify-center shrink-0 border border-[#d1e7dc]">
                    1
                  </span>
                  <div>
                    <p className="font-bold text-xs text-[#18221e]">Step 1: Choose Your Dishes</p>
                    <p className="text-[11px] text-[#55635e]">Browse the dishes below and click (+) to add them to your personal share.</p>
                  </div>
                </div>
              ) : !myParticipant?.ready ? (
                <div className="bg-[#edf7f3] border-2 border-[#0e5644]/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 shadow-sm">
                  <div className="flex items-center gap-3.5">
                    <span className="w-9 h-9 rounded-full bg-[#0e5644] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                      2
                    </span>
                    <div>
                      <p className="font-bold text-sm text-[#18221e]">
                        Done choosing your dishes?
                      </p>
                      <p className="text-xs text-[#52605b] mt-0.5">
                        You selected <span className="font-bold text-[#0e5644]">{myDishesCount} dish(es)</span> (₹{myDishesSubtotal}). Mark yourself as ready so the host can order!
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={handleToggleReady}
                    className="w-full sm:w-auto bg-[#0e5644] hover:bg-[#07392d] text-white px-5 py-2.5 rounded-xl font-bold text-xs shadow-sm transition active:scale-95 flex items-center justify-center gap-2 cursor-pointer shrink-0"
                  >
                    <FaCheck size={12} />
                    <span>I'm Ready — Confirm Share</span>
                  </button>
                </div>
              ) : (
                <div className="bg-emerald-50 border border-emerald-300 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-2xs">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shrink-0">
                      <FaCheck size={12} />
                    </div>
                    <div>
                      <p className="font-bold text-xs text-emerald-950">
                        ✓ You are Marked as Ready ({myDishesCount} dishes · ₹{myDishesSubtotal})
                      </p>
                      <p className="text-[11px] text-emerald-700">
                        All set! Waiting for the host to finalize and place the group order.
                      </p>
                    </div>
                  </div>
                  {!isLocked && (
                    <button
                      onClick={handleToggleReady}
                      className="text-xs font-semibold text-emerald-800 hover:text-emerald-950 underline cursor-pointer"
                    >
                      Need to change? Edit dishes
                    </button>
                  )}
                </div>
              )}
            </>
          )}

          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold text-[#18221e] flex items-center gap-2">
              <FaStore className="text-[#0e5644]" size={16} />
              <span>Restaurant Menu</span>
            </h2>
            <span className="text-xs text-[#83928c]">
              {isLocked ? "Cart is locked (view only)" : "Click + to add dishes to your share"}
            </span>
          </div>

          {menuItems.length === 0 ? (
            <div className="bg-white border border-[#e8e6df] rounded-2xl p-8 text-center text-[#52605b] text-xs">
              <FaStore className="mx-auto text-[#0e5644]/40 mb-2" size={28} />
              <p className="font-semibold text-sm text-[#18221e]">No dishes available</p>
              <p className="text-[#83928c] mt-0.5">Dishes from this restaurant will appear here.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {menuItems.map((item) => {
              const myItem = myItems.find(
                (i) => String(i.item?._id || i.item) === String(item._id)
              );
              const qty = myItem?.quantity || 0;

              return (
                <div
                  key={item._id}
                  className="bg-white border border-[#e8e6df] rounded-2xl p-3 shadow-xs hover:border-[#c9e5da] transition flex flex-col justify-between"
                >
                  <div className="flex gap-3">
                    <img
                      src={item.image}
                      alt={item.name}
                      className="w-18 h-18 object-cover rounded-xl border border-gray-100 shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        {item.foodType === "veg" ? (
                          <div className="w-3 h-3 border border-emerald-600 flex items-center justify-center rounded-xs shrink-0">
                            <div className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                          </div>
                        ) : (
                          <div className="w-3 h-3 border border-rose-700 flex items-center justify-center rounded-xs shrink-0">
                            <div className="w-0 h-0 border-l-[3px] border-l-transparent border-r-[3px] border-r-transparent border-b-[5px] border-b-rose-700" />
                          </div>
                        )}
                        <h4 className="font-semibold text-[#18221e] text-xs truncate">{item.name}</h4>
                      </div>
                      <p className="text-[11px] text-[#83928c] mt-0.5 line-clamp-1">{item.description}</p>
                      <p className="text-xs font-bold text-[#0e5644] mt-1.5">₹{item.price}</p>
                    </div>
                  </div>

                  {/* Quantity selector for current user */}
                  {isParticipant && !isLocked && !isCheckedOut ? (
                    <div className="flex items-center justify-between border-t border-gray-100 pt-2 mt-2.5">
                      <span className="text-[11px] font-medium text-[#52605b]">Your share:</span>
                      <div className="flex items-center border border-[#e8e6df] rounded-lg overflow-hidden bg-gray-50/70 text-xs font-semibold">
                        <button
                          onClick={() => updateMyItemQty(item, -1)}
                          disabled={qty === 0}
                          className="px-2 py-1 text-gray-600 hover:bg-gray-200/80 disabled:opacity-30 cursor-pointer"
                        >
                          <FaMinus size={8} />
                        </button>
                        <span className="px-2 font-mono font-bold text-xs text-[#18221e]">{qty}</span>
                        <button
                          onClick={() => updateMyItemQty(item, 1)}
                          className="px-2 py-1 text-[#0e5644] hover:bg-[#edf7f3] font-bold cursor-pointer"
                        >
                          <FaPlus size={8} />
                        </button>
                      </div>
                    </div>
                  ) : (
                    <div className="border-t border-gray-100 pt-2 mt-2 text-right">
                      {qty > 0 && (
                        <span className="text-xs text-[#0e5644] font-bold">In your share: {qty}</span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
          )}
        </div>

        {/* Right Column: Participants List & Split Bill (Col 5) */}
        <div className="lg:col-span-5 space-y-4">
          {/* Participants Card */}
          <div className="bg-white rounded-2xl border border-[#e8e6df] shadow-xs p-4 sm:p-5 space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-[#18221e] text-sm flex items-center gap-2">
                <FaUsers className="text-[#0e5644]" size={15} />
                <span>Participants ({cartData.participants?.length || 1}/10)</span>
              </h3>

              {isParticipant && !isLocked && !isCheckedOut && (
                <button
                  onClick={handleToggleReady}
                  className={`text-xs font-bold px-3 py-1 rounded-xl transition flex items-center gap-1.5 cursor-pointer ${
                    myParticipant?.ready
                      ? "bg-[#edf7f3] text-[#0e5644] border border-[#d1e7dc]"
                      : "bg-gray-100 text-[#52605b] hover:bg-gray-200"
                  }`}
                >
                  <FaCheck size={10} />
                  <span>{myParticipant?.ready ? "I'm Ready" : "Mark Ready"}</span>
                </button>
              )}
            </div>

            {/* Participants Items list */}
            <div className="space-y-2.5 max-h-[360px] overflow-y-auto pr-1">
              {cartData.participants?.map((p, pIdx) => {
                const isSelf = Boolean(
                  currentUserId && String(p.user?._id || p.user) === currentUserId
                );
                const pSubtotal = (p.items || []).reduce(
                  (sum, it) => sum + it.price * it.quantity,
                  0
                );

                return (
                  <div
                    key={pIdx}
                    className={`p-3 rounded-xl border transition ${
                      isSelf
                        ? "border-[#d1e7dc] bg-[#edf7f3]/40"
                        : "border-gray-100 bg-gray-50/50"
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="w-6 h-6 rounded-full bg-[#edf7f3] text-[#0e5644] border border-[#d1e7dc] flex items-center justify-center font-bold text-[10px] uppercase">
                          {p.name?.slice(0, 1)}
                        </span>
                        <span className="font-bold text-xs text-[#18221e]">
                          {p.name} {isSelf && "(You)"}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span
                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                            p.ready
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-800"
                          }`}
                        >
                          {p.ready ? "Ready" : "Deciding"}
                        </span>
                        <span className="font-mono font-bold text-xs text-[#18221e]">
                          ₹{pSubtotal}
                        </span>
                      </div>
                    </div>

                    {/* Participant items breakdown */}
                    {p.items?.length > 0 ? (
                      <div className="mt-2 text-[11px] text-[#52605b] space-y-0.5 pl-8">
                        {p.items.map((it, itIdx) => (
                          <div key={itIdx} className="flex justify-between">
                            <span>
                              {it.name} × {it.quantity}
                            </span>
                            <span className="font-medium text-[#18221e]">₹{it.price * it.quantity}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400 italic pl-8 mt-1">No dishes added yet</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* Split Bill Card */}
          {billData && (
            <div className="bg-white rounded-2xl border border-[#e8e6df] shadow-xs p-4 sm:p-5 space-y-3">
              <h3 className="font-bold text-[#18221e] text-sm">💰 Live Bill Split</h3>

              <div className="space-y-1 text-xs text-[#52605b]">
                <div className="flex justify-between">
                  <span>Items Subtotal:</span>
                  <span className="font-semibold text-[#18221e]">₹{billData.itemsTotal}</span>
                </div>
                <div className="flex justify-between">
                  <span>Delivery Fee:</span>
                  <span className="font-semibold text-[#18221e]">
                    {billData.deliveryFee === 0 ? "Free" : `₹${billData.deliveryFee}`}
                  </span>
                </div>
                <div className="flex justify-between text-base font-extrabold text-[#0e5644] pt-2 border-t border-gray-100">
                  <span>Group Total:</span>
                  <span>₹{billData.total}</span>
                </div>
              </div>

              {/* Per-participant shares */}
              <div className="mt-3 pt-3 border-t border-gray-100 space-y-1.5">
                <p className="text-[10px] font-bold uppercase tracking-wider text-[#83928c]">
                  Fair Share Allocation (Dishes + Equal Delivery Split):
                </p>
                {billData.shares?.map((share, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between text-xs p-2 rounded-lg bg-gray-50/80"
                  >
                    <span className="font-medium text-[#18221e]">{share.name}:</span>
                    <span className="font-mono font-bold text-[#0e5644]">₹{share.total}</span>
                  </div>
                ))}
              </div>

              <p className="text-[10px] text-[#83928c] italic pt-1">
                * Remainder rupees allocated deterministically to ensure exact sum match.
              </p>
            </div>
          )}

          {/* Host Action Controls */}
          {isHost && !isCheckedOut && (
            <div className="bg-white rounded-2xl border border-[#d1e7dc] p-4 sm:p-5 shadow-xs space-y-3.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#18221e]">Host Controls:</span>
                <button
                  onClick={handleToggleLock}
                  disabled={locking}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl border flex items-center gap-1.5 transition cursor-pointer ${
                    isLocked
                      ? "bg-amber-50 text-amber-900 border-amber-300 hover:bg-amber-100"
                      : "bg-gray-100 text-[#52605b] border-gray-200 hover:bg-gray-200"
                  }`}
                >
                  {locking ? (
                    <ClipLoader size={12} color="#0e5644" />
                  ) : isLocked ? (
                    <>
                      <FaLockOpen className="text-amber-700" size={13} />
                      <span>Unlock Cart (Allow Editing)</span>
                    </>
                  ) : (
                    <>
                      <FaLock className="text-gray-500" size={13} />
                      <span>Lock Cart (Freeze Items)</span>
                    </>
                  )}
                </button>
              </div>

              {/* Readiness status for host */}
              {allReady && totalDishesCount > 0 ? (
                <div className="bg-emerald-50 border border-emerald-300 rounded-xl p-3 flex items-center gap-2.5 text-xs text-emerald-950">
                  <span className="text-base">🎉</span>
                  <div>
                    <p className="font-bold">All participants are Ready!</p>
                    <p className="text-[11px] text-emerald-700">All members confirmed their shares. You can proceed to checkout.</p>
                  </div>
                </div>
              ) : participantsWithDishes.length > 0 ? (
                <div className="bg-gray-50 border border-gray-100 rounded-xl p-2.5 text-xs text-[#52605b] flex items-center justify-between">
                  <span>Participants Ready:</span>
                  <span className="font-bold text-[#18221e]">
                    {participantsWithDishes.filter(p => p.ready).length} of {participantsWithDishes.length} ready
                  </span>
                </div>
              ) : null}

              <button
                onClick={() => setShowCheckoutModal(true)}
                disabled={totalDishesCount === 0 || checkingOut}
                className="w-full bg-[#0e5644] hover:bg-[#07392d] text-white py-3.5 rounded-xl font-bold text-xs shadow-md transition active:scale-98 disabled:opacity-50 cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Proceed to Checkout</span>
                <span>(₹{billData?.total || 0})</span>
              </button>
              {totalDishesCount === 0 && (
                <p className="text-[11px] text-gray-400 text-center">Add at least 1 dish to enable checkout</p>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Host Checkout Modal */}
      {showCheckoutModal && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-[#e8e6df]">
            <h3 className="text-lg font-bold text-[#18221e]">Complete Group Order</h3>
            <p className="text-xs text-[#52605b]">
              As host, you place the master order. Participants repay their allocated share.
            </p>

            {/* Delivery address */}
            <div>
              <label className="text-xs font-bold text-[#18221e] block mb-1">Delivery Address</label>
              <input
                type="text"
                value={deliveryAddressText}
                onChange={(e) => setDeliveryAddressText(e.target.value)}
                placeholder="Enter complete delivery address..."
                className="w-full border border-[#e8e6df] rounded-xl px-3 py-2 text-xs text-[#18221e] focus:outline-none focus:border-[#0e5644] focus:ring-2 focus:ring-[#0e5644]/15"
              />
            </div>

            {/* Payment method */}
            <div>
              <label className="text-xs font-bold text-[#18221e] block mb-1">Payment Method</label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setPaymentMethod("cod")}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-center transition cursor-pointer ${
                    paymentMethod === "cod"
                      ? "border-[#0e5644] bg-[#edf7f3] text-[#0e5644]"
                      : "border-[#e8e6df] text-gray-600"
                  }`}
                >
                  Cash On Delivery
                </button>
                <button
                  type="button"
                  onClick={() => setPaymentMethod("online")}
                  className={`p-2.5 rounded-xl border text-xs font-bold text-center transition cursor-pointer ${
                    paymentMethod === "online"
                      ? "border-[#0e5644] bg-[#edf7f3] text-[#0e5644]"
                      : "border-[#e8e6df] text-gray-600"
                  }`}
                >
                  UPI / Online (Card)
                </button>
              </div>
            </div>

            {/* Open to neighbors toggle */}
            <div className="bg-[#edf7f3]/60 border border-[#d1e7dc] rounded-xl p-3 flex items-center justify-between gap-3">
              <div>
                <p className="text-xs font-bold text-[#18221e]">Open to Neighbor Batch?</p>
                <p className="text-[11px] text-[#52605b]">Also pool with nearby neighbors (300m) for discounts</p>
              </div>
              <input
                type="checkbox"
                checked={openToNeighbors}
                onChange={(e) => setOpenToNeighbors(e.target.checked)}
                className="w-4 h-4 accent-[#0e5644] cursor-pointer"
              />
            </div>

            <div className="pt-2 flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowCheckoutModal(false)}
                className="flex-1 py-2.5 rounded-xl border border-[#e8e6df] text-[#52605b] text-xs font-bold hover:bg-gray-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleCheckoutSubmit}
                disabled={checkingOut}
                className="flex-1 py-2.5 rounded-xl bg-[#0e5644] hover:bg-[#07392d] text-white text-xs font-bold shadow-xs active:scale-95 disabled:opacity-50 cursor-pointer"
              >
                {checkingOut ? <ClipLoader size={14} color="white" /> : "Confirm & Order"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
