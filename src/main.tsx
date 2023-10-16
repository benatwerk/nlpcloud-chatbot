import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.tsx";
import { ChatProvider } from "./ChatContext";
import "./index.css";

ReactDOM.createRoot(document.getElementById("root")!).render(
    <React.StrictMode>
        <ChatProvider>
            <App />
        </ChatProvider>
    </React.StrictMode>
);
