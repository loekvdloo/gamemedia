import { useEffect, useState } from "react";
import { getDocs, updateDoc, collection, doc, getDoc } from "firebase/firestore";
import { db } from "./config/firebase";
import { getAuth } from "firebase/auth";
import './GameMedia.css'; // Import the GameMedia.css file

function HomePage() {
  const [taskList, setTaskList] = useState([]);
  const [filteredTaskList, setFilteredTaskList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [mostLikedPost, setMostLikedPost] = useState(null);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    const getTasks = async () => {
      const data = await getDocs(collection(db, "Task"));
      const tasks = data.docs
        .map((doc) => ({ ...doc.data(), id: doc.id }))
        .filter((task) => !task.private); // Exclude private posts
      tasks.sort((a, b) => b.likes - a.likes); // Sort by likes in descending order
      setTaskList(tasks);
      setFilteredTaskList(tasks); // Initialize filtered list

      // Set the most liked post
      if (tasks.length > 0) {
        setMostLikedPost(tasks[0]); // The first post after sorting is the most liked
      }
    };

    getTasks();
  }, []);

  const handleAddFriend = async (friendUid) => {
    if (!friendUid) {
      alert("Geen geldige gebruiker geselecteerd!");
      return;
    }

    const userDoc = doc(db, "Users", user.uid); // Document van de huidige gebruiker
    try {
      const userSnapshot = await getDoc(userDoc);

      if (!userSnapshot.exists()) {
        alert("Gebruikersdocument niet gevonden!");
        return;
      }

      const userData = userSnapshot.data();

      // Controleer of de vriend al is toegevoegd
      if (userData.friends?.includes(friendUid)) {
        alert("Deze gebruiker is al een vriend!");
        return;
      }

      // Voeg de vriend toe aan de 'friends'-array
      const updatedFriends = [...(userData.friends || []), friendUid];
      await updateDoc(userDoc, { friends: updatedFriends });

      alert("Vriend succesvol toegevoegd!");
    } catch (error) {
      console.error("Error bij het toevoegen van vriend:", error.message);
      alert("Er is een fout opgetreden bij het toevoegen van de vriend.");
    }
  };

  const handleProfileClick = async (userId) => {
    console.log("Fetching profile for userId:", userId); // Controleer de userId

    try {
      const userDoc = doc(db, "Users", userId);
      const userSnapshot = await getDoc(userDoc);

      if (userSnapshot.exists()) {
        console.log("Profile data:", userSnapshot.data()); // Controleer de profielgegevens
        setSelectedProfile(userSnapshot.data());
        setShowProfilePopup(true);
      } else {
        console.error("Profiel niet gevonden voor userId:", userId);
        alert("Profiel niet gevonden!");
      }
    } catch (error) {
      console.error("Error fetching profile:", error.message);
    }
  };

  const handleSearch = (query) => {
    setSearchQuery(query);

    if (query.trim() === "") {
      setFilteredTaskList(taskList); // Reset to full list if search is empty
    } else {
      const filtered = taskList.filter((task) =>
        task.name?.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredTaskList(filtered);
    }
  };

  const handleLike = async (taskId, currentLikes, likedBy) => {
    if (likedBy?.includes(user.uid)) {
      alert("Je hebt deze post al geliked!");
      return;
    }

    const taskDoc = doc(db, "Task", taskId);
    const newLikes = currentLikes + 1;
    const updatedLikedBy = [...(likedBy || []), user.uid];

    await updateDoc(taskDoc, { likes: newLikes, likedBy: updatedLikedBy });

    setTaskList((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId
          ? { ...task, likes: newLikes, likedBy: updatedLikedBy }
          : task
      )
    );

    setFilteredTaskList((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId
          ? { ...task, likes: newLikes, likedBy: updatedLikedBy }
          : task
      )
    );

    // Update the most liked post
    const updatedTasks = [...taskList].sort((a, b) => b.likes - a.likes);
    setMostLikedPost(updatedTasks[0]);
  };

  const handleAddComment = async (taskId, comment) => {
    if (!comment.trim()) {
      alert("Comment cannot be empty!");
      return;
    }

    const taskDoc = doc(db, "Task", taskId);
    const task = taskList.find((task) => task.id === taskId);

    if (!task) {
      console.error("Task not found!");
      return;
    }

    const updatedComments = [...(task.comments || []), { text: comment, likes: 0 }];

    try {
      await updateDoc(taskDoc, { comments: updatedComments });

      setTaskList((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId ? { ...task, comments: updatedComments } : task
        )
      );

      setFilteredTaskList((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId ? { ...task, comments: updatedComments } : task
        )
      );
    } catch (error) {
      console.error("Error adding comment:", error.message);
    }
  };

  const handleLikeComment = async (taskId, commentIndex) => {
    const taskDoc = doc(db, "Task", taskId);
    const task = taskList.find((task) => task.id === taskId);

    if (!task) {
      console.error("Task not found!");
      return;
    }

    const updatedComments = task.comments.map((comment, index) =>
      index === commentIndex ? { ...comment, likes: comment.likes + 1 } : comment
    );

    try {
      await updateDoc(taskDoc, { comments: updatedComments });

      setTaskList((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId ? { ...task, comments: updatedComments } : task
        )
      );

      setFilteredTaskList((prevTasks) =>
        prevTasks.map((task) =>
          task.id === taskId ? { ...task, comments: updatedComments } : task
        )
      );
    } catch (error) {
      console.error("Error liking comment:", error.message);
    }
  };

  return (
    <div>
      <header className="header">
        <h1>GameMedia</h1>
        <p>De plek om jouw favoriete game-momenten te delen!</p>
      </header>

      <div className="search-bar">
        <input
          type="text"
          placeholder="Zoek op titel van post"
          value={searchQuery}
          onChange={(e) => handleSearch(e.target.value)}
          className="search-input"
        />
      </div>

      {mostLikedPost && (
        <div className="post-frame most-liked">
          <h3>Most Liked Post of the Day</h3>
          <p>
            <strong>{mostLikedPost.name}</strong>
          </p>
          {mostLikedPost.imageUrl && (
            <img
              src={mostLikedPost.imageUrl}
              alt="Most liked post"
              className="post-image"
            />
          )}
          <p className="post-author">Geplaatst door: {mostLikedPost.userEmail}</p>
          <p className="post-likes">Likes: {mostLikedPost.likes || 0}</p>
        </div>
      )}

      {filteredTaskList.map((task) => (
        <div key={task.id} className="post-frame">
          <p>
            <strong>{task.name}</strong>
          </p>
          {task.imageUrl && (
            <img src={task.imageUrl} alt="taak" className="post-image" />
          )}
          <p className="post-author">
            Geplaatst door: 
            <button
              onClick={() => handleProfileClick(task.userId)}
              className="profile-button"
            >
              {task.userEmail} (Profiel bekijken)
            </button>
          </p>
          <p className="post-likes">
            Likes: {task.likes || 0}{" "}
            <button
              onClick={() =>
                handleLike(task.id, task.likes || 0, task.likedBy || [])
              }
              className="like-button"
            >
              Like
            </button>
          </p>
          <div className="comments-section">
            <h4>Comments:</h4>
            <ul>
              {(task.comments || [])
                .sort((a, b) => b.likes - a.likes) // Sort comments by likes
                .map((comment, index) => (
                  <li key={index}>
                    {comment.text} - Likes: {comment.likes || 0}{" "}
                    <button
                      onClick={() => handleLikeComment(task.id, index)}
                      className="like-button"
                    >
                      Like Comment
                    </button>
                  </li>
                ))}
            </ul>
            <input
              type="text"
              placeholder="Add a comment"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  handleAddComment(task.id, e.target.value);
                  e.target.value = ""; // Clear input
                }
              }}
              className="comment-input"
            />
          </div>
        </div>
      ))}

      {/* Profile Popup */}
      {showProfilePopup && selectedProfile && (
        <div className="profile-popup">
          <div className="profile-popup-content">
            <h2>Profiel</h2>
            <p><strong>Naam:</strong> {selectedProfile.name}</p>
            <p><strong>Email:</strong> {selectedProfile.email}</p>
            <button
              onClick={() => handleAddFriend(selectedProfile.uid)}
              className="add-friend-button"
            >
              Voeg toe als vriend
            </button>
            <button
              onClick={() => setShowProfilePopup(false)}
              className="close-popup-button"
            >
              Sluiten
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;
