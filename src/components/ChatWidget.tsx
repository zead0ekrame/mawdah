"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { MessageCircle, X, Send } from "lucide-react";
import { useRouter } from "next/navigation";

interface Message {
  id: string;
  content: string;
  isFromBot: boolean;
  createdAt: string;
}

export default function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const router = useRouter();

  // Hide widget on auth page
  const [isAuthPage, setIsAuthPage] = useState(false);
  useEffect(() => {
    setIsAuthPage(window.location.pathname === "/");
  }, []);

  const scrollToBottom = () =>
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });

  useEffect(() => {
    if (isOpen) scrollToBottom();
  }, [messages, isTyping, isOpen]);

  const loadMessages = useCallback(async () => {
    try {
      const res = await fetch("/api/bot");
      if (!res.ok) return;
      const data = await res.json();
      if (data.messages?.length > 0) {
        setMessages(data.messages);
      } else {
        setMessages([{
          id: "welcome",
          isFromBot: true,
          createdAt: new Date().toISOString(),
          content: "أهلاً! أنا أنيس، رفيقك الذكي.\nإزيك؟ إيه اللي أقدر أساعدك بيه النهارده؟",
        }]);
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      loadMessages();
    }
  }, [isOpen, loadMessages, messages.length]);

  const sendMessage = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const content = input.trim();
    if (!content || loading) return;
    setInput("");
    setLoading(true);

    const userMsg: Message = {
      id: Date.now().toString(), content,
      isFromBot: false, createdAt: new Date().toISOString(),
    };
    setMessages(prev => [...prev, userMsg]);
    setIsTyping(true);

    try {
      const res = await fetch("/api/bot", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content }),
      });
      setIsTyping(false);
      const data = await res.json();
      if (data.message) {
        setMessages(prev => [...prev, data.message]);
      }
      if (data.navigateTo) {
        setTimeout(() => router.push(data.navigateTo), 800);
      }
    } catch {
      setIsTyping(false);
      setMessages(prev => [...prev, {
        id: Date.now().toString(),
        content: "حصلت مشكلة في الاتصال. يرجى المحاولة مرة أخرى.",
        isFromBot: true,
        createdAt: new Date().toISOString()
      }]);
    } finally {
      setLoading(false);
    }
  };

  if (isAuthPage) return null;

  return (
    <>
      <button 
        className="chat-widget-btn"
        onClick={() => setIsOpen(!isOpen)}
        aria-label="محادثة أنيس"
        style={{
          padding: 0,
          overflow: "hidden"
        }}
      >
        {isOpen ? <X size={24} /> : <img src="/bot-avatar.png" alt="أنيس" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />}
      </button>

      {isOpen && (
        <div className="chat-widget-window">
          <div className="chat-widget-header">
            <div className="chat-widget-header-info">
              <img src="/bot-avatar.png" alt="أنيس" />
              <div>
                <h3>أنيس</h3>
                <span>متصل الآن</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)} className="close-btn">
              <X size={20} />
            </button>
          </div>

          <div className="chat-widget-messages">
            {messages.map(msg => (
              <div key={msg.id} className={`message ${msg.isFromBot ? "bot" : "user"}`}>
                {msg.isFromBot && <div className="message-avatar"><img src="/bot-avatar.png" alt="Mawaddah" /></div>}
                <div>
                  <div className="bubble" style={{ whiteSpace: "pre-line" }}>{msg.content}</div>
                </div>
              </div>
            ))}
            {isTyping && (
              <div className="message bot">
                <div className="message-avatar"><img src="/bot-avatar.png" alt="Mawaddah" /></div>
                <div className="typing-indicator">
                  <span className="typing-dot" /><span className="typing-dot" /><span className="typing-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <form onSubmit={sendMessage} className="chat-widget-input">
            <input
              type="text"
              placeholder="اكتب رسالتك..."
              value={input}
              onChange={e => setInput(e.target.value)}
              disabled={loading}
            />
            <button type="submit" disabled={loading || !input.trim()}>
              <Send size={18} />
            </button>
          </form>
        </div>
      )}
      <style jsx>{`
        .chat-widget-btn {
          position: fixed;
          bottom: 24px;
          right: 24px;
          width: 60px;
          height: 60px;
          border-radius: 50%;
          background: linear-gradient(135deg, var(--primary), var(--primary-light));
          color: white;
          border: none;
          box-shadow: 0 8px 24px rgba(14, 90, 67, 0.4);
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 100;
          transition: transform 0.2s;
        }
        .chat-widget-btn:hover {
          transform: scale(1.05);
        }

        .chat-widget-window {
          position: fixed;
          bottom: 100px;
          right: 24px;
          width: 360px;
          height: 500px;
          max-height: calc(100vh - 120px);
          background: var(--bg-card);
          border-radius: 20px;
          box-shadow: 0 12px 40px rgba(0, 0, 0, 0.15);
          display: flex;
          flex-direction: column;
          z-index: 100;
          overflow: hidden;
          border: 1px solid var(--border);
        }

        @media (max-width: 480px) {
          .chat-widget-window {
            bottom: 0;
            right: 0;
            width: 100%;
            height: 100vh;
            max-height: 100vh;
            border-radius: 0;
          }
          .chat-widget-btn {
            bottom: 16px;
            right: 16px;
          }
        }

        .chat-widget-header {
          padding: 16px;
          background: linear-gradient(135deg, var(--primary), var(--primary-light));
          color: white;
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .chat-widget-header-info {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .chat-widget-header-info img {
          width: 40px;
          height: 40px;
          border-radius: 50%;
          border: 2px solid white;
        }

        .chat-widget-header-info h3 {
          margin: 0;
          font-size: 16px;
          font-weight: 700;
        }

        .chat-widget-header-info span {
          font-size: 12px;
          opacity: 0.9;
        }

        .close-btn {
          background: none;
          border: none;
          color: white;
          cursor: pointer;
          opacity: 0.8;
          transition: opacity 0.2s;
        }
        .close-btn:hover {
          opacity: 1;
        }

        .chat-widget-messages {
          flex: 1;
          overflow-y: auto;
          padding: 16px;
          display: flex;
          flex-direction: column;
          gap: 12px;
          background: #f8faf9;
        }

        .chat-widget-input {
          padding: 16px;
          background: white;
          border-top: 1px solid var(--border);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .chat-widget-input input {
          flex: 1;
          padding: 12px 16px;
          border: 1px solid var(--border);
          border-radius: 24px;
          outline: none;
          font-family: 'IBM Plex Sans Arabic', 'Cairo', sans-serif;
          font-size: 14px;
        }
        .chat-widget-input input:focus {
          border-color: var(--primary-light);
        }

        .chat-widget-input button {
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: var(--primary);
          color: white;
          border: none;
          display: flex;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: opacity 0.2s;
        }
        .chat-widget-input button:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
      `}</style>
    </>
  );
}
