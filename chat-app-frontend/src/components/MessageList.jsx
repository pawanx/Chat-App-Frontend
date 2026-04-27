import "../styles/message.css";

export default function MessageList({ messages, user, bottomRef }) {
  const renderTicks = (msg) => {
    if (!user || msg.sender?.toString() !== user?._id?.toString()) return null;

    if (msg.status === "sent") return "✓";
    if (msg.status === "delivered" || msg.status === "seen") return "✓✓";

    return null;
  };

  //-------------TIME FORMAT FOR MESSAGE----------------
  const formatTime = (date) => {
    if (!date) return "";

    return new Date(date).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="message-list">
      {messages.map((msg, index) => {
        const isMe = user && msg.sender?.toString() === user?._id?.toString();
        return (
          <div
            key={msg._id || index}
            className={`message ${isMe ? "sent" : "received"} ${
              msg.temp ? "message-animate" : ""
            }`}
          >
            <div className="message-text">{msg.message}</div>
            {/* ticks only for sender */}

            <div className="message-meta">
              <span className="time">
                {formatTime(msg.createdAt || new Date())}
              </span>

              {isMe && (
                <span className={`ticks ${msg.status}`}>
                  {renderTicks(msg)}
                </span>
              )}
            </div>
          </div>
        );
      })}
      <div ref={bottomRef} />
    </div>
  );
}
