import "./App.css";
import { useEffect, useState } from "react";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

import LoginPage from "./LoginPage";
import MyProfile from "./MyProfile";
import HomePage from "./HomePage";
import Header from "./Header";

function App() {
  const [user, setUser] = useState(null);
  const auth = getAuth();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => unsubscribe();
  }, []);

  return (
    <Router>
      <Header user={user} setUser={setUser} />
      <div style={{ padding: 20 }}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/profile" element={<MyProfile />} />
          <Route path="/" element={<HomePage />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;
