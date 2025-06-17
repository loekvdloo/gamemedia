import { useEffect, useState } from "react";
import { getDocs, updateDoc, collection, doc, getDoc, writeBatch, arrayUnion } from "firebase/firestore";
import { db } from "./config/firebase";
import { getAuth } from "firebase/auth";
import './GameMedia.css';

function HomePage() {
  const [taskList, setTaskList] = useState([]);
  const [filteredTaskList, setFilteredTaskList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [mostLikedPost, setMostLikedPost] = useState(null);
  const [showProfilePopup, setShowProfilePopup] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [friendsList, setFriendsList] = useState([]);
  const [myProfile, setMyProfile] = useState(false); // Nieuw
  const [showAddFriendPopup, setShowAddFriendPopup] = useState(false);
  const [pendingFriend, setPendingFriend] = useState(null);
  const auth = getAuth();
  const user = auth.currentUser;

  useEffect(() => {
    const getTasks = async () => {
      const data = await getDocs(collection(db, "Task"));
      const tasks = data.docs
        .map((doc) => ({ ...doc.data(), id: doc.id }))
        .filter((task) => !task.private);
      tasks.sort((a, b) => b.likes - a.likes);
      setTaskList(tasks);
      setFilteredTaskList(tasks);
      if (tasks.length > 0) {
        setMostLikedPost(tasks[0]);
      }
    };
    getTasks();
  }, []);

  // Vriend toevoegen of verzoek sturen
  const handleAddFriend = async (friendUid, friendIsPrivate) => {
    if (!friendUid) {
      alert("Geen geldige gebruiker geselecteerd!");
      return;
    }
    if (friendUid === user.uid) {
      alert("Je kunt jezelf niet toevoegen als vriend!");
      return;
    }

    try {
      const myRef = doc(db, "Users", user.uid);
      const friendRef = doc(db, "Users", friendUid);

      const mySnap = await getDoc(myRef);
      const friendSnap = await getDoc(friendRef);

      if (!mySnap.exists() || !friendSnap.exists()) {
        alert("Gebruiker niet gevonden!");
        return;
      }

      const myData = mySnap.data();
      const friendData = friendSnap.data();

      // Controleer of je al vrienden bent
      if ((myData.friends || []).includes(friendUid)) {
        alert("Jullie zijn al vrienden!");
        return;
      }

      if (friendIsPrivate) {
        // Stuur verzoek
        await updateDoc(friendRef, {
          friendRequests: arrayUnion(user.uid),
        });
        alert("Vriendschapsverzoek verstuurd! Wacht tot deze geaccepteerd wordt.");
      } else {
        // Direct vrienden worden
        const batch = writeBatch(db);
        batch.update(myRef, {
          friends: arrayUnion(friendUid),
        });
        batch.update(friendRef, {
          friends: arrayUnion(user.uid),
        });
        await batch.commit();
        alert("Jullie zijn nu vrienden!");
        // Refresh vriendenlijst als je je eigen profiel bekijkt
        if (myProfile) {
          fetchFriends(user.uid);
        }
      }
    } catch (error) {
      console.error("Error bij toevoegen vriend:", error.message);
      alert("Er is een fout opgetreden.");
    }
  };

  // Haal vrienden op voor profiel
  const fetchFriends = async (uid) => {
    const userDocRef = doc(db, "Users", uid);
    const userSnap = await getDoc(userDocRef);
    if (userSnap.exists()) {
      const userData = userSnap.data();
      if (userData.friends && userData.friends.length > 0) {
        const friendPromises = userData.friends.map((friendUid) =>
          getDoc(doc(db, "Users", friendUid))
        );
        const friendSnaps = await Promise.all(friendPromises);
        setFriendsList(friendSnaps.filter(snap => snap.exists()).map(snap => snap.data()));
      } else {
        setFriendsList([]);
      }
    }
  };

  // Profiel openen
  const handleProfileClick = async (userId) => {
    setShowProfilePopup(true);
    setSelectedProfile(null);
    setFriendsList([]);
    setMyProfile(userId === user.uid);

    try {
      const userDocRef = doc(db, "Users", userId);
      const userSnap = await getDoc(userDocRef);

      if (userSnap.exists()) {
        const profileData = userSnap.data();
        setSelectedProfile({ ...profileData, uid: userId });
        if (userId === user.uid) {
          // Alleen op je eigen profiel vriendenlijst tonen
          fetchFriends(userId);
        }
      } else {
        alert("Profiel niet gevonden!");
      }
    } catch (error) {
      alert("Fout bij ophalen profiel.");
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
      alert("Je hebt deze post al geliket!");
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

  // Nieuwe functie voor het openen van de vriend toevoegen popup
  const handleAddFriendPopup = async (friendUid) => {
    // Haal het profiel op van de gebruiker die je wilt toevoegen
    const friendRef = doc(db, "Users", friendUid);
    const friendSnap = await getDoc(friendRef);
    if (friendSnap.exists()) {
      const friendData = friendSnap.data();
      setPendingFriend({ uid: friendUid, name: friendData.name, private: friendData.private });
      setShowAddFriendPopup(true);
    } else {
      alert("Gebruiker niet gevonden!");
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
          onChange={(e) => setSearchQuery(e.target.value)}
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
            Geplaatst door: {task.userEmail}
            {/* Voeg direct de knop toe */}
            {task.userId !== user.uid && (
              <button
                onClick={() => handleAddFriendPopup(task.userId)}
                className="add-friend-button"
              >
                Voeg toe als vriend
              </button>
            )}
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
            {/* Alleen vriendenlijst tonen op eigen profiel */}
            {myProfile && (
              <div className="friends-list">
                <h3>Mijn Vrienden:</h3>
                {friendsList.length > 0 ? (
                  <ul>
                    {friendsList.map((friend, index) => (
                      <li key={index}>{friend.name}</li>
                    ))}
                  </ul>
                ) : (
                  <p>Je hebt nog geen vrienden.</p>
                )}
              </div>
            )}
            {/* Alleen knop tonen als je NIET je eigen profiel bekijkt */}
            {!myProfile && (
              <button
                onClick={() => {
                  setPendingFriend({ uid: selectedProfile.uid, private: selectedProfile.private });
                  setShowAddFriendPopup(true);
                }}
                className="add-friend-button"
              >
                Voeg toe als vriend
              </button>
            )}
            <button
              onClick={() => setShowProfilePopup(false)}
              className="close-popup-button"
            >
              Sluiten
            </button>
          </div>
        </div>
      )}

      {showAddFriendPopup && pendingFriend && (
        <div className="popup-overlay">
          <div className="popup-content">
            <p>Wil je {pendingFriend.name} toevoegen als vriend?</p>
            <button
              onClick={() => {
                handleAddFriend(pendingFriend.uid, pendingFriend.private);
                setShowAddFriendPopup(false);
              }}
            >
              Ja, toevoegen
            </button>
            <button onClick={() => setShowAddFriendPopup(false)}>
              Annuleren
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default HomePage;
