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
  serverTimestamp,
  addDoc,
  onSnapshot,
  orderBy
} from 'firebase/firestore';
import EmojiPicker from 'emoji-picker-react';

import LogIn from '../components/LogIn';
import Signup from '../components/Signup';
import "../styles/Chat.css";

const ChatList = ({ currentUser, selectUser, selectGroup }) => {
  const [contacts, setContacts] = useState([]);
  const [emailInput, setEmailInput] = useState('');

  useEffect(() => {
    const fetchData = async () => {
      const contactQ = query(collection(db, `contacts/${currentUser.uid}/list`));
      const contactSnap = await getDocs(contactQ);
      const contactPromises = contactSnap.docs.map(async (docSnap) => {
        const userRef = doc(db, 'users', docSnap.id);
        const userDoc = await getDoc(userRef);
        return { uid: userDoc.id, ...userDoc.data(), isGroup: false };
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
    const q = query(collection(db, 'users'), where('email', '==', emailInput));
    const querySnapshot = await getDocs(q);
    if (!querySnapshot.empty) {
      const contactId = querySnapshot.docs[0].id;
      const contactRef = doc(db, `contacts/${currentUser.uid}/list/${contactId}`);
      await setDoc(contactRef, { addedAt: serverTimestamp() });
      setEmailInput('');
    } else {
      alert('User not found');
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
        {contacts.map((user) => (
          <div
            key={user.uid}
            className="chat-contact"
            onClick={() => user.isGroup ? selectGroup(user) : selectUser(user)}
          >
            <div className="contact-name">{user.displayName}</div>
            <div className="contact-hint">{user.isGroup ? "Group chat" : "Tap to chat"}</div>
          </div>
        ))}
      </div>
    </aside>
  );
};

const ChatWindow = ({ currentUser, selectedUser, isGroup = false }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState("");
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
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

    // Mark unseen messages from other user as seen
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

  const handleSend = async () => {
    if (!newMessage.trim()) return;
    const msgRef = collection(db, ...chatPath);
    await addDoc(msgRef, {
      text: newMessage,
      sender: currentUser.uid,
      timestamp: serverTimestamp(),
    });
    setNewMessage("");
  };

  return (
    <main className="chat-main">
      <div className="chat-header">
        {selectedUser.displayName}
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
        setUser(currentUser);
        const userRef = doc(db, 'users', currentUser.uid);
        const docSnap = await getDoc(userRef);
        if (!docSnap.exists()) {
          await setDoc(userRef, {
            uid: currentUser.uid,
            displayName: currentUser.displayName,
            email: currentUser.email,
          });
        }
      }
    });
    return () => unsub();
  }, []);

  const login = () => signInWithPopup(auth, provider);
  const logout = () => signOut(auth);

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
