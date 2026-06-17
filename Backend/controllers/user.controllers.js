import User from "../models/user.model.js";

export const getCurrentUser = async (req, res) => {
  try {
    const userId = req.userId;
    if (!userId) {
      return res.status(400).json({ message: "userId is not found" });
    }
    const user = await User.findById(userId);
    if (!user) {
      return res.status(400).json({ message: "user is not found" });
    }
    return res.status(200).json(user);
  } catch (error) {
    return res.status(500).json({ message: `get current user error ${error}` });
  }
};

export const updateUserLocation = async (req, res) => {
  try {
    const { lat, lon, locationMode } = req.body;
    const latitude = Number(lat);
    const longitude = Number(lon);

    if (Number.isNaN(latitude) || Number.isNaN(longitude)) {
      return res
        .status(400)
        .json({ message: "valid latitude and longitude are required" });
    }

    const user = await User.findById(req.userId);
    if (!user) {
      return res.status(400).json({ message: "user is not found" });
    }

    if (user.role === "deliveryBoy") {
      return res
        .status(403)
        .json({ message: "delivery boy location cannot be updated here" });
    }

    user.location = {
      type: "Point",
      coordinates: [longitude, latitude],
    };
    user.locationMode = locationMode || user.locationMode || "auto";
    await user.save();

    return res.status(200).json({ message: "location updated", user });
  } catch (error) {
    return res
      .status(500)
      .json({ message: `update location user error ${error}` });
  }
};
