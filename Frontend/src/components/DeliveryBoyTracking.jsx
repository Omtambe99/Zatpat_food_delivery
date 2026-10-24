import React, { useEffect, useState } from 'react'
import scooter from "../assets/scooter.png"
import home from "../assets/home.png"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet'

const deliveryBoyIcon = new L.Icon({
  iconUrl: scooter,
  iconSize: [40, 40],
  iconAnchor: [20, 40]
})

const customerIcon = new L.Icon({
  iconUrl: home,
  iconSize: [40, 40],
  iconAnchor: [20, 40]
})

const createStopIcon = (num) => {
  return L.divIcon({
    className: "custom-stop-marker",
    html: `<div style="background-color: #0e5644; color: #ffffff; border-radius: 50%; width: 28px; height: 28px; display: flex; align-items: center; justify-content: center; font-weight: 700; font-size: 13px; border: 2.5px solid #ffffff; box-shadow: 0 4px 10px rgba(14,86,68,0.35); font-family: 'Plus Jakarta Sans', sans-serif;">${num}</div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14]
  })
}

function DeliveryBoyTracking({ data }) {
  const deliveryBoyLat = data?.deliveryBoyLocation?.lat
  const deliveryBoyLon = data?.deliveryBoyLocation?.lon
  const customerLat = data?.customerLocation?.lat
  const customerLon = data?.customerLocation?.lon
  const stops = data?.stops || []

  const [routePath, setRoutePath] = useState([])

  useEffect(() => {
    if (!deliveryBoyLat || !deliveryBoyLon) return
    let isMounted = true

    // Check if we have multi-stop data
    const activeStops = stops.filter(
      (s) => s.status !== "delivered" && (s.customerLocation?.lat || s.deliveryAddress?.latitude)
    )

    let waypoints = []
    if (activeStops.length > 0) {
      waypoints = [
        `${deliveryBoyLon},${deliveryBoyLat}`,
        ...activeStops.map((s) => {
          const lon = s.customerLocation?.lon || s.deliveryAddress?.longitude
          const lat = s.customerLocation?.lat || s.deliveryAddress?.latitude
          return `${lon},${lat}`
        })
      ]
    } else if (customerLat && customerLon) {
      waypoints = [`${deliveryBoyLon},${deliveryBoyLat}`, `${customerLon},${customerLat}`]
    }

    if (waypoints.length < 2) {
      setRoutePath([[deliveryBoyLat, deliveryBoyLon]])
      return
    }

    const fetchRoute = async () => {
      try {
        const query = waypoints.join(";")
        const response = await fetch(
          `https://router.project-osrm.org/route/v1/driving/${query}?overview=full&geometries=geojson`
        )

        if (!response.ok) {
          throw new Error(`OSRM failed: ${response.status}`)
        }

        const result = await response.json()
        const coordinates = result?.routes?.[0]?.geometry?.coordinates

        if (!Array.isArray(coordinates) || coordinates.length === 0) {
          throw new Error('No route geometry received')
        }

        if (isMounted) {
          setRoutePath(coordinates.map(([lon, lat]) => [lat, lon]))
        }
      } catch (error) {
        // Fallback straight lines
        if (isMounted) {
          if (activeStops.length > 0) {
            setRoutePath([
              [deliveryBoyLat, deliveryBoyLon],
              ...activeStops.map((s) => [
                s.customerLocation?.lat || s.deliveryAddress?.latitude,
                s.customerLocation?.lon || s.deliveryAddress?.longitude
              ])
            ])
          } else {
            setRoutePath([
              [deliveryBoyLat, deliveryBoyLon],
              [customerLat, customerLon]
            ])
          }
        }
        console.error('Route fetch error:', error)
      }
    }

    fetchRoute()

    return () => {
      isMounted = false
    }
  }, [deliveryBoyLat, deliveryBoyLon, customerLat, customerLon, stops])

  if (!deliveryBoyLat || !deliveryBoyLon) {
    return (
      <div className="w-full h-[300px] flex items-center justify-center bg-[#f4f3ef] rounded-2xl border border-[#e8e6df] text-[#55635e] text-sm font-medium">
        Waiting for GPS coordinates...
      </div>
    )
  }

  const center = [deliveryBoyLat, deliveryBoyLon]
  const activeStops = stops.filter(s => s.status !== "delivered")

  return (
    <div className='w-full h-[400px] mt-3 rounded-2xl overflow-hidden shadow-sm border border-[#e8e6df]'>
      <MapContainer
        className="w-full h-full"
        center={center}
        zoom={15}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        {/* Delivery Partner Scooter Marker */}
        <Marker position={[deliveryBoyLat, deliveryBoyLon]} icon={deliveryBoyIcon}>
          <Popup>Delivery Partner</Popup>
        </Marker>

        {/* Multi-Stop Markers */}
        {activeStops.length > 0 ? (
          activeStops.map((stop, idx) => {
            const sLat = stop.customerLocation?.lat || stop.deliveryAddress?.latitude
            const sLon = stop.customerLocation?.lon || stop.deliveryAddress?.longitude
            if (!sLat || !sLon) return null
            return (
              <Marker
                key={idx}
                position={[sLat, sLon]}
                icon={createStopIcon(stop.sequence || idx + 1)}
              >
                <Popup>
                  <div className="text-xs p-1">
                    <p className="font-bold text-[#0e5644]">Stop #{stop.sequence || idx + 1}</p>
                    <p className="font-semibold text-[#18221e] mt-0.5">{stop.user?.name || "Customer"}</p>
                    <p className="text-[#55635e] text-[11px] mt-0.5">{stop.deliveryAddress?.text}</p>
                    {stop.amountToCollect > 0 ? (
                      <p className="text-amber-800 font-bold mt-1 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200 inline-block">
                        Collect COD: ₹{stop.amountToCollect}
                      </p>
                    ) : (
                      <p className="text-[#0e5644] font-semibold mt-1 bg-[#edf7f3] px-1.5 py-0.5 rounded border border-[#d1e7dc] inline-block">
                        Paid Online
                      </p>
                    )}
                  </div>
                </Popup>
              </Marker>
            )
          })
        ) : (
          customerLat && customerLon && (
            <Marker position={[customerLat, customerLon]} icon={customerIcon}>
              <Popup>Customer Location</Popup>
            </Marker>
          )
        )}

        {/* Route Polyline */}
        {routePath.length > 0 && (
          <Polyline positions={routePath} color='#0e5644' weight={4.5} opacity={0.85} />
        )}
      </MapContainer>
    </div>
  )
}

export default DeliveryBoyTracking
