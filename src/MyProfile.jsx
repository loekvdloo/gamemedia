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
} from "firebase/firestore";
import { db } from "./config/firebase";
import { getAuth } from "firebase/auth";
import { supabase } from "./config/supabase";

function MyProfile() {
  const [taskList, setTaskList] = useState([]);
  const [newTask, setNewTask] = useState("");
  const [newImage, setNewImage] = useState(null);
  const [fileInputKey, setFileInputKey] = useState(Date.now());
  const [profileImage, setProfileImage] = useState(null);
  const [userName, setUserName] = useState("");

  const [editTaskId, setEditTaskId] = useState(null);
  const [editTaskName, setEditTaskName] = useState("");
  const [editTaskImage, setEditTaskImage] = useState(null);
  const [editFileInputKey, setEditFileInputKey] = useState(Date.now());

  const auth = getAuth();
  const user = auth.currentUser;
  const fileInputRef = useRef(null);

  const taskCollectionRef = collection(db, "Task");
  const userProfileDocRef = doc(db, "UserProfiles", user?.uid);

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

  const getUserName = async () => {
    try {
      const docSnap = await getDoc(userProfileDocRef);
      if (docSnap.exists()) {
        setUserName(docSnap.data().name || "Onbekende gebruiker");
        setProfileImage(docSnap.data().profileImageUrl || null);
      } else {
        setUserName(user.displayName || "Onbekende gebruiker");
      }
    } catch (error) {
      console.error("Error fetching user name:", error.message);
    }
  };

  useEffect(() => {
    if (user) {
      getTasks();
      getUserName();
    }
  }, [user]);

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
        await setDoc(userProfileDocRef, { profileImageUrl: imageUrl }, { merge: true });
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

  return (
    <div>
      <h2>Jouw profiel</h2>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <p><strong>Naam:</strong> {userName}</p>
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
    </div>
  );
}

export default MyProfile;
