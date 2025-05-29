import React, { useState, useEffect, useRef } from 'react';
import { collection, query, orderBy, onSnapshot, addDoc, serverTimestamp, getDocs, doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../firebase';
import { v4 as uuid } from 'uuid';
import EmojiPicker from 'emoji-picker-react';

export const GroupSidebar = ({ currentUser, selectGroup }) => {
  const [groups, setGroups] = useState([]);

  useEffect(() => {
    const q = query(collection(db, 'groups'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allGroups = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(group => group.members.includes(currentUser.uid));
      setGroups(allGroups);
    });
    return () => unsubscribe();
  }, [currentUser]);

  const handleCreateGroup = async () => {
    const name = prompt("Enter group name:");
    if (!name) return;

    const members = [currentUser.uid];
    const groupRef = doc(collection(db, 'groups'));
    await setDoc(groupRef, {
      name,
      members
    });
  };

  return (
    <aside className="group-sidebar">
      <h2 className="chat-title">My Groups</h2>
      <div className="chat-contacts">
        <div onClick={handleCreateGroup} className="chat-contact" style={{ justifyContent: 'center', fontSize: '20px' }}>
          ➕
        </div>
        {groups.map((group) => (
          <div
            key={group.id}
            className="chat-contact"
            onClick={() => selectGroup({ uid: group.id, displayName: group.name })}
          >
            <div className="contact-name">{group.name}</div>
            <div className="contact-hint">Group chat</div>
          </div>
        ))}
      </div>
    </aside>
  );
};

export const GroupChatWindow = ({ currentUser, group }) => {
  const [messages, setMessages] = useState([]);
  const [message, setMessage] = useState('');
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const q = query(collection(db, `groupMessages/${group.uid}/messages`), orderBy('timestamp'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      setMessages(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
    });
    return () => unsubscribe();
  }, [group]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;
    await addDoc(collection(db, `groupMessages/${group.uid}/messages`), {
      text: message,
      senderId: currentUser.uid,
      senderName: currentUser.displayName,
      timestamp: serverTimestamp(),
    });
    setMessage('');
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const imageRef = ref(storage, `groupImages/${group.uid}/${uuid()}`);
    await uploadBytes(imageRef, file);
    const imageUrl = await getDownloadURL(imageRef);
    await addDoc(collection(db, `groupMessages/${group.uid}/messages`), {
      imageUrl,
      senderId: currentUser.uid,
      senderName: currentUser.displayName,
      timestamp: serverTimestamp(),
    });
  };

  return (
    <main className="chat-main">
      <header className="chat-header">{group.displayName}</header>
      <div className="message-area">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`message-bubble ${msg.senderId === currentUser.uid ? 'message-sent' : 'message-received'}`}
          >
            <strong>{msg.senderName}</strong>
            {msg.text && <p>{msg.text}</p>}
            {msg.imageUrl && (
              <img
                src={msg.imageUrl}
                alt="sent-img"
                style={{ maxWidth: '200px', borderRadius: '8px', marginTop: '8px' }}
              />
            )}
            {msg.timestamp && (
              <span className="message-time">
                {new Date(msg.timestamp.toDate()).toLocaleTimeString([], {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </span>
            )}
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <form className="message-input" onSubmit={sendMessage}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type a message..."
        />
        <button type="button" onClick={() => setShowEmojiPicker(!showEmojiPicker)}>😊</button>
        <label style={{ margin: '0 5px' }}>
          📷
          <input type="file" accept="image/*" style={{ display: 'none' }} onChange={handleImageUpload} />
        </label>
        <button type="submit">Send</button>
      </form>

      {showEmojiPicker && (
        <div style={{ position: 'absolute', bottom: '60px', right: '20px', zIndex: 999 }}>
          <EmojiPicker
            onEmojiClick={(emojiData) => setMessage((prev) => prev + emojiData.emoji)}
          />
        </div>
      )}
    </main>
  );
};
