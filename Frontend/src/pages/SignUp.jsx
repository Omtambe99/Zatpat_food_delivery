import React, { useState } from "react";
import { FaRegEye, FaRegEyeSlash } from "react-icons/fa";
import { FcGoogle } from "react-icons/fc";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { serverUrl } from "../App";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../../firebase";
import { ClipLoader } from "react-spinners";
import { useDispatch } from "react-redux";
import { setUserData } from "../redux/userSlice";

function SignUp() {
  const [showPassword, setShowPassword] = useState(false);
  const [role, setRole] = useState("user");
  const navigate = useNavigate();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [mobile, setMobile] = useState("");
  const [err, setErr] = useState("");
  const [loading, setLoading] = useState(false);
  const dispatch = useDispatch();

  const handleSignUp = async () => {
    setLoading(true);
    setErr("");
    try {
      const result = await axios.post(
        `${serverUrl}/api/auth/signup`,
        { fullName, email, password, mobile, role },
        { withCredentials: true, timeout: 60000 }
      );
      dispatch(setUserData(result.data));
      navigate("/");
    } catch (error) {
      setErr(
        error?.response?.data?.message ||
          (error.code === "ECONNABORTED"
            ? "Server is waking up. Please wait a moment and try again."
            : "Unable to reach server. Check your connection and try again.")
      );
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleAuth = async () => {
    if (!mobile) {
      return setErr("Mobile number is required for Google Sign Up");
    }
    const provider = new GoogleAuthProvider();

    try {
      const result = await signInWithPopup(auth, provider);
      const { data } = await axios.post(
        `${serverUrl}/api/auth/google-auth`,
        {
          fullName: result.user.displayName,
          email: result.user.email,
          role,
          mobile,
        },
        { withCredentials: true }
      );
      dispatch(setUserData(data));
      navigate("/");
    } catch (error) {
      setErr(error?.response?.data?.message || "Google Sign Up failed");
      console.log(error);
    }
  };

  return (
    <div className="min-h-screen w-full flex items-center justify-center p-4 sm:p-6 bg-[#fbfaf7]">
      <div className="bg-white rounded-3xl shadow-sm w-full max-w-md p-8 border border-[#e8e6df]">
        {/* Brand Header */}
        <div className="flex items-center gap-2.5 mb-3">
          <div className="w-9 h-9 rounded-xl bg-[#0e5644] flex items-center justify-center text-white shadow-xs">
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z" />
            </svg>
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-[#18221e]">Zatpat</span>
            <span className="block text-[10px] font-semibold text-[#0e5644] tracking-wider uppercase leading-none">
              Community Food
            </span>
          </div>
        </div>

        <h1 className="text-2xl font-bold text-[#18221e] mb-1">Create an account</h1>
        <p className="text-xs text-[#52605b] mb-6">
          Join your local neighborhood food community and start saving.
        </p>

        {/* Full Name */}
        <div className="mb-3.5">
          <label htmlFor="fullName" className="block text-xs font-bold text-[#18221e] mb-1.5">
            Full Name
          </label>
          <input
            type="text"
            id="fullName"
            className="w-full border border-[#e8e6df] rounded-xl px-3.5 py-2.5 text-xs text-[#18221e] placeholder-gray-400 focus:outline-none focus:border-[#0e5644] focus:ring-2 focus:ring-[#0e5644]/15 transition"
            placeholder="e.g. Rahul Sharma"
            onChange={(e) => setFullName(e.target.value)}
            value={fullName}
            required
          />
        </div>

        {/* Email */}
        <div className="mb-3.5">
          <label htmlFor="email" className="block text-xs font-bold text-[#18221e] mb-1.5">
            Email Address
          </label>
          <input
            type="email"
            id="email"
            className="w-full border border-[#e8e6df] rounded-xl px-3.5 py-2.5 text-xs text-[#18221e] placeholder-gray-400 focus:outline-none focus:border-[#0e5644] focus:ring-2 focus:ring-[#0e5644]/15 transition"
            placeholder="name@example.com"
            onChange={(e) => setEmail(e.target.value)}
            value={email}
            required
          />
        </div>

        {/* Mobile */}
        <div className="mb-3.5">
          <label htmlFor="mobile" className="block text-xs font-bold text-[#18221e] mb-1.5">
            Mobile Number
          </label>
          <input
            type="tel"
            id="mobile"
            className="w-full border border-[#e8e6df] rounded-xl px-3.5 py-2.5 text-xs text-[#18221e] placeholder-gray-400 focus:outline-none focus:border-[#0e5644] focus:ring-2 focus:ring-[#0e5644]/15 transition"
            placeholder="10-digit mobile number"
            onChange={(e) => setMobile(e.target.value)}
            value={mobile}
            required
          />
        </div>

        {/* Password */}
        <div className="mb-4">
          <label htmlFor="password" className="block text-xs font-bold text-[#18221e] mb-1.5">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              className="w-full border border-[#e8e6df] rounded-xl px-3.5 py-2.5 text-xs text-[#18221e] placeholder-gray-400 focus:outline-none focus:border-[#0e5644] focus:ring-2 focus:ring-[#0e5644]/15 transition pr-10"
              placeholder="Create strong password"
              onChange={(e) => setPassword(e.target.value)}
              value={password}
              required
            />
            <button
              type="button"
              className="absolute right-3.5 top-[11px] text-gray-400 hover:text-gray-600 cursor-pointer"
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {!showPassword ? <FaRegEye size={15} /> : <FaRegEyeSlash size={15} />}
            </button>
          </div>
        </div>

        {/* Role Toggle */}
        <div className="mb-5">
          <label className="block text-xs font-bold text-[#18221e] mb-1.5">I am registering as</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: "user", label: "Customer" },
              { id: "owner", label: "Restaurant" },
              { id: "deliveryBoy", label: "Rider" },
            ].map((r) => (
              <button
                type="button"
                key={r.id}
                className={`py-2 px-2 rounded-xl text-xs font-semibold text-center transition cursor-pointer border ${
                  role === r.id
                    ? "bg-[#0e5644] text-white border-[#0e5644] shadow-2xs"
                    : "border-[#e8e6df] text-[#52605b] hover:border-gray-300"
                }`}
                onClick={() => setRole(r.id)}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>

        <button
          className="w-full font-bold text-xs py-3 rounded-xl transition bg-[#0e5644] text-white hover:bg-[#07392d] shadow-xs active:scale-98 cursor-pointer disabled:opacity-60"
          onClick={handleSignUp}
          disabled={loading}
        >
          {loading ? <ClipLoader size={16} color="white" /> : "Create Account"}
        </button>

        {err && <p className="text-rose-600 text-xs font-medium text-center my-3">*{err}</p>}

        <div className="relative my-5">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-100" />
          </div>
          <div className="relative flex justify-center text-xs">
            <span className="bg-white px-2 text-[#83928c]">or sign up with</span>
          </div>
        </div>

        <button
          className="w-full flex items-center justify-center gap-2 border border-[#e8e6df] rounded-xl px-4 py-2.5 transition cursor-pointer text-xs font-semibold text-[#18221e] hover:bg-gray-50 shadow-2xs"
          onClick={handleGoogleAuth}
        >
          <FcGoogle size={18} />
          <span>Google Account</span>
        </button>

        <p className="text-center text-xs text-[#52605b] mt-6">
          Already have an account?{" "}
          <span
            className="text-[#0e5644] font-bold cursor-pointer hover:underline"
            onClick={() => navigate("/signin")}
          >
            Sign In
          </span>
        </p>
      </div>
    </div>
  );
}

export default SignUp;
