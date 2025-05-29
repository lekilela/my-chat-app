import React, { useState, useEffect, useRef } from 'react';
import { auth, provider, db } from '../firebase';
import {
  signInWithPopup,


  signOut,
  onAuthStateChanged
} from 'firebase/auth';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  getDoc,
  setDoc,
  deleteDoc,
  serverTimestamp,
  addDoc,
  onSnapshot,
  orderBy,
  updateDoc  // 👈 Dodaj ovo
} from 'firebase/firestore';

import EmojiPicker from 'emoji-picker-react';

import LogIn from '../components/LogIn';
import Signup from '../components/Signup';
import "../styles/Chat.css";

// ---------------- ChatList -----------------
const ChatList = ({ currentUser, selectUser, selectGroup }) => {
  const [contacts, setContacts] = useState([]);
  const [emailInput, setEmailInput] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const contactQ = query(collection(db, `contacts/${currentUser.uid}/list`));
      const contactSnap = await getDocs(contactQ);

      const contactPromises = contactSnap.docs.map(async (docSnap) => {
        const data = docSnap.data();
      return {
  uid: data.uid,
  displayName: data.displayName || data.email,
  email: data.email,
  photoURL: data.photoURL || '',
  gender: data.gender || 'male', // ➕ dodano
  isGroup: false
};

      });

      const users = await Promise.all(contactPromises);

      const groupQ = query(collection(db, 'groups'), where('members', 'array-contains', currentUser.uid));
      const groupSnap = await getDocs(groupQ);
      const groups = groupSnap.docs.map(doc => ({
        uid: doc.id,
        displayName: doc.data().name,
        isGroup: true
      }));

      setContacts([...users, ...groups]);
    };

    fetchData();
  }, [currentUser]);

  const handleAddContact = async () => {
    if (!emailInput.trim()) return;

    try {
      const q = query(collection(db, 'users'), where('email', '==', emailInput));
      const querySnapshot = await getDocs(q);

      if (querySnapshot.empty) {
        alert('User not found');
        return;
      }

      const userDoc = querySnapshot.docs[0];
      const contactId = userDoc.id;
      const contactData = userDoc.data();

      const contactRef = doc(db, `contacts/${currentUser.uid}/list`, contactId);

     await setDoc(contactRef, {
  uid: contactId,
  displayName: contactData.displayName || '',
  email: contactData.email || '',
  photoURL: contactData.photoURL || '',
  gender: contactData.gender || 'male', // ➕ DODANO!
  addedAt: serverTimestamp()
});


      setEmailInput('');
      alert('Contact added successfully!');
    } catch (error) {
      console.error("Error adding contact:", error);
      alert('Failed to add contact.');
    }
  };

  return (
    <aside className="chat-sidebar">
      <h2 className="chat-title">Chats</h2>
      <div className="chat-search">
        <input
          value={emailInput}
          onChange={(e) => setEmailInput(e.target.value)}
          placeholder="Add contact by email"
        />
        <button onClick={handleAddContact}>Add</button>
      </div>
     <div className="chat-contacts">
  {contacts.map((user) =>
    user.displayName ? (
      <div
        key={user.uid}
        className="chat-contact"
        onClick={() => user.isGroup ? selectGroup(user) : selectUser(user)}
      >
      <img
  src={
    user.photoURL ||
    (user.gender === "female" ? "/girl.png" : "/man.png")
  }
  alt="avatar"
  className="contact-avatar"
/>

        <div className="contact-name">{user.displayName}</div>
      </div>
    ) : null
  )}
</div>

    </aside>
  );
};

// ---------------- ChatWindow -----------------
const ChatWindow = ({ currentUser, selectedUser, isGroup = false }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [lastSeen, setLastSeen] = useState(null); // ➕ Last seen
  const messagesEndRef = useRef(null);

  const chatPath = isGroup
    ? ["groupMessages", selectedUser.uid, "messages"]
    : ["privateMessages", [currentUser.uid, selectedUser.uid].sort().join('_'), "messages"];

  useEffect(() => {
    const msgRef = collection(db, ...chatPath);
    const q = query(msgRef, orderBy("timestamp"));
    const unsub = onSnapshot(q, async (snapshot) => {
      const msgs = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setMessages(msgs);

      // Mark unseen messages as seen
      const updates = snapshot.docs
        .filter(docSnap => {
          const msg = docSnap.data();
          return msg.sender !== currentUser.uid && !msg.seen;
        })
        .map(docSnap => {
          const ref = doc(db, ...chatPath, docSnap.id);
          return setDoc(ref, { seen: true }, { merge: true });
        });

      await Promise.all(updates);
    });
    return () => unsub();
  }, [currentUser.uid, selectedUser.uid]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // 🔁 Fetch last seen time (only for private chats)
  useEffect(() => {
    if (!selectedUser || isGroup) return;

    const fetchLastSeen = async () => {
      const userRef = doc(db, 'users', selectedUser.uid);
      const snap = await getDoc(userRef);
      if (snap.exists()) {
        const data = snap.data();
        if (data.lastSeen) {
          setLastSeen(data.lastSeen.toDate());
        }
      }
    };

    fetchLastSeen();
  }, [selectedUser]);

  const handleSend = async () => {
    if (!newMessage.trim()) return;

    const contactRef = doc(db, `contacts/${selectedUser.uid}/list/${currentUser.uid}`);
    const contactSnap = await getDoc(contactRef);

    if (!contactSnap.exists()) {
      const requestRef = doc(db, `messageRequests/${selectedUser.uid}/from/${currentUser.uid}`);
      const requestSnap = await getDoc(requestRef);

      if (!requestSnap.exists()) {
        await setDoc(requestRef, {
          uid: currentUser.uid,
          displayName: currentUser.displayName || currentUser.email,
          email: currentUser.email,
          photoURL: currentUser.photoURL || '',
          timestamp: serverTimestamp()
        });
      }

      alert('They have not added you yet. A request has been sent.');
      return;
    }

    const msgRef = collection(db, ...chatPath);
    await addDoc(msgRef, {
      text: newMessage,
      sender: currentUser.uid,
      timestamp: serverTimestamp()
    });

    setNewMessage('');
  };

  return (
    <main className="chat-main">
      <div className="chat-header">
        {selectedUser.displayName}
        {!isGroup && (
          <div style={{ fontSize: "12px", fontWeight: "normal" }}>
            {lastSeen ? `Last seen: ${lastSeen.toLocaleString()}` : ""}
          </div>
        )}
      </div>

      <div className="message-area">
        {messages.map(msg => (
          <div
            key={msg.id}
            className={`message-bubble ${msg.sender === currentUser.uid ? "message-sent" : "message-received"}`}
          >
            <div>{msg.text}</div>
            {msg.timestamp && (
              <span className="message-time">
                {new Date(msg.timestamp.toDate()).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                {msg.sender === currentUser.uid && msg.seen && ' · Seen'}
                {msg.sender === currentUser.uid && !msg.seen && ' · Delivered'}
              </span>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="message-input">
        <div className="emoji-container">
          <button className="emoji-button" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>😊</button>
          {showEmojiPicker && (
            <div className="emoji-dropdown">
              <EmojiPicker
                theme="light"
                previewConfig={{ showPreview: false }}
                searchDisabled={true}
                skinTonesDisabled={true}
                onEmojiClick={(emojiData) => {
                  setNewMessage(prev => prev + emojiData.emoji);
                }}
              />
            </div>
          )}
        </div>
        <input
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          placeholder="Type a message"
        />
        <button onClick={handleSend}>Send</button>
      </div>
    </main>
  );
};


// ---------------- ChatPage -----------------
const ChatPage = () => {
  const [user, setUser] = useState(null);
  const [selectedUser, setSelectedUser] = useState(null);
  const [selectedGroup, setSelectedGroup] = useState(null);

  const handleSelectUser = (user) => {
    setSelectedUser(user);
    setSelectedGroup(null);
  };

  const handleSelectGroup = (group) => {
    setSelectedGroup(group);
    setSelectedUser(null);
  };

useEffect(() => {
  const unsub = onAuthStateChanged(auth, async (currentUser) => {
    if (currentUser) {
      const userRef = doc(db, 'users', currentUser.uid);
      const userSnap = await getDoc(userRef);

      if (userSnap.exists()) {
        setUser(userSnap.data());
      } else {
        const fallbackData = {
          uid: currentUser.uid,
          displayName: currentUser.displayName || currentUser.email,
          email: currentUser.email,
          gender: "male"
        };
        await setDoc(userRef, fallbackData);
        setUser(fallbackData);
      }
    }
  });
  return () => unsub();
}, []);


  useEffect(() => {
    if (!user) return;

    const q = collection(db, `messageRequests/${user.uid}/from`);
    const unsub = onSnapshot(q, (snapshot) => {
      snapshot.forEach((docSnap) => {
        const requester = docSnap.data();
        const contactRef = doc(db, `contacts/${user.uid}/list/${requester.uid}`);
        getDoc(contactRef).then((contactSnap) => {
          if (!contactSnap.exists()) {
            const confirmed = window.confirm(`${requester.displayName} (${requester.email}) wants to chat with you. Accept?`);
            if (confirmed) {
              setDoc(contactRef, {
                uid: requester.uid,
                displayName: requester.displayName,
                email: requester.email,
                photoURL: requester.photoURL || '',
                addedAt: serverTimestamp()
              });
              deleteDoc(doc(db, `messageRequests/${user.uid}/from/${requester.uid}`));
            }
          }
        });
      });
    });

    return () => unsub();
  }, [user]);

  const login = () => signInWithPopup(auth, provider);
  const logout = async () => {
  if (user) {
    const userRef = doc(db, 'users', user.uid);
    await updateDoc(userRef, {
      lastSeen: serverTimestamp()
    });
    await signOut(auth);
  }
};


  if (!user) {
    return (
      <div className="login-box">
        <h2>Welcome to WhatsApp Clone</h2>
        <button onClick={login}>Login with Google</button>
        <h3>Or login with Email</h3>
        <LogIn />
        <h3>New user? Sign up below:</h3>
        <Signup />
      </div>
    );
  }

  return (
    <div className="chat-container">
      <div className="sidebar-wrapper">
  <div className="profile-box">
    <img
      src={user.gender === "female" ? "/girl.png" : "/man.png"}
      alt="avatar"
      className="profile-avatar"
    />
    <div className="profile-info">
      <strong>{user.displayName || user.email}</strong>
      <div className="profile-email">{user.email}</div>
      <button
        onClick={async () => {
          const newName = prompt("Enter new display name:");
          if (newName) {
            const userRef = doc(db, 'users', user.uid);
            await setDoc(userRef, { displayName: newName }, { merge: true });
setUser(prev => ({ ...prev, displayName: newName }));

          }
        }}
      >
        Edit Name
      </button>
    </div>
  </div>

  <ChatList currentUser={user} selectUser={handleSelectUser} selectGroup={handleSelectGroup} />
</div>

      {selectedGroup ? (
        <ChatWindow currentUser={user} selectedUser={selectedGroup} isGroup={true} />
      ) : selectedUser ? (
        <ChatWindow currentUser={user} selectedUser={selectedUser} />
      ) : (
        <main className="chat-main">
          <div className="message-area center-text">Select a user or group to start chatting</div>
        </main>
      )}

      <button onClick={logout} className="logout-button">Logout</button>
    </div>
  );
};

export default ChatPage;
