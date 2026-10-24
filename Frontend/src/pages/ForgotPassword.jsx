import axios from "axios";
import React, { useState } from "react";
import { IoIosArrowRoundBack } from "react-icons/io";
import { useNavigate } from "react-router-dom";
import { serverUrl } from "../App";
import { ClipLoader } from "react-spinners";

function ForgotPassword() {
  const [step, setStep] = useState(1);
  const [email, setEmail] = useState("");
  const [otp, setOtp] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [err, setErr] = useState("");
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const handleSendOtp = async () => {
    setLoading(true);
    try {
      await axios.post(
        `${serverUrl}/api/auth/send-otp`,
        { email },
        { withCredentials: true }
      );
      setErr("");
      setStep(2);
      setLoading(false);
    } catch (error) {
      setErr(error.response?.data?.message || "Failed to send OTP");
      setLoading(false);
    }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    try {
      await axios.post(
        `${serverUrl}/api/auth/verify-otp`,
        { email, otp },
        { withCredentials: true }
      );
      setErr("");
      setStep(3);
      setLoading(false);
    } catch (error) {
      setErr(error?.response?.data?.message || "Invalid OTP code");
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (newPassword !== confirmPassword) {
      setErr("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      await axios.post(
        `${serverUrl}/api/auth/reset-password`,
        { email, newPassword },
        { withCredentials: true }
      );
      setErr("");
      setLoading(false);
      navigate("/signin");
    } catch (error) {
      setErr(error?.response?.data?.message || "Failed to reset password");
      setLoading(false);
    }
  };

  return (
    <div className="flex w-full items-center justify-center min-h-screen p-4 sm:p-6 bg-[#fbfaf7]">
      <div className="bg-white rounded-3xl shadow-sm w-full max-w-md p-8 border border-[#e8e6df]">
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => navigate("/signin")}
            className="p-1 rounded-full hover:bg-gray-100 text-[#18221e] transition cursor-pointer"
          >
            <IoIosArrowRoundBack size={26} />
          </button>
          <h1 className="text-xl font-bold text-[#18221e]">Reset Password</h1>
        </div>

        {step === 1 && (
          <div>
            <p className="text-xs text-[#52605b] mb-4">
              Enter your registered email address to receive a verification OTP.
            </p>
            <div className="mb-4">
              <label htmlFor="email" className="block text-xs font-bold text-[#18221e] mb-1.5">
                Email Address
              </label>
              <input
                type="email"
                id="email"
                className="w-full border border-[#e8e6df] rounded-xl px-3.5 py-2.5 text-xs text-[#18221e] placeholder-gray-400 focus:outline-none focus:border-[#0e5644] focus:ring-2 focus:ring-[#0e5644]/15"
                placeholder="name@example.com"
                onChange={(e) => setEmail(e.target.value)}
                value={email}
                required
              />
            </div>
            <button
              className="w-full font-bold text-xs py-3 rounded-xl transition bg-[#0e5644] text-white hover:bg-[#07392d] shadow-xs active:scale-98 cursor-pointer disabled:opacity-60"
              onClick={handleSendOtp}
              disabled={loading || !email}
            >
              {loading ? <ClipLoader size={16} color="white" /> : "Send OTP"}
            </button>
            {err && <p className="text-rose-600 text-xs font-medium text-center my-3">*{err}</p>}
          </div>
        )}

        {step === 2 && (
          <div>
            <p className="text-xs text-[#52605b] mb-4">
              Enter the 6-digit OTP code sent to <span className="font-semibold">{email}</span>.
            </p>
            <div className="mb-4">
              <label htmlFor="otp" className="block text-xs font-bold text-[#18221e] mb-1.5">
                OTP Code
              </label>
              <input
                type="text"
                id="otp"
                className="w-full border border-[#e8e6df] rounded-xl px-3.5 py-2.5 text-xs font-mono font-bold text-[#18221e] placeholder-gray-400 focus:outline-none focus:border-[#0e5644] focus:ring-2 focus:ring-[#0e5644]/15 tracking-widest text-center"
                placeholder="123456"
                onChange={(e) => setOtp(e.target.value)}
                value={otp}
                required
              />
            </div>
            <button
              className="w-full font-bold text-xs py-3 rounded-xl transition bg-[#0e5644] text-white hover:bg-[#07392d] shadow-xs active:scale-98 cursor-pointer disabled:opacity-60"
              onClick={handleVerifyOtp}
              disabled={loading || !otp}
            >
              {loading ? <ClipLoader size={16} color="white" /> : "Verify Code"}
            </button>
            {err && <p className="text-rose-600 text-xs font-medium text-center my-3">*{err}</p>}
          </div>
        )}

        {step === 3 && (
          <div>
            <p className="text-xs text-[#52605b] mb-4">
              Create a new password for your Zatpat account.
            </p>
            <div className="mb-3.5">
              <label htmlFor="newPassword" className="block text-xs font-bold text-[#18221e] mb-1.5">
                New Password
              </label>
              <input
                type="password"
                id="newPassword"
                className="w-full border border-[#e8e6df] rounded-xl px-3.5 py-2.5 text-xs text-[#18221e] placeholder-gray-400 focus:outline-none focus:border-[#0e5644] focus:ring-2 focus:ring-[#0e5644]/15"
                placeholder="Enter new password"
                onChange={(e) => setNewPassword(e.target.value)}
                value={newPassword}
              />
            </div>
            <div className="mb-4">
              <label htmlFor="confirmPassword" className="block text-xs font-bold text-[#18221e] mb-1.5">
                Confirm Password
              </label>
              <input
                type="password"
                id="confirmPassword"
                className="w-full border border-[#e8e6df] rounded-xl px-3.5 py-2.5 text-xs text-[#18221e] placeholder-gray-400 focus:outline-none focus:border-[#0e5644] focus:ring-2 focus:ring-[#0e5644]/15"
                placeholder="Confirm new password"
                onChange={(e) => setConfirmPassword(e.target.value)}
                value={confirmPassword}
                required
              />
            </div>
            <button
              className="w-full font-bold text-xs py-3 rounded-xl transition bg-[#0e5644] text-white hover:bg-[#07392d] shadow-xs active:scale-98 cursor-pointer disabled:opacity-60"
              onClick={handleResetPassword}
              disabled={loading || !newPassword || !confirmPassword}
            >
              {loading ? <ClipLoader size={16} color="white" /> : "Save New Password"}
            </button>
            {err && <p className="text-rose-600 text-xs font-medium text-center my-3">*{err}</p>}
          </div>
        )}
      </div>
    </div>
  );
}

export default ForgotPassword;
