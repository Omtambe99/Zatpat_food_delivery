import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import axios from "axios";
import { serverUrl } from "../App";
import {
  addInvite,
  cleanExpiredInvites,
  removeInvite,
  setInvites,
  updateActiveBatch
} from "../redux/batchSlice";

export const useBatchSocket = () => {
  const dispatch = useDispatch();
  const { userData, socket } = useSelector((state) => state.user);
  const { location } = useSelector((state) => state.map);

  // 1. Fetch nearby batches on login or location change
  const fetchNearbyBatches = async () => {
    if (!userData || userData.role !== "user") return;
    try {
      const params = {};
      if (location?.lat && location?.lon) {
        params.lat = location.lat;
        params.lon = location.lon;
      }
      const res = await axios.get(`${serverUrl}/api/batch/nearby`, {
        params,
        withCredentials: true
      });
      dispatch(setInvites(res.data));
    } catch (err) {
      console.log("Error fetching nearby batches:", err.message);
    }
  };

  useEffect(() => {
    fetchNearbyBatches();
  }, [userData?._id, location?.lat, location?.lon]);

  // 2. Register socket listeners
  useEffect(() => {
    if (!socket) return;

    const handleBatchInvite = (invite) => {
      dispatch(addInvite(invite));
    };

    const handleBatchUpdate = (data) => {
      dispatch(updateActiveBatch(data));
      // Also update matching invite in list
      dispatch(
        addInvite({
          batchId: data.batchId,
          memberCount: data.memberCount,
          currentDiscountPct: data.discountPct,
          expiresAt: data.expiresAt
        })
      );
    };

    const handleBatchClosed = (data) => {
      dispatch(removeInvite(data.batchId));
      dispatch(
        updateActiveBatch({
          batchId: data.batchId,
          status: "closed",
          finalDiscountPct: data.finalDiscountPct,
          memberCount: data.memberCount
        })
      );
    };

    socket.on("batchInvite", handleBatchInvite);
    socket.on("batchUpdate", handleBatchUpdate);
    socket.on("batchClosed", handleBatchClosed);

    return () => {
      socket.off("batchInvite", handleBatchInvite);
      socket.off("batchUpdate", handleBatchUpdate);
      socket.off("batchClosed", handleBatchClosed);
    };
  }, [socket, dispatch]);

  // 3. Drop expired invites every 5 seconds
  useEffect(() => {
    const timer = setInterval(() => {
      dispatch(cleanExpiredInvites());
    }, 5000);
    return () => clearInterval(timer);
  }, [dispatch]);
};

export default useBatchSocket;
