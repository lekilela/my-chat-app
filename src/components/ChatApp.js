import React, { useState, useEffect } from 'react';
import '../styles/ChatApp.css';
import { auth, db } from '../firebase';
import {
  collection,
  query,
  where,
  orderBy,
  onSnapshot,
  addDoc,
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from 'firebase/firestore';

const ChatApp = () => {
  const [contacts, setContacts] = useState([]);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');

  useEffect(() => {
    const fetchContacts = async () => {
      const q = query(collection(db, `contacts/${auth.currentUser.uid}/list`));
      const unsubscribe = onSnapshot(q, async (snapshot) => {
        const contactPromises = snapshot.docs.map(async (docSnap) => {
          const userRef = doc(db, 'users', docSnap.id);
          const userDoc = await getDoc(userRef);
          return { uid: docSnap.id, ...userDoc.data() };
        });
        const contactsData = await Promise.all(contactPromises);
        setContacts(contactsData);
      });
      return () => unsubscribe();
    };

    fetchContacts();
  }, []);

  useEffect(() => {
    if (selectedUser) {
      const chatId =
        auth.currentUser.uid > selectedUser.uid
          ? `${auth.currentUser.uid + selectedUser.uid}`
          : `${selectedUser.uid + auth.currentUser.uid}`;

      const q = query(
        collection(db, `privateMessages/${chatId}/messages`),
        orderBy('timestamp')
      );

      const unsubscribe = onSnapshot(q, (snapshot) => {
        const msgs = snapshot.docs.map((doc) => doc.data());
        setMessages(msgs);
      });

      return () => unsubscribe();
    }
  }, [selectedUser]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    const chatId =
      auth.currentUser.uid > selectedUser.uid
        ? `${auth.currentUser.uid + selectedUser.uid}`
        : `${selectedUser.uid + auth.currentUser.uid}`;

    await addDoc(collection(db, `privateMessages/${chatId}/messages`), {
      text: newMessage,
      from: auth.currentUser.uid,
      to: selectedUser.uid,
      timestamp: serverTimestamp()
    });

    setNewMessage('');
  };

  return (
    <div className="chat-container">
      <aside className="chat-sidebar">
        <div className="chat-search">
          <input placeholder="Search or start a new chat" />
        </div>
        <div className="chat-contacts">
          {contacts.map((user) => (
            <div
              key={user.uid}
              className="chat-contact"
              onClick={() => setSelectedUser(user)}
            >
              {user.displayName || user.email}
            </div>
          ))}
        </div>
      </aside>

      {selectedUser ? (
        <main className="chat-main">
          <div className="message-area">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`message-bubble ${
                  msg.from === auth.currentUser.uid
                    ? 'message-sent'
                    : 'message-received'
                }`}
              >
                {msg.text}
              </div>
            ))}
          </div>
          <form className="message-input" onSubmit={sendMessage}>
            <input
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
              placeholder="Type a message"
            />
            <button type="submit">Send</button>
          </form>
        </main>
      ) : (
        <main className="chat-main">
          <div className="message-area" style={{ justifyContent: 'center', alignItems: 'center', textAlign: 'center' }}>
            <p>Select a contact to start chatting</p>
          </div>
        </main>
      )}
    </div>
  );
};

export default ChatApp;