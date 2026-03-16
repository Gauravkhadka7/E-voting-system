import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App";

// Polyfill for older browsers / Buffer usage with ethers/IPFS
if (typeof window !== "undefined") {
  window.global = window;
}

const root = ReactDOM.createRoot(document.getElementById("root"));

root.render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);