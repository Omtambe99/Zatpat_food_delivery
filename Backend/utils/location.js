const NOMINATIM_BASE_URL = "https://nominatim.openstreetmap.org";

const userAgentHeaders = {
  "User-Agent": "ZatpatFoodDelivery/1.0",
  Accept: "application/json",
};

export const hasValidCoordinates = (coordinates) => {
  return (
    Array.isArray(coordinates) &&
    coordinates.length === 2 &&
    (coordinates[0] !== 0 || coordinates[1] !== 0)
  );
};

export const toGeoPoint = (latitude, longitude) => ({
  type: "Point",
  coordinates: [Number(longitude), Number(latitude)],
});

export const geocodeLocation = async (queryText) => {
  const query = queryText?.trim();
  if (!query) {
    return null;
  }

  const response = await fetch(
    `${NOMINATIM_BASE_URL}/search?format=jsonv2&limit=1&q=${encodeURIComponent(query)}`,
    { headers: userAgentHeaders },
  );

  if (!response.ok) {
    throw new Error(`geocode request failed with status ${response.status}`);
  }

  const results = await response.json();
  const firstResult = results?.[0];
  if (!firstResult?.lat || !firstResult?.lon) {
    return null;
  }

  return {
    latitude: Number(firstResult.lat),
    longitude: Number(firstResult.lon),
    displayName: firstResult.display_name || query,
  };
};

export const resolveNearbyShops = async ({
  User,
  Shop,
  userId,
  city,
  maxDistance = 15000,
}) => {
  const user = await User.findById(userId).select("location.coordinates");
  const coordinates = user?.location?.coordinates;

  if (hasValidCoordinates(coordinates)) {
    const geoShops = await Shop.find({
      location: {
        $near: {
          $geometry: {
            type: "Point",
            coordinates,
          },
          $maxDistance: maxDistance,
        },
      },
    }).populate("items");

    if (geoShops.length > 0) {
      return geoShops;
    }
  }

  if (city) {
    return Shop.find({
      city: { $regex: new RegExp(`^${city}$`, "i") },
    }).populate("items");
  }

  return Shop.find({}).populate("items");
};
