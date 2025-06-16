import { useEffect, useState } from "react";
import { getDocs, updateDoc, collection, doc } from "firebase/firestore";
import { db } from "./config/firebase";

function HomePage() {
  const [taskList, setTaskList] = useState([]);
  const [mostLikedPost, setMostLikedPost] = useState(null);

  useEffect(() => {
    const getTasks = async () => {
      const data = await getDocs(collection(db, "Task"));
      const tasks = data.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
      tasks.sort((a, b) => b.likes - a.likes); // Sort by likes in descending order
      setTaskList(tasks);

      // Set the most liked post
      if (tasks.length > 0) {
        setMostLikedPost(tasks[0]); // The first post after sorting is the most liked
      }
    };

    getTasks();
  }, []);

  const handleLike = async (taskId, currentLikes) => {
    const taskDoc = doc(db, "Task", taskId);
    const newLikes = currentLikes + 1;

    await updateDoc(taskDoc, { likes: newLikes });

    setTaskList((prevTasks) => {
      const updatedTasks = prevTasks
        .map((task) =>
          task.id === taskId ? { ...task, likes: newLikes } : task
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
    const updatedComments = [...(task.comments || []), comment];

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

      {/* Display all posts */}
      {taskList.map((task) => (
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
            <button onClick={() => handleLike(task.id, task.likes || 0)}>
              Like
            </button>
          </p>
          <div>
            <h4>Comments:</h4>
            <ul>
              {(task.comments || []).map((comment, index) => (
                <li key={index}>{comment}</li>
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
