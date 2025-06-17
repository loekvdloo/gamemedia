import { useEffect, useState } from "react";
import { getDocs, updateDoc, collection, doc } from "firebase/firestore";
import { db } from "./config/firebase";
import { getAuth } from "firebase/auth";
import './GameMedia.css';

function HomePage() {
  const [taskList, setTaskList] = useState([]);
  const [filteredTaskList, setFilteredTaskList] = useState([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [mostLikedPost, setMostLikedPost] = useState(null);
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

    setTaskList((prevTasks) => {
      const updatedTasks = prevTasks
        .map((task) =>
          task.id === taskId
            ? { ...task, likes: newLikes, likedBy: updatedLikedBy }
            : task
        )
        .sort((a, b) => b.likes - a.likes); // Re-sort after updating likes

      // Update the most liked post
      setMostLikedPost(updatedTasks[0]);

      return updatedTasks;
    });
  };

  const handleAddComment = async (taskId, comment) => {
    const taskDoc = doc(db, "Task", taskId);
    const task = taskList.find((task) => task.id === taskId);
    const updatedComments = [...(task.comments || []), { text: comment, likes: 0 }];

    await updateDoc(taskDoc, { comments: updatedComments });

    setTaskList((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, comments: updatedComments } : task
      )
    );
  };

  const handleLikeComment = async (taskId, commentIndex) => {
    const taskDoc = doc(db, "Task", taskId);
    const task = taskList.find((task) => task.id === taskId);
    const updatedComments = task.comments.map((comment, index) =>
      index === commentIndex ? { ...comment, likes: comment.likes + 1 } : comment
    );

    await updateDoc(taskDoc, { comments: updatedComments });

    setTaskList((prevTasks) =>
      prevTasks.map((task) =>
        task.id === taskId ? { ...task, comments: updatedComments } : task
      )
    );
  };

  return (
    <div>
      <h2>Alle berichten</h2>

      {/* Search Bar */}
      <input
        type="text"
        placeholder="Zoek op titel van post"
        value={searchQuery}
        onChange={(e) => handleSearch(e.target.value)}
        style={{ marginBottom: 20, padding: 5, width: "100%" }}
      />

      {/* Display the most liked post */}
      {mostLikedPost && (
        <div style={{ marginBottom: 20, border: "2px solid gold", padding: 10 }}>
          <h3>Most Liked Post of the Day</h3>
          <p>
            <strong>{mostLikedPost.name}</strong>
          </p>
          {mostLikedPost.imageUrl && (
            <img
              src={mostLikedPost.imageUrl}
              alt="Most liked post"
              style={{ width: 150 }}
            />
          )}
          <p style={{ fontSize: 12, color: "#666" }}>
            Geplaatst door: {mostLikedPost.userEmail}
          </p>
          <p>Likes: {mostLikedPost.likes || 0}</p>
        </div>
      )}

      {/* Display filtered posts */}
      {filteredTaskList.map((task) => (
        <div key={task.id} style={{ marginTop: 10 }}>
          <p>
            <strong>{task.name}</strong>
          </p>
          {task.imageUrl && (
            <img src={task.imageUrl} alt="taak" style={{ width: 100 }} />
          )}
          <p style={{ fontSize: 12, color: "#666" }}>
            Geplaatst door: {task.userEmail}
          </p>
          <p>
            Likes: {task.likes || 0}{" "}
            <button
              onClick={() =>
                handleLike(task.id, task.likes || 0, task.likedBy || [])
              }
            >
              Like
            </button>
          </p>
          <div>
            <h4>Comments:</h4>
            <ul>
              {(task.comments || [])
                .sort((a, b) => b.likes - a.likes) // Sort comments by likes
                .map((comment, index) => (
                  <li key={index}>
                    {comment.text} - Likes: {comment.likes || 0}{" "}
                    <button onClick={() => handleLikeComment(task.id, index)}>
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
            />
          </div>
        </div>
      ))}
    </div>
  );
}

export default HomePage;
