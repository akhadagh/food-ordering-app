import React, { useState, useRef, useEffect } from 'react';
import { assistantAPI, apiErrorMessage } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { BrandMark } from '../brand/BrandMark';
import { MessageCircle, X, Send, Bot } from 'lucide-react';

const QUICK_ACTIONS = [
  "What's on the menu?",
  'How much is jollof rice?',
  'How do I pay?',
  'Where do you deliver?',
  'Track my order',
];

const ChatBot = () => {
  const { user } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      role: 'bot',
      text: 'Hello! I am the Afia Food Hub assistant. I can help with the menu, prices, delivery, payment and your own orders.',
    },
  ]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEnd = useRef(null);
  const panelRef = useRef(null);
  const triggerRef = useRef(null);

  useEffect(() => {
    messagesEnd.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
  }, [messages]);

  // Escape closes the panel and returns focus to the trigger.
  useEffect(() => {
    if (!isOpen) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
        triggerRef.current?.focus();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [isOpen]);

  const handleSend = async (text = input) => {
    const message = text.trim();
    if (!message || sending) return;

    setMessages((prev) => [...prev, { role: 'user', text: message }]);
    setInput('');
    setSending(true);

    try {
      const { data } = await assistantAPI.send(message);
      setMessages((prev) => [...prev, { role: 'bot', text: data.reply }]);
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          role: 'bot',
          text: apiErrorMessage(
            err,
            'I could not reach the kitchen just now. Please try again in a moment.'
          ),
        },
      ]);
    } finally {
      setSending(false);
    }
  };

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setIsOpen((open) => !open)}
        className={`fixed bottom-6 right-6 z-50 flex h-14 w-14 items-center justify-center rounded-full shadow-card-hover transition-all duration-300 ${
          isOpen ? 'bg-bamboo-800 text-white' : 'bg-primary-500 text-white hover:bg-primary-600'
        }`}
        aria-expanded={isOpen}
        aria-controls="afia-assistant"
        aria-label={isOpen ? 'Close the Afia Food Hub assistant' : 'Open the Afia Food Hub assistant'}
      >
        {isOpen ? <X size={22} aria-hidden="true" /> : <MessageCircle size={22} aria-hidden="true" />}
      </button>

      {isOpen && (
        <div
          id="afia-assistant"
          ref={panelRef}
          role="dialog"
          aria-label="Afia Food Hub assistant"
          className="fixed bottom-24 right-6 z-50 flex max-h-[calc(100vh-8rem)] w-[22rem] max-w-[calc(100vw-3rem)] flex-col overflow-hidden rounded-2xl border border-bamboo-200 bg-white shadow-card-hover"
        >
          <div className="flex items-center gap-3 bg-primary-500 px-4 py-3.5 text-white">
            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/20">
              <BrandMark size={20} color="#FFFFFF" steam="#F8CE52" />
            </span>
            <div className="min-w-0">
              <h2 className="truncate font-display text-sm font-semibold">Afia Food Hub assistant</h2>
              <p className="text-xs text-white/80">Answers from our live menu</p>
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4" aria-live="polite">
            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-2 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
              >
                {message.role === 'bot' && (
                  <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-clay-50">
                    <BrandMark size={15} color="#C4422B" steam="#DE9710" />
                  </span>
                )}
                <div
                  className={`max-w-[82%] whitespace-pre-line rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed ${
                    message.role === 'user'
                      ? 'rounded-br-md bg-primary-500 text-white'
                      : 'rounded-bl-md bg-bamboo-100 text-bamboo-800'
                  }`}
                >
                  {message.text}
                </div>
              </div>
            ))}
            {sending && (
              <div className="flex gap-2">
                <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-clay-50">
                  <BrandMark size={15} color="#C4422B" steam="#DE9710" />
                </span>
                <div className="rounded-2xl rounded-bl-md bg-bamboo-100 px-3.5 py-2.5 text-sm text-bamboo-600">
                  Checking the kitchen…
                </div>
              </div>
            )}
            <div ref={messagesEnd} />
          </div>

          {messages.length <= 1 && (
            <div className="px-4 pb-2">
              <p className="mb-2 text-xs text-bamboo-500">Try asking:</p>
              <div className="flex flex-wrap gap-1.5">
                {QUICK_ACTIONS.map((action) => (
                  <button
                    key={action}
                    type="button"
                    onClick={() => handleSend(action)}
                    className="rounded-pill bg-clay-50 px-3 py-1.5 text-xs font-medium text-primary-700 transition-colors hover:bg-clay-100"
                  >
                    {action}
                  </button>
                ))}
              </div>
            </div>
          )}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-2 border-t border-bamboo-100 p-3"
          >
            <label htmlFor="assistant-input" className="sr-only">
              Type your message
            </label>
            <input
              id="assistant-input"
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask about the menu, prices or your order…"
              maxLength={500}
              className="flex-1 rounded-pill border border-bamboo-200 bg-bamboo-50 px-4 py-2.5 text-sm text-bamboo-800 placeholder:text-bamboo-400 focus:border-primary-500 focus:outline-none focus:ring-2 focus:ring-primary-500/20"
            />
            <button
              type="submit"
              disabled={sending || !input.trim()}
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary-500 text-white transition-colors hover:bg-primary-600 disabled:opacity-40"
              aria-label="Send message"
            >
              <Send size={16} aria-hidden="true" />
            </button>
          </form>
        </div>
      )}
    </>
  );
};

export default ChatBot;
