import React, { useEffect, useState } from 'react'
import Nav from './Nav'
import { useSelector } from 'react-redux'
import axios from 'axios'
import { serverUrl } from '../App'
import DeliveryBoyTracking from './DeliveryBoyTracking'
import { ClipLoader } from 'react-spinners'
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts'
import { MdDeliveryDining, MdPhone, MdLocationOn, MdCheckCircle } from 'react-icons/md'
import { FaUsers, FaArrowRight, FaMoneyBillWave } from 'react-icons/fa'

function DeliveryBoy() {
  const { userData, socket } = useSelector(state => state.user)
  const [currentOrder, setCurrentOrder] = useState(null)
  const [showOtpBox, setShowOtpBox] = useState(false)
  const [availableAssignments, setAvailableAssignments] = useState([])
  const [otp, setOtp] = useState("")
  const [todayDeliveries, setTodayDeliveries] = useState([])
  const [deliveryBoyLocation, setDeliveryBoyLocation] = useState(null)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState("")
  const [activeStopIndex, setActiveStopIndex] = useState(0)

  useEffect(() => {
    if (!socket || userData.role !== "deliveryBoy") return
    let watchId
    if (navigator.geolocation) {
      watchId = navigator.geolocation.watchPosition(
        (position) => {
          const latitude = position.coords.latitude
          const longitude = position.coords.longitude
          setDeliveryBoyLocation({ lat: latitude, lon: longitude })
          socket.emit('updateLocation', {
            latitude,
            longitude,
            userId: userData._id
          })
        },
        (error) => {
          console.log(error)
        },
        {
          enableHighAccuracy: true
        }
      )
    }

    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId)
    }
  }, [socket, userData])

  const ratePerDelivery = 50
  const totalEarning = todayDeliveries.reduce((sum, d) => sum + d.count * ratePerDelivery, 0)

  const getAssignments = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/order/get-assignments`, { withCredentials: true })
      setAvailableAssignments(result.data || [])
    } catch (error) {
      console.log(error)
    }
  }

  const getCurrentOrder = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/order/get-current-order`, { withCredentials: true })
      setCurrentOrder(result.data)
      if (result.data?.currentStopIndex != null) {
        setActiveStopIndex(result.data.currentStopIndex)
      }
    } catch (error) {
      setCurrentOrder(null)
    }
  }

  const acceptOrder = async (assignmentId) => {
    try {
      await axios.get(`${serverUrl}/api/order/accept-order/${assignmentId}`, { withCredentials: true })
      await getCurrentOrder()
      await getAssignments()
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    if (!socket) return
    const handleNewAssignment = (data) => {
      setAvailableAssignments(prev => [...(prev || []), data])
    }
    socket.on('newAssignment', handleNewAssignment)
    return () => {
      socket.off('newAssignment', handleNewAssignment)
    }
  }, [socket])

  // Multi-stop active target resolution
  const stops = currentOrder?.stops || []
  const activeStop = currentOrder?.currentStop || stops[activeStopIndex] || stops.find(s => s.status === "pending") || stops[0]

  const sendOtp = async () => {
    if (!activeStop) return
    setLoading(true)
    setMessage("")
    try {
      const targetOrderId = activeStop.order?._id || activeStop.order || currentOrder._id
      const targetShopOrderId = activeStop.shopOrderId || currentOrder.shopOrder?._id

      const result = await axios.post(
        `${serverUrl}/api/order/send-delivery-otp`,
        { orderId: targetOrderId, shopOrderId: targetShopOrderId },
        { withCredentials: true }
      )
      setLoading(false)
      setShowOtpBox(true)
      console.log(result.data)
    } catch (error) {
      console.log(error)
      setLoading(false)
      setMessage(error.response?.data?.message || "Failed to send delivery OTP.")
    }
  }

  const verifyOtp = async () => {
    if (!activeStop) return
    setMessage("")
    setLoading(true)
    try {
      const targetOrderId = activeStop.order?._id || activeStop.order || currentOrder._id
      const targetShopOrderId = activeStop.shopOrderId || currentOrder.shopOrder?._id

      const result = await axios.post(
        `${serverUrl}/api/order/verify-delivery-otp`,
        { orderId: targetOrderId, shopOrderId: targetShopOrderId, otp },
        { withCredentials: true }
      )
      setLoading(false)
      setMessage(result.data.message || "Stop delivered successfully!")
      setShowOtpBox(false)
      setOtp("")
      // Re-fetch current order state
      await getCurrentOrder()
      await handleTodayDeliveries()
    } catch (error) {
      console.log(error)
      setLoading(false)
      setMessage(error.response?.data?.message || "Invalid OTP. Please try again.")
    }
  }

  const handleTodayDeliveries = async () => {
    try {
      const result = await axios.get(`${serverUrl}/api/order/get-today-deliveries`, { withCredentials: true })
      setTodayDeliveries(result.data || [])
    } catch (error) {
      console.log(error)
    }
  }

  useEffect(() => {
    getAssignments()
    getCurrentOrder()
    handleTodayDeliveries()
  }, [userData])

  return (
    <div className='w-full min-h-screen flex flex-col gap-5 items-center bg-[#fbfaf7] overflow-y-auto pb-16 font-sans text-[#18221e]'>
      <Nav />
      <div className='w-full max-w-[800px] flex flex-col gap-5 items-center px-4'>
        {/* Welcome card */}
        <div className='bg-white rounded-2xl shadow-sm p-6 flex flex-col justify-start items-center w-full border border-[#e8e6df] text-center gap-2'>
          <div className="w-12 h-12 rounded-full bg-[#edf7f3] flex items-center justify-center text-[#0e5644] mb-1">
            <MdDeliveryDining size={28} />
          </div>
          <h1 className='text-2xl font-bold text-[#18221e]'>Welcome, {userData?.fullName}</h1>
          <div className='flex items-center gap-2 text-xs font-mono bg-[#edf7f3] text-[#0e5644] border border-[#d1e7dc] rounded-full px-3.5 py-1 mt-1'>
            <span className="w-2 h-2 rounded-full bg-[#0e5644] animate-pulse"></span>
            <span>GPS: {deliveryBoyLocation?.lat?.toFixed(4) || "Searching..."}, {deliveryBoyLocation?.lon?.toFixed(4) || "Searching..."}</span>
          </div>
        </div>

        {/* Earning Chart */}
        <div className='bg-white rounded-2xl shadow-sm p-6 w-full border border-[#e8e6df]'>
          <h2 className='text-lg font-bold mb-4 text-[#18221e]'>Today's Deliveries & Activity</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={todayDeliveries}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f0eee6" />
              <XAxis dataKey="hour" tickFormatter={(h) => `${h}:00`} tick={{ fill: '#8a928c', fontSize: 12 }} />
              <YAxis allowDecimals={false} tick={{ fill: '#8a928c', fontSize: 12 }} />
              <Tooltip
                contentStyle={{ backgroundColor: '#ffffff', borderColor: '#e8e6df', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.06)' }}
                formatter={(value) => [value, "deliveries"]}
                labelFormatter={label => `${label}:00`}
              />
              <Bar dataKey="count" fill='#0e5644' radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>

          <div className='max-w-xs mx-auto mt-5 p-4 bg-[#edf7f3] border border-[#d1e7dc] rounded-2xl text-center'>
            <h3 className='text-xs font-semibold text-[#55635e] uppercase tracking-wider mb-1'>Today's Earnings</h3>
            <span className='text-3xl font-extrabold text-[#0e5644]'>₹{totalEarning}</span>
          </div>
        </div>

        {/* Available Assignments list */}
        {!currentOrder && (
          <div className='bg-white rounded-2xl p-6 shadow-sm w-full border border-[#e8e6df]'>
            <h2 className='text-lg font-bold mb-4 flex items-center gap-2 text-[#18221e]'>
              <MdDeliveryDining className="text-[#0e5644]" size={24} />
              <span>Available Assignments</span>
            </h2>

            <div className='space-y-3.5'>
              {availableAssignments?.length > 0 ? (
                availableAssignments.map((a, index) => {
                  const isMultiStop = a.stopCount > 1
                  return (
                    <div
                      key={index}
                      className='border border-[#e8e6df] hover:border-[#0e5644]/40 rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 transition-all bg-white hover:bg-[#fbfaf7]'
                    >
                      <div className="space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className='font-bold text-[#18221e]'>{a?.shopName}</p>
                          {isMultiStop ? (
                            <span className="bg-[#edf7f3] text-[#0e5644] border border-[#d1e7dc] text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                              <FaUsers size={11} />
                              <span>Multi-stop Batch ({a.stopCount} stops)</span>
                            </span>
                          ) : (
                            <span className="bg-[#f4f3ef] text-[#55635e] text-xs font-medium px-2.5 py-0.5 rounded-full">
                              Single Order
                            </span>
                          )}
                        </div>

                        {/* Stops summary */}
                        {isMultiStop && a.stops ? (
                          <div className="text-xs text-[#55635e] space-y-0.5">
                            {a.stops.map((s, idx) => (
                              <p key={idx} className="truncate max-w-sm">
                                <span className="font-semibold text-[#18221e]">Stop #{s.sequence}:</span> {s.deliveryAddress?.text}
                              </p>
                            ))}
                          </div>
                        ) : (
                          <p className='text-xs text-[#55635e]'>
                            <span className='font-semibold text-[#18221e]'>Delivery:</span> {a?.deliveryAddress?.text}
                          </p>
                        )}

                        <div className="flex items-center gap-3 pt-1">
                          <span className="text-xs font-bold text-[#0e5644] flex items-center gap-1.5">
                            <FaMoneyBillWave />
                            <span>Estimated Payout: ₹{a.estimatedPayout || 50}</span>
                          </span>
                          <span className="text-xs text-[#8a928c]">
                            {a.items?.length || 0} items | ₹{a.subtotal}
                          </span>
                        </div>
                      </div>

                      <button
                        className='bg-[#0e5644] hover:bg-[#07392d] text-white px-5 py-2.5 rounded-xl text-sm font-semibold shadow-sm active:scale-95 transition-all self-end sm:self-auto shrink-0'
                        onClick={() => acceptOrder(a.assignmentId)}
                      >
                        Accept Assignment
                      </button>
                    </div>
                  )
                })
              ) : (
                <p className='text-[#8a928c] text-sm text-center py-8'>No available orders right now. New requests will appear live.</p>
              )}
            </div>
          </div>
        )}

        {/* Current Active Assignment */}
        {currentOrder && (
          <div className='bg-white rounded-2xl p-6 shadow-sm w-full border border-[#e8e6df] space-y-4'>
            <div className="flex items-center justify-between border-b border-[#e8e6df] pb-3.5">
              <h2 className='text-lg font-bold text-[#18221e] flex items-center gap-2'>
                <span>Active Delivery Assignment</span>
                {currentOrder.isBatch && (
                  <span className="text-xs bg-[#edf7f3] text-[#0e5644] border border-[#d1e7dc] font-bold px-2.5 py-0.5 rounded-full">
                    Batch ({stops.length} stops)
                  </span>
                )}
              </h2>
              <span className="text-xs font-bold text-[#0e5644] bg-[#edf7f3] px-3 py-1 rounded-full border border-[#d1e7dc]">
                In Progress
              </span>
            </div>

            {/* Restaurant header */}
            <div className='border border-[#e8e6df] rounded-xl p-4 bg-[#fbfaf7]'>
              <p className='font-bold text-[#18221e]'>{currentOrder?.shop?.name || currentOrder?.shopOrder?.shop?.name}</p>
              <p className='text-xs text-[#55635e] mt-0.5'>{currentOrder?.shop?.address}</p>
            </div>

            {/* Multi-Stop Sequence Accordion/List */}
            {stops.length > 0 && (
              <div className="space-y-2.5">
                <h3 className="text-xs font-bold uppercase tracking-wider text-[#55635e]">
                  Stops Sequence (Deliver in Order)
                </h3>
                {stops.map((stop, idx) => {
                  const isCurrent = activeStop?.sequence === stop.sequence
                  const isDelivered = stop.status === "delivered"
                  return (
                    <div
                      key={idx}
                      className={`p-4 rounded-xl border transition-all ${
                        isCurrent
                          ? "border-[#0e5644] bg-[#edf7f3] shadow-sm ring-1 ring-[#0e5644]/20"
                          : isDelivered
                          ? "border-[#e8e6df] bg-[#fbfaf7] opacity-70"
                          : "border-[#e8e6df] bg-white"
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              isDelivered
                                ? "bg-emerald-600 text-white"
                                : isCurrent
                                ? "bg-[#0e5644] text-white"
                                : "bg-gray-200 text-gray-600"
                            }`}
                          >
                            {isDelivered ? "✓" : stop.sequence || idx + 1}
                          </span>
                          <span className="font-bold text-sm text-[#18221e]">
                            Stop #{stop.sequence || idx + 1}: {stop.user?.name || "Customer"}
                          </span>
                        </div>

                        <span
                          className={`text-xs font-semibold px-2.5 py-0.5 rounded-full capitalize ${
                            isDelivered
                              ? "bg-emerald-100 text-emerald-800"
                              : isCurrent
                              ? "bg-[#0e5644] text-white"
                              : "bg-gray-100 text-gray-600"
                          }`}
                        >
                          {isDelivered ? "Delivered" : isCurrent ? "Active Target" : "Pending"}
                        </span>
                      </div>

                      <div className="mt-2.5 text-xs text-[#55635e] space-y-1 pl-8">
                        <p className="flex items-center gap-1.5">
                          <MdLocationOn className="text-[#0e5644] shrink-0" size={15} />
                          <span>{stop.deliveryAddress?.text}</span>
                        </p>
                        <p className="flex items-center gap-1.5 font-medium text-[#18221e]">
                          <MdPhone className="text-[#8a928c] shrink-0" size={14} />
                          <span>{stop.user?.mobile}</span>
                        </p>
                        <div className="pt-1">
                          {stop.amountToCollect > 0 ? (
                            <span className="inline-block bg-amber-50 text-amber-800 border border-amber-200 font-bold px-2 py-0.5 rounded text-[11px]">
                              Collect COD: ₹{stop.amountToCollect}
                            </span>
                          ) : (
                            <span className="inline-block bg-[#edf7f3] text-[#0e5644] border border-[#d1e7dc] font-semibold px-2 py-0.5 rounded text-[11px]">
                              Paid Online (₹0 to collect)
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Live Map Tracking */}
            <DeliveryBoyTracking
              data={{
                deliveryBoyLocation: deliveryBoyLocation || {
                  lat: userData.location?.coordinates?.[1],
                  lon: userData.location?.coordinates?.[0]
                },
                customerLocation: {
                  lat: activeStop?.deliveryAddress?.latitude || currentOrder.deliveryAddress?.latitude,
                  lon: activeStop?.deliveryAddress?.longitude || currentOrder.deliveryAddress?.longitude
                },
                stops: stops
              }}
            />

            {/* Stop Action: Send OTP & Verify OTP */}
            {activeStop && activeStop.status !== "delivered" && (
              <div className="pt-2">
                {!showOtpBox ? (
                  <button
                    className='w-full bg-[#0e5644] hover:bg-[#07392d] text-white font-bold py-3.5 px-4 rounded-xl shadow-sm active:scale-98 transition flex items-center justify-center gap-2'
                    onClick={sendOtp}
                    disabled={loading}
                  >
                    {loading ? (
                      <ClipLoader size={20} color='white' />
                    ) : (
                      <>
                        <span>Mark Stop #{activeStop.sequence} Delivered</span>
                        <FaArrowRight size={14} />
                      </>
                    )}
                  </button>
                ) : (
                  <div className='p-5 border border-[#d1e7dc] rounded-2xl bg-[#edf7f3] space-y-3.5'>
                    <div className="flex items-center justify-between">
                      <p className='text-xs font-bold text-[#18221e]'>
                        Enter 4-digit Delivery OTP sent to{" "}
                        <span className='text-[#0e5644] font-bold'>{activeStop.user?.name}</span>
                      </p>
                      <button
                        onClick={() => setShowOtpBox(false)}
                        className="text-xs text-[#55635e] hover:text-[#18221e] underline"
                      >
                        Cancel
                      </button>
                    </div>

                    <input
                      type="text"
                      maxLength={6}
                      className='w-full border border-[#d1e7dc] px-3.5 py-3 rounded-xl font-mono text-center text-lg tracking-widest focus:outline-none focus:ring-2 focus:ring-[#0e5644] bg-white'
                      placeholder='Enter OTP'
                      onChange={(e) => setOtp(e.target.value)}
                      value={otp}
                    />

                    {message && (
                      <p className='text-center text-xs font-semibold text-red-600'>{message}</p>
                    )}

                    <button
                      className="w-full bg-[#0e5644] hover:bg-[#07392d] text-white py-3 rounded-xl font-bold shadow-sm transition active:scale-98 disabled:opacity-50"
                      onClick={verifyOtp}
                      disabled={loading || !otp}
                    >
                      {loading ? <ClipLoader size={18} color="white" /> : "Verify OTP & Complete Stop"}
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  )
}

export default DeliveryBoy
