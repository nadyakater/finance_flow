import React from "react";
import ReactDOM from "react-dom/client";

import { Provider } from "react-redux";

import "./index.css";

import App from "./App";
import reportWebVitals from "./reportWebVitals";

import { store } from "./app/store";

// 1.GÜN - React uygulaması Redux Provider ile bağlandı.
const root = ReactDOM.createRoot(
  document.getElementById("root"),
);

root.render(
  <React.StrictMode>
    <Provider store={store}>
      <App />
    </Provider>
  </React.StrictMode>,
);

reportWebVitals();