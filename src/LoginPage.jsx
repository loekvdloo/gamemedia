import { useEffect, useState } from "react";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  onAuthStateChanged,
  signOut,
} from "firebase/auth";

function LoginPage() {
  const auth = getAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });
    return () => unsubscribe();
  }, [auth]);

  const handleGoogleLogin = async () => {
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Google login mislukt:", error.message);
    }
  };

  const handleEmailLogin = async () => {
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (error) {
      console.error("Email login mislukt:", error.message);
    }
  };

  const handleRegister = async () => {
    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      await userCredential.user.updateProfile({ displayName: name });
    } catch (error) {
      console.error("Registratie mislukt:", error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
    } catch (error) {
      console.error("Uitloggen mislukt:", error.message);
    }
  };

  return (
    <div style={{ padding: 20, maxWidth: 400, margin: "0 auto" }}>
      {user ? (
        <>
          <h2>Welkom, {user.displayName || user.email}!</h2>
          <button onClick={handleLogout}>Uitloggen</button>
        </>
      ) : (
        <>
          <h2>Inloggen of registreren</h2>
          <input
            type="text"
            placeholder="Naam"
            value={name}
            onChange={(e) => setName(e.target.value)}
            style={{ display: "block", marginBottom: 10, width: "100%" }}
          />
          <input
            type="email"
            placeholder="E-mailadres"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{ display: "block", marginBottom: 10, width: "100%" }}
          />
          <input
            type="password"
            placeholder="Wachtwoord"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{ display: "block", marginBottom: 10, width: "100%" }}
          />

          <button onClick={handleEmailLogin} style={{ marginBottom: 10 }}>
            Inloggen met e-mail
          </button>
          <button onClick={handleRegister} style={{ marginBottom: 20 }}>
            Registreren
          </button>

          <hr />

          <h3>Of log in met Google</h3>
          <button onClick={handleGoogleLogin}>Google Login</button>
        </>
      )}
    </div>
  );
}

export default LoginPage;
