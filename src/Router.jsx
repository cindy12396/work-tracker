import { BrowserRouter, Routes, Route } from "react-router-dom";
import App from "./App";
import Login from "./login";

export default function RouterSetup() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/" element={<App />} />
      </Routes>
    </BrowserRouter>
  );
}