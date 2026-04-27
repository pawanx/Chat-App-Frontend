import { useEffect, useState, useRef } from "react";
import EmojiPicker from "emoji-picker-react";
import axios from "axios";
import { io } from "socket.io-client";
import MessageList from "../components/MessageList";
import "../styles/chat.css";

const API_URL = "https://chat-app-backend-e81z.onrender.com";

export default function Chat({ user }) {
  const socketRef = useRef(null);

  const [showPicker, setShowPicker] = useState(false);
  const [users, setUsers] = useState([]);
  const [currentChat, setCurrentChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState("");
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [isTyping, setIsTyping] = useState(false);
  const typingTimeoutRef = useRef(null);
  const bottomRef = useRef(null);
  const [unreadCounts, setUnreadCounts] = useState({});
  const [activeUserStatus, setActiveUserStatus] = useState({
    isOnline: false,
    lastSeen: null,
  });

  // ---------------- SOCKET INIT ----------------
  useEffect(() => {
    if (!user?._id) return;

    socketRef.current = io(API_URL, {
      transports: ["websocket"],
      withCredentials: true,
    });

    const socket = socketRef.current;

    socket.on("connect", () => {
      socket.emit("join", user._id);
    });

    socket.io.on("reconnect", () => {
      socket.emit("join", user._id);
    });

    return () => socket.disconnect();
  }, [user]);

  // ------------------ Format last seen ------------------
  const formatLastSeen = (date) => {
    if (!date) return "";
    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  //---------------------Handle Emoji Picker ---------------
  const handleEmojiPicker = (emojiData) => {
    setText((prev) => prev + emojiData.emoji);
    setShowPicker(false);
  };

  // ------------------ ONLINE + OFFLINE  ------------------
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.on("onlineUsers", (users) => {
      const list = users.map((u) => u.toString());
      if (user?._id && !list.includes(user._id.toString())) {
        list.push(user._id.toString());
      }

      setOnlineUsers(list);
    });

    socket.on("userOnline", (userId) => {
      const id = userId.toString();

      setOnlineUsers((prev) => {
        if (prev.includes(id)) return prev;
        return [...prev, id];
      });

      if (id === currentChat?._id?.toString()) {
        setActiveUserStatus((prev) => ({
          ...prev,
          isOnline: true,
        }));
      }
    });

    socket.on("userOffline", (data) => {
      const id = data.userId.toString();

      // remove from online list
      setOnlineUsers((prev) => prev.filter((uid) => uid !== id));

      // update last seen
      if (id === currentChat?._id?.toString()) {
        setActiveUserStatus({
          isOnline: false,
          lastSeen: data.lastSeen,
        });
      }
    });

    return () => {
      socket.off("onlineUsers");
      socket.off("userOnline");
      socket.off("userOffline");
    };
  }, []);

  //-------------------SYNC HEADER STATUS ------------------
  useEffect(() => {
    if (!currentChat) return;

    const isOnline = onlineUsers.includes(currentChat._id.toString());

    setActiveUserStatus((prev) => ({
      ...prev,
      isOnline,
    }));
  }, [onlineUsers, currentChat]);

  // ------------------ Auto scroll ------------------
  useEffect(() => {
    setTimeout(() => {
      bottomRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  }, [messages]);

  // ------------------ Typing emit ------------------
  const handleTyping = (e) => {
    setText(e.target.value);

    if (!currentChat) return;

    const socket = socketRef.current;
    if (!socket) return;

    socket.emit("typing", {
      sender: user._id,
      receiver: currentChat._id,
    });

    clearTimeout(typingTimeoutRef.current);

    typingTimeoutRef.current = setTimeout(() => {
      socket.emit("stop_typing", {
        sender: user._id,
        receiver: currentChat._id,
      });
    }, 1000);
  };

  // ------------------ Status update ------------------
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.on("message_status_update", ({ messageId, status }) => {
      console.log("LIVE STATUS:", messageId, status);
      setMessages((prev) =>
        prev.map((msg) =>
          msg._id?.toString() === messageId?.toString()
            ? { ...msg, status }
            : msg,
        ),
      );
    });

    return () => socket.off("message_status_update");
  }, []);

  // ------------------ Typing listener ------------------
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.on("typing", ({ sender }) => {
      if (sender.toString() === currentChat?._id?.toString()) {
        setIsTyping(true);
      }
    });

    socket.on("stop_typing", ({ sender }) => {
      if (sender.toString() === currentChat?._id?.toString()) {
        setIsTyping(false);
      }
    });

    return () => {
      socket.off("typing");
      socket.off("stop_typing");
    };
  }, [currentChat]);

  // ------------------ Join room ------------------
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket || !user?._id) return;
    if (!user?._id) return;
    socket.emit("join", user._id);
  }, [user]);

  // ------------------ Fetch users ------------------
  useEffect(() => {
    if (!user) return;

    axios
      .get(`${API_URL}/users`, {
        params: { currentUserId: user._id },
      })
      .then((res) => setUsers(res.data))
      .catch(console.log);
  }, [user]);

  // ------------------ Receive message ------------------
  useEffect(() => {
    const socket = socketRef.current;
    if (!socket) return;
    socket.on("receive_message", (msg) => {
      console.log("RECEIVED:", msg._id, "FROM:", msg.sender);
      const senderId = msg.sender.toString();

      const isCurrentChat =
        msg.sender.toString() === currentChat?._id?.toString() ||
        msg.receiver.toString() === currentChat?._id?.toString();

      //  AUTO SEEN (REAL-TIME BLUE TICK)
      if (msg.sender.toString() === currentChat?._id?.toString()) {
        socket.emit("message_seen", {
          messageId: msg._id,
          sender: msg.sender,
        });
      }

      // unread count
      if (
        senderId !== user._id.toString() &&
        senderId !== currentChat?._id?.toString()
      ) {
        setUnreadCounts((prev) => ({
          ...prev,
          [senderId]: (prev[senderId] || 0) + 1,
        }));
      }

      // ------------------  FIXED TEMP REPLACEMENT ------------------
      if (isCurrentChat) {
        setMessages((prev) => {
          const index = prev.findIndex(
            (m) =>
              m.temp &&
              m.message === msg.message &&
              m.sender?.toString() === msg.sender?.toString(),
          );

          if (index !== -1) {
            const updated = [...prev];
            updated[index] = msg; //  replace temp with real
            return updated;
          }

          return [...prev, msg];
        });
      }
    });

    return () => socket.off("receive_message");
  }, [currentChat, user]);

  // ------------------ Open chat ------------------
  const openChat = async (selectedUser) => {
    setActiveUserStatus({
      isOnline: onlineUsers.includes(selectedUser._id.toString()),
      lastSeen: selectedUser.lastSeen || null,
    });

    try {
      const { data } = await axios.get(`${API_URL}/messages`, {
        params: {
          sender: user._id,
          receiver: selectedUser._id,
        },
      });

      setMessages(data);
      setCurrentChat(selectedUser);

      const chatId = selectedUser._id.toString();

      setUnreadCounts((prev) => ({
        ...prev,
        [chatId]: 0,
      }));

      const socket = socketRef.current;

      if (socket) {
        data.forEach((msg) => {
          if (msg.receiver === user._id && msg.status !== "seen") {
            socket.emit("message_seen", {
              messageId: msg._id,
              sender: msg.sender,
            });
          }
        });
      }
    } catch (err) {
      console.log(err);
    }
  };

  // ------------------ Send message ------------------
  const sendMessage = () => {
    if (!text.trim() || !currentChat) return;
    const socket = socketRef.current;
    if (!socket) return;

    const tempId = "temp-" + Date.now();

    const msg = {
      sender: user._id,
      receiver: currentChat._id,
      message: text,
      _id: tempId,
      status: "sent",
      createdAt: new Date(),
      temp: true,
    };

    socket.emit("send_message", msg);

    setMessages((prev) => [...prev, msg]);
    setText("");
  };

  return (
    <div className="chat-container">
      {/* LEFT */}
      <div className="chat-sidebar">
        <h3>Users</h3>

        {users.map((u) => {
          const uid = u._id.toString();

          return (
            <div
              key={u._id}
              className={`user ${
                currentChat?._id?.toString() === uid ? "active" : ""
              }`}
              onClick={() => openChat(u)}
            >
              <div style={{ display: "flex", gap: "6px" }}>
                <span>{u.username}</span>

                {unreadCounts[uid] > 0 && (
                  <span className="badge">{unreadCounts[uid]}</span>
                )}
              </div>

              <span
                className={`status-dot ${
                  onlineUsers.includes(uid) ? "online" : "offline"
                }`}
              />
            </div>
          );
        })}
      </div>

      {/* RIGHT */}
      <div className="chat-window">
        {currentChat ? (
          <>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
              }}
            >
              <h3 style={{ margin: 0 }}>{currentChat.username}</h3>

              <span style={{ fontSize: "12px", color: "#666" }}>
                {onlineUsers.includes(currentChat._id.toString())
                  ? "🟢 Online"
                  : `Last seen ${formatLastSeen(activeUserStatus.lastSeen)}`}
              </span>
            </div>

            {isTyping && <p className="typing">typing...</p>}

            <MessageList
              messages={messages}
              user={user}
              bottomRef={bottomRef}
            />

            <div className="input-area" style={{ position: "relative" }}>
              <button onClick={() => setShowPicker((prev) => !prev)}>😊</button>
              {showPicker && (
                <div
                  style={{
                    position: "absolute",
                    bottom: "50px",
                    zIndex: 1000,
                  }}
                >
                  <EmojiPicker onEmojiClick={handleEmojiPicker} />
                </div>
              )}
              <input
                value={text}
                onChange={handleTyping}
                placeholder="Type message..."
              />
              <button onClick={sendMessage}>Send</button>
            </div>
          </>
        ) : (
          <p>Select a user to start chatting</p>
        )}
      </div>
    </div>
  );
}
