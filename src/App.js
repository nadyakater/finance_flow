import { useState } from "react";

import "./App.css";

import Login from "./pages/Login";
import Anasayfa from "./pages/Anasayfa";

function App() {
  // 1.GÜN - Giriş sayfası ile ana sayfa arasındaki basit geçiş oluşturuldu.
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  const handleLogin = () => {
    setIsLoggedIn(true);
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
  };

  return (
    <div className="App">
      {isLoggedIn ? (
        <Anasayfa onLogout={handleLogout} />
      ) : (
        <Login onLogin={handleLogin} />
      )}
    </div>
  );
}

export default App;