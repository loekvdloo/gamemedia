import { doc, getDoc, updateDoc } from "firebase/firestore";
import { db } from "./config/firebase";

// Stuurt een vriendschapsverzoek van currentUser naar friendUid
export const sendFriendRequest = async (currentUser, friendUid) => {
    if (!friendUid) {
        throw new Error("Geen geldige gebruiker geselecteerd!");
    }

    try {
        const friendDocRef = doc(db, "Users", friendUid);
        const friendSnapshot = await getDoc(friendDocRef);

        if (!friendSnapshot.exists()) {
            throw new Error("Gebruikersdocument niet gevonden!");
        }

        const friendData = friendSnapshot.data();
        const existingRequests = friendData.friendRequests || [];

        if (existingRequests.includes(currentUser.uid)) {
            throw new Error("Vriendschapsverzoek al verzonden!");
        }

        await updateDoc(friendDocRef, {
            friendRequests: [...existingRequests, currentUser.uid],
        });

        return "Vriendschapsverzoek verzonden!";
    } catch (error) {
        throw new Error("Error sending friend request: " + error.message);
    }
};

// Accepteert een vriendschapsverzoek van requesterUid en voegt beide gebruikers elkaars vrienden toe
export const acceptFriendRequest = async (currentUser, requesterUid) => {
    if (!requesterUid) {
        throw new Error("Geen geldige gebruiker geselecteerd!");
    }

    try {
        // Werk het document van de huidige gebruiker bij: voeg requester toe en verwijder het verzoek
        const myDocRef = doc(db, "Users", currentUser.uid);
        const mySnapshot = await getDoc(myDocRef);

        if (!mySnapshot.exists()) {
            throw new Error("Gebruikersdocument niet gevonden!");
        }

        const myData = mySnapshot.data();

        if (myData.friends?.includes(requesterUid)) {
            throw new Error("Jullie zijn al vrienden!");
        }

        const updatedMyFriends = [...(myData.friends || []), requesterUid];
        const updatedFriendRequests = (myData.friendRequests || []).filter(
            (uid) => uid !== requesterUid
        );

        await updateDoc(myDocRef, {
            friends: updatedMyFriends,
            friendRequests: updatedFriendRequests,
        });

        // Werk het document van de requester bij: voeg jou toe als vriend
        const requesterDocRef = doc(db, "Users", requesterUid);
        const requesterSnapshot = await getDoc(requesterDocRef);

        if (requesterSnapshot.exists()) {
            const requesterData = requesterSnapshot.data();
            const updatedRequesterFriends = [...(requesterData.friends || []), currentUser.uid];
            await updateDoc(requesterDocRef, {
                friends: updatedRequesterFriends,
            });
        }

        return "Vriendschap geaccepteerd!";
    } catch (error) {
        throw new Error("Error accepting friend request: " + error.message);
    }
};