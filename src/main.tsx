import React from "react";
import ReactDOM from "react-dom/client";
import { Buffer } from "buffer";
import "@radix-ui/themes/styles.css";
import "./styles.css";
import { App } from "@/App";
import { WalletProvider } from "@/context/WalletContext";

declare global {
  interface Window {
    Buffer: typeof Buffer;
  }
}

window.Buffer = Buffer;

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <WalletProvider>
      <App />
    </WalletProvider>
  </React.StrictMode>
);
