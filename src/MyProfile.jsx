import { useEffect, useState, useRef } from "react";
import {
  getDocs,
  deleteDoc,
  updateDoc,
  collection,
  doc,
  addDoc,
  setDoc,
  getDoc,
  writeBatch,
} from "firebase/firestore";
import { db } from "./config/firebase";
import { getAuth, onAuthStateChanged } from "firebase/auth";
import { supabase } from "./config/supabase";

function MyProfile() {
  const [taskList, setTaskList] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [newImage, setNewImage] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [profileImage, setProfileImage] = useState(null);
  const [userName, setUserName] = useState("");
  const [friendsList, setFriendsList] = useState([]);
  const [friendRequests, setFriendRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [privateProfile, setPrivateProfile] = useState(false);

  const [editTaskId, setEditTaskId] = useState(null);
  const [editTaskName, setEditTaskName] = useState("");
  const [editTaskImage, setEditTaskImage] = useState(null);
  const [editFileInputKey, setEditFileInputKey] = useState(Date.now());

  const auth = getAuth();
  const user = auth.currentUser;
  const fileInputRef = useRef(null);

  const taskCollectionRef = collection(db, "Task");
  const userProfileDocRef = doc(db, "UserProfiles", user?.uid);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const fetchProfile = async () => {
      if (!user) return;
      const userRef = doc(db, "Users", user.uid);
      const userSnap = await getDoc(userRef);
      if (userSnap.exists()) {
        const data = userSnap.data();
        setUserName(data.name || "Onbekende gebruiker");
        setProfileImage(data.profileImageUrl || null);
        setPrivateProfile(data.private || false);

        // Vrienden ophalen
        const friends = data.friends || [];
        if (friends.length > 0) {
          const friendDocs = await Promise.all(
            friends.map((uid) => getDoc(doc(db, "Users", uid)))
          );
          setFriendsList(
            friendDocs.filter((d) => d.exists()).map((d) => d.data())
          );
        } else {
          setFriendsList([]);
        }

        // Verzoeken ophalen
        const requests = data.friendRequests || [];
        if (requests.length > 0) {
          const requestDocs = await Promise.all(
            requests.map((uid) => getDoc(doc(db, "Users", uid)))
          );
          setFriendRequests(
            requestDocs
              .filter((d) => d.exists())
              .map((d) => ({ ...d.data(), uid: d.id }))
          );
        } else {
          setFriendRequests([]);
        }
      } else {
        setUserName(user.displayName || "Onbekende gebruiker");
      }
      setLoading(false);
    };
    fetchProfile();
  }, [user]);

  const getTasks = async () => {
    try {
      const data = await getDocs(taskCollectionRef);
      const allTasks = data.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
      const userTasks = allTasks.filter((task) => task.userId === user?.uid);
      setTaskList(userTasks);
    } catch (error) {
      console.error("Error fetching tasks:", error.message);
    }
  };

  const uploadImageToSupabase = async (file) => {
    const fileExt = file.name.split(".").pop();
    const fileName = `${Date.now()}.${fileExt}`;
    const filePath = `socialmedia/${fileName}`;

    const { error } = await supabase.storage
      .from("socialmedia")
      .upload(filePath, file);
    if (error) {
      console.error("Upload mislukt:", error.message);
      return null;
    }

    const { data } = supabase.storage
      .from("socialmedia")
      .getPublicUrl(filePath);
    return data.publicUrl;
  };

  const handleProfileImageUpload = async (file) => {
    const imageUrl = await uploadImageToSupabase(file);
    if (imageUrl) {
      try {
        await setDoc(
          userProfileDocRef,
          { profileImageUrl: imageUrl },
          { merge: true }
        );
        setProfileImage(imageUrl);
      } catch (error) {
        console.error("Error updating profile image:", error.message);
      }
    }
  };

  const addTask = async () => {
    let imageUrl = null;
    if (newImage) {
      imageUrl = await uploadImageToSupabase(newImage);
    }

    try {
      await addDoc(taskCollectionRef, {
        name: newTask,
        imageUrl: imageUrl || "",
        userId: user.uid,
        userEmail: user.email,
        private: false,
      });

      setNewTask("");
      setNewImage(null);
      setFileInputKey(Date.now());
      getTasks();
    } catch (error) {
      console.error("Error adding task:", error.message);
    }
  };

  const deleteTask = async (id) => {
    try {
      await deleteDoc(doc(db, "Task", id));
      getTasks();
    } catch (error) {
      console.error("Error deleting task:", error.message);
    }
  };

  const updateTask = async () => {
    const taskDoc = doc(db, "Task", editTaskId);

    let imageUrl = null;
    if (editTaskImage) {
      imageUrl = await uploadImageToSupabase(editTaskImage);
    } else {
      const existingTask = taskList.find((task) => task.id === editTaskId);
      imageUrl = existingTask?.imageUrl || "";
    }

    try {
      await updateDoc(taskDoc, {
        name: editTaskName,
        imageUrl: imageUrl,
      });

      setEditTaskId(null);
      setEditTaskName("");
      setEditTaskImage(null);
      setEditFileInputKey(Date.now());
      getTasks();
    } catch (error) {
      console.error("Error updating task:", error.message);
    }
  };

  const togglePrivateStatus = async (taskId, currentStatus) => {
    const taskDoc = doc(db, "Task", taskId);
    try {
      await updateDoc(taskDoc, { private: !currentStatus });
      setTaskList((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId ? { ...task, private: !currentStatus } : task
        )
      );
    } catch (error) {
      console.error("Error updating private status:", error.message);
    }
  };

  const handlePrivateChange = async (e) => {
    const newValue = e.target.checked;
    setPrivateProfile(newValue);
    if (user) {
      const userRef = doc(db, "Users", user.uid);
      await updateDoc(userRef, { private: newValue });
    }
  };

  // Verzoek accepteren
  const handleAcceptRequest = async (requesterUid) => {
    if (!user) return;
    try {
      const myRef = doc(db, "Users", user.uid);
      const requesterRef = doc(db, "Users", requesterUid);

      const mySnap = await getDoc(myRef);
      const requesterSnap = await getDoc(requesterRef);

      if (!mySnap.exists() || !requesterSnap.exists()) {
        alert("Gebruiker niet gevonden!");
        return;
      }

      const myData = mySnap.data();
      const requesterData = requesterSnap.data();

      // Voeg elkaar toe als vriend
      const batch = writeBatch(db);
      batch.update(myRef, {
        friends: [...(myData.friends || []), requesterUid],
        friendRequests: (myData.friendRequests || []).filter(
          (uid) => uid !== requesterUid
        ),
      });
      batch.update(requesterRef, {
        friends: [...(requesterData.friends || []), user.uid],
      });
      await batch.commit();

      // Refresh lists
      setFriendsList((prev) => [...prev, requesterData]);
      setFriendRequests((prev) => prev.filter((r) => r.uid !== requesterUid));
      alert("Vriendschapsverzoek geaccepteerd!");
    } catch (error) {
      alert("Fout bij accepteren verzoek.");
    }
  };

  if (loading) return <div>Loading...</div>;
  if (!userName) return <div>Geen profiel gevonden.</div>;

  return (
    <div>
      <h2>Jouw profiel</h2>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <p>
          <strong>Naam:</strong> {userName}
        </p>
        {profileImage ? (
          <>
            <img
              src={profileImage}
              alt="Profiel"
              style={{
                width: 150,
                height: 150,
                border: "5px solid white",
                borderRadius: "50%",
                objectFit: "cover",
              }}
            />
            <div style={{ marginTop: 10 }}>
              <button onClick={() => fileInputRef.current.click()}>
                Verander profielfoto
              </button>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={(e) =>
                  handleProfileImageUpload(e.target.files[0])
                }
                style={{ display: "none" }}
              />
            </div>
          </>
        ) : (
          <>
            <p>Geen profielafbeelding</p>
            <input
              type="file"
              accept="image/*"
              onChange={(e) =>
                handleProfileImageUpload(e.target.files[0])
              }
            />
          </>
        )}
      </div>

      <label>
        <input
          type="checkbox"
          checked={privateProfile}
          onChange={handlePrivateChange}
        />
        Mijn profiel is privé (anderen moeten verzoek sturen)
      </label>

      <h2>Jouw berichten</h2>

      <input
        type="text"
        placeholder="Nieuwe taak"
        value={newTask}
        onChange={(e) => setNewTask(e.target.value)}
      />
      <input
        key={fileInputKey}
        type="file"
        accept="image/*"
        onChange={(e) => setNewImage(e.target.files[0])}
      />
      <button onClick={addTask}>Toevoegen</button>

      {taskList.map((task) => (
        <div key={task.id} style={{ marginTop: 10 }}>
          {editTaskId === task.id ? (
            <>
              <input
                type="text"
                value={editTaskName}
                onChange={(e) => setEditTaskName(e.target.value)}
              />
              <input
                key={editFileInputKey}
                type="file"
                accept="image/*"
                onChange={(e) => setEditTaskImage(e.target.files[0])}
              />
              <button onClick={updateTask}>Opslaan</button>
              <button
                onClick={() => {
                  setEditTaskId(null);
                  setEditTaskName("");
                  setEditTaskImage(null);
                  setEditFileInputKey(Date.now());
                }}
              >
                Annuleer
              </button>
            </>
          ) : (
            <>
              <p>
                <strong>{task.name}</strong>
              </p>
              {task.imageUrl && (
                <img
                  src={task.imageUrl}
                  alt="taak"
                  style={{
                    width: 100,
                    border: "5px solid white",
                    borderRadius: "50%",
                  }}
                />
              )}
              <p>Status: {task.private ? "Privé" : "Openbaar"}</p>
              <button
                onClick={() => togglePrivateStatus(task.id, task.private)}
              >
                {task.private ? "Maak Openbaar" : "Maak Privé"}
              </button>
              <button
                onClick={() => {
                  setEditTaskId(task.id);
                  setEditTaskName(task.name);
                  setEditTaskImage(null);
                  setEditFileInputKey(Date.now());
                }}
              >
                Bewerken
              </button>
              <button onClick={() => deleteTask(task.id)}>Verwijderen</button>
            </>
          )}
        </div>
      ))}

      <h3>Mijn Vrienden:</h3>
      {friendsList.length > 0 ? (
        <ul>
          {friendsList.map((friend, idx) => (
            <li key={idx}>
              {friend.name} ({friend.email})
            </li>
          ))}
        </ul>
      ) : (
        <p>Je hebt nog geen vrienden.</p>
      )}

      <h3>Vriendschapsverzoeken:</h3>
      {friendRequests.length > 0 ? (
        <ul>
          {friendRequests.map((req, idx) => (
            <li key={idx}>
              {req.name} ({req.email}){" "}
              <button onClick={() => handleAcceptRequest(req.uid)}>
                Accepteer
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>Geen openstaande verzoeken.</p>
      )}
    </div>
  );
}

export default MyProfile;
