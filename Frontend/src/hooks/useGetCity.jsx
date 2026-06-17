import axios from "axios";
import React, { useEffect } from "react";
import { serverUrl } from "../App";
import { useDispatch, useSelector } from "react-redux";
import {
  setCurrentAddress,
  setCurrentCity,
  setCurrentState,
} from "../redux/userSlice";
import { setAddress, setLocation } from "../redux/mapSlice";

function useGetCity() {
  const dispatch = useDispatch();
  const { userData } = useSelector((state) => state.user);
  const apiKey = import.meta.env.VITE_GEOAPIKEY;
  useEffect(() => {
    if (!userData || !["user", "owner"].includes(userData.role)) {
      return;
    }

    const savedCoordinates = userData.location?.coordinates;
    const hasSavedLocation =
      Array.isArray(savedCoordinates) &&
      savedCoordinates.length === 2 &&
      (savedCoordinates[0] !== 0 || savedCoordinates[1] !== 0);

    const clearLocationState = () => {
      dispatch(setLocation({ lat: null, lon: null }));
      dispatch(setCurrentCity(null));
      dispatch(setCurrentState(null));
      dispatch(setCurrentAddress(null));
      dispatch(setAddress(null));
    };

    const applyLocation = async (latitude, longitude) => {
      try {
        dispatch(setLocation({ lat: latitude, lon: longitude }));
        const result = await axios.get(
          `https://api.geoapify.com/v1/geocode/reverse?lat=${latitude}&lon=${longitude}&format=json&apiKey=${apiKey}`,
        );
        const firstResult = result?.data?.results?.[0];
        const formattedAddress =
          firstResult?.address_line2 ||
          firstResult?.address_line1 ||
          firstResult?.formatted ||
          null;
        dispatch(
          setCurrentCity(
            firstResult?.city ||
              firstResult?.county ||
              firstResult?.suburb ||
              firstResult?.village ||
              null,
          ),
        );
        dispatch(setCurrentState(firstResult?.state || null));
        dispatch(setCurrentAddress(formattedAddress));
        dispatch(setAddress(formattedAddress));
      } catch (error) {
        console.log(error);
        clearLocationState();
      }
    };

    if (hasSavedLocation) {
      applyLocation(savedCoordinates[1], savedCoordinates[0]);
      return;
    }

    if (!navigator.geolocation) {
      clearLocationState();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        applyLocation(latitude, longitude);
      },
      () => {
        clearLocationState();
      },
    );
  }, [userData, apiKey, dispatch]);
}

export default useGetCity;
