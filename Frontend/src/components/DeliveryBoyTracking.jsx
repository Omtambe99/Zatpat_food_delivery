import React from 'react'
import scooter from "../assets/scooter.png"
import home from "../assets/home.png"
import "leaflet/dist/leaflet.css"
import L from "leaflet"
import { MapContainer, Marker, Polyline, Popup, TileLayer } from 'react-leaflet'
import { useEffect, useState } from 'react'
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
function DeliveryBoyTracking({ data }) {

    const deliveryBoyLat = data.deliveryBoyLocation.lat
    const deliveryBoylon = data.deliveryBoyLocation.lon
    const customerLat = data.customerLocation.lat
    const customerlon = data.customerLocation.lon

    const [routePath, setRoutePath] = useState([
        [deliveryBoyLat, deliveryBoylon],
        [customerLat, customerlon],
    ])

    useEffect(() => {
        let isMounted = true

        // Fetch road-following geometry from OSRM and map it to Leaflet lat/lon pairs.
        const fetchRoute = async () => {
            try {
                const response = await fetch(
                    `https://router.project-osrm.org/route/v1/driving/${deliveryBoylon},${deliveryBoyLat};${customerlon},${customerLat}?overview=full&geometries=geojson`,
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
                // Keep a direct fallback line so map still renders even if routing API fails.
                if (isMounted) {
                    setRoutePath([
                        [deliveryBoyLat, deliveryBoylon],
                        [customerLat, customerlon],
                    ])
                }
                console.error('Route fetch error:', error)
            }
        }

        fetchRoute()

        return () => {
            isMounted = false
        }
    }, [deliveryBoyLat, deliveryBoylon, customerLat, customerlon])

    const center = [deliveryBoyLat, deliveryBoylon]

    return (
        <div className='w-full h-[400px] mt-3 rounded-xl overflow-hidden shadow-md'>
            <MapContainer
                className={"w-full h-full"}
                center={center}
                zoom={16}
            >
                <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
             <Marker position={[deliveryBoyLat,deliveryBoylon]} icon={deliveryBoyIcon}>
             <Popup>Delivery Boy</Popup>
             </Marker>
              <Marker position={[customerLat,customerlon]} icon={customerIcon}>
             <Popup>Delivery Boy</Popup>
             </Marker>


<Polyline positions={routePath} color='blue' weight={4}/>

            </MapContainer>
        </div>
    )
}

export default DeliveryBoyTracking
