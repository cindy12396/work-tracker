import React, { useState } from "react";
import { auth } from "./firebase";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";
import { useNavigate } from "react-router-dom";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isRegistering, setIsRegistering] = useState(false);
  const navigate = useNavigate();

  const handleAuth = async () => {
    try {
      if (isRegistering) {
        await createUserWithEmailAndPassword(auth, email, password);
      } else {
        await signInWithEmailAndPassword(auth, email, password);
      }
      navigate("/");
    } catch (error) {
      alert(error.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100">
      <div className="bg-white p-6 rounded shadow w-full max-w-sm">
        <h1 className="text-xl font-bold mb-4 text-center">
          {isRegistering ? "註冊帳號" : "登入帳號"}
        </h1>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full mb-3 p-2 border rounded"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full mb-3 p-2 border rounded"
        />
        <button
          onClick={handleAuth}
          className="w-full bg-blue-600 text-white p-2 rounded mb-2"
        >
          {isRegistering ? "註冊" : "登入"}
        </button>
        <p className="text-center text-sm">
          {isRegistering ? "已有帳號？" : "還沒有帳號？"}
          <button
            className="text-blue-500 ml-1 underline"
            onClick={() => setIsRegistering(!isRegistering)}
          >
            {isRegistering ? "登入" : "註冊"}
          </button>
        </p>
      </div>
    </div>
  );
}
