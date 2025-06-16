import { useEffect, useState } from "react";
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

  const taskCollectionRef = collection(db, "Task");
  const userProfileDocRef = doc(db, "UserProfiles", user?.uid);

  const getTasks = async () => {
    const data = await getDocs(taskCollectionRef);
    const allTasks = data.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
    const userTasks = allTasks.filter((task) => task.userId === user?.uid);
    setTaskList(userTasks);
  };

  const getUserName = async () => {
    const docSnap = await getDoc(userProfileDocRef);
    if (docSnap.exists()) {
      setUserName(docSnap.data().name || "Onbekende gebruiker");
    } else {
      setUserName(user.displayName || "Onbekende gebruiker");
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
    setProfileImage(imageUrl);
  };

  const addTask = async () => {
    let imageUrl = null;
    if (newImage) {
      imageUrl = await uploadImageToSupabase(newImage);
    }

    await addDoc(taskCollectionRef, {
      name: newTask,
      imageUrl: imageUrl || "",
      userId: user.uid,
      userEmail: user.email,
    });

    setNewTask("");
    setNewImage(null);
    setFileInputKey(Date.now());
    getTasks();
  };

  const deleteTask = async (id) => {
    await deleteDoc(doc(db, "Task", id));
    getTasks();
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

    await updateDoc(taskDoc, {
      name: editTaskName,
      imageUrl: imageUrl,
    });

    setEditTaskId(null);
    setEditTaskName("");
    setEditTaskImage(null);
    setEditFileInputKey(Date.now());
    getTasks();
  };

  return (
    <div>
      <h2>Jouw profiel</h2>
      <div style={{ textAlign: "center", marginBottom: 20 }}>
        <p><strong>Naam:</strong> {userName}</p>
        {profileImage ? (
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
        ) : (
          <p>Geen profielafbeelding</p>
        )}
        <input
          type="file"
          accept="image/*"
          onChange={(e) => handleProfileImageUpload(e.target.files[0])}
        />
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
                    borderRadius: "50%", // Optional: Makes the image circular
                  }}
                />
              )}
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
