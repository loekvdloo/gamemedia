// Header.jsx
import React from "react";
import { Link } from "react-router-dom";
import { getAuth, signOut } from "firebase/auth";

function Header({ user, setUser }) {
  const auth = getAuth();

  const handleLogout = async () => {
    await signOut(auth);
    setUser(null);
  };

  return (
    <header style={{ display: 'flex', gap: 10, padding: 10, borderBottom: '1px solid #ccc' }}>
      <Link to="/">
        <button>Home</button>
      </Link>
      {!user ? (
        <Link to="/login">
          <button>Inloggen</button>
        </Link>
      ) : (
        <>
          <Link to="/profile">
            <button>Jouw Profiel</button>
          </Link>
          <button onClick={handleLogout}>Uitloggen</button>
        </>
      )}
    </header>
  );
}

export default Header;
