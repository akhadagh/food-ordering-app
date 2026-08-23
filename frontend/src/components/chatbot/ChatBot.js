import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Bot, User } from 'lucide-react';

const FAQ = {
  'menu': 'We serve authentic Ghanaian dishes including Banku with Okra Soup (GH₵35), Banku with Tilapia (GH₵45), Fufu with Light Soup (GH₵40), Jollof Rice (GH₵40), Waakye and Stew (GH₵35), Rice Ball with Groundnut Soup (GH₵38), and many more!',
  'delivery': 'Delivery takes 30-45 minutes. Delivery fee is GH₵5.00 for all orders within Accra.',
  'payment': 'We accept MTN Mobile Money (MoMo), Vodafone Cash, AirtelTigo Money, Cash on Delivery, Debit/Credit Cards, and Bank Transfer.',
  'momo': 'To pay with MTN MoMo, dial *170# and send your payment to our merchant number. You will receive a prompt to confirm.',
  'vodafone': 'To pay with Vodafone Cash, dial *110# and send payment to our number. You will receive a confirmation.',
  'promo': 'We have promo codes available! Try WELCOME10 for 10% off your first order (min. GH₵20), or GHANA5 for GH₵5 off (min. GH₵15).',
  'track': 'You can track your order in real-time from the "My Orders" page. Click on any order to see the live status tracker.',
  'cancel': 'You can cancel your order if it is still in "Placed" or "Confirmed" status. Go to My Orders > select the order > Cancel.',
  'hours': 'We are open from 6:00 AM to 11:00 PM, Monday to Saturday. Orders on Sundays are also available.',
  'location': 'We deliver across Accra, including Osu, Labone, Cantonments, East Legon, Achimota, Tema, and surrounding areas.',
  'contact': 'You can reach us at +233 24 123 4567 or email hello@efiaseat.com. Our office is at 123 Oxford Street, Osu, Accra.',
  'refund': 'If you are not satisfied with your order, please contact us within 1 hour of delivery. We will review and process a refund or replacement.',
  'account': 'Click "Sign Up" to create a free account. You can track orders, save addresses, and get promo offers.',
};

const KEYWORDS = {
  menu: ['menu', 'food', 'dish', 'dishes', 'serve', 'eat', 'order', 'jollof', 'banku', 'fufu', 'waakye', 'rice', 'soup'],
  delivery: ['deliver', 'delivery', 'time', 'how long', 'fast', 'minutes'],
  payment: ['pay', 'payment', 'how to pay', 'method'],
  momo: ['momo', 'mtn', 'mobile money'],
  vodafone: ['vodafone', 'voda'],
  promo: ['promo', 'discount', 'code', 'coupon', 'offer'],
  track: ['track', 'tracking', 'status', 'where', 'location'],
  cancel: ['cancel', 'cancellation'],
  hours: ['hour', 'open', 'close', 'time', 'when'],
  location: ['location', 'where', 'area', 'deliver', 'address'],
  contact: ['contact', 'phone', 'email', 'reach', 'call', 'talk'],
  refund: ['refund', 'money back', 'complaint', 'not happy', 'satisfied'],
  account: ['account', 'sign up', 'register', 'login', 'create'],
};

const getBotResponse = (input) => {
  const lower = input.toLowerCase();

  if (lower.match(/\b(hi|hello|hey|good\s*(morning|afternoon|evening))\b/)) {
    return "Hello! Welcome to Efia'sEat. I'm here to help you with ordering food, payments, delivery, and more. What would you like to know?";
  }
  if (lower.match(/\b(thank|thanks)\b/)) {
    return "You're welcome! Is there anything else I can help you with?";
  }
  if (lower.match(/\b(help|what can you)\b/)) {
    return "I can help you with:\n- Menu & food items\n- Delivery info\n- Payment methods (MoMo, Vodafone Cash, etc.)\n- Promo codes\n- Order tracking\n- Account info\n- Contact details\n\nJust ask me anything!";
  }
  if (lower.match(/\b(bye|goodbye|see you)\b/)) {
    return "Goodbye! Enjoy your meal. Visit us again at Efia'sEat!";
  }

  for (const [key, keywords] of Object.entries(KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return FAQ[key];
    }
  }

  return "I'm not sure I understand that. Here are some things I can help with:\n- Menu & dishes\n- Delivery times & fees\n- Payment methods (MoMo, Vodafone Cash)\n- Promo codes\n- Order tracking\n- Contact info\n\nTry asking about one of these topics!";
};

const ChatBot = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    { role: 'bot', text: "Hello! I'm Efia'sEat Assistant. How can I help you today?" }
  ]);
  const [input, setInput] = useState('');
  const messagesEnd = useRef(null);

  useEffect(() => { messagesEnd.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const handleSend = (text = input) => {
    if (!text.trim()) return;
    setMessages(prev => [...prev, { role: 'user', text }]);
    setInput('');
    setTimeout(() => {
      setMessages(prev => [...prev, { role: 'bot', text: getBotResponse(text) }]);
    }, 500);
  };

  const quickActions = [
    'What\'s on the menu?',
    'How do I pay?',
    'Track my order',
    'Promo codes',
    'Contact info',
  ];

  return (
    <>
      <button onClick={() => setIsOpen(!isOpen)} className={`fixed bottom-6 right-6 z-50 w-14 h-14 rounded-full shadow-lg flex items-center justify-center transition-all duration-300 ${isOpen ? 'bg-gray-800 rotate-0' : 'bg-primary-500 hover:bg-primary-600 animate-bounce'}`}>
        {isOpen ? <X size={24} className="text-white" /> : <MessageCircle size={24} className="text-white" />}
      </button>

      {isOpen && (
        <div className="fixed bottom-24 right-6 z-50 w-[380px] max-w-[calc(100vw-3rem)] bg-white rounded-2xl shadow-2xl border border-gray-100 flex flex-col" style={{ height: '500px', maxHeight: 'calc(100vh - 8rem)' }}>
          <div className="bg-primary-500 text-white p-4 rounded-t-2xl flex items-center gap-3">
            <div className="w-10 h-10 bg-white/20 rounded-full flex items-center justify-center">
              <Bot size={22} />
            </div>
            <div>
              <h3 className="font-semibold">Efia&apos;sEat Assistant</h3>
              <p className="text-xs text-white/80">Online - Typically replies instantly</p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg, i) => (
              <div key={i} className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                {msg.role === 'bot' && <div className="w-7 h-7 bg-primary-100 rounded-full flex items-center justify-center flex-shrink-0"><Bot size={14} className="text-primary-600" /></div>}
                <div className={`max-w-[80%] px-4 py-2.5 rounded-2xl text-sm whitespace-pre-line ${msg.role === 'user' ? 'bg-primary-500 text-white rounded-br-md' : 'bg-gray-100 text-gray-700 rounded-bl-md'}`}>
                  {msg.text}
                </div>
              </div>
            ))}
            <div ref={messagesEnd} />
          </div>

          {messages.length <= 1 && (
            <div className="px-4 pb-2">
              <p className="text-xs text-gray-400 mb-2">Quick actions:</p>
              <div className="flex flex-wrap gap-1.5">
                {quickActions.map((action, i) => (
                  <button key={i} onClick={() => handleSend(action)} className="text-xs bg-primary-50 text-primary-600 px-3 py-1.5 rounded-full hover:bg-primary-100 transition">
                    {action}
                  </button>
                ))}
              </div>
            </div>
          )}

          <div className="p-3 border-t border-gray-100">
            <form onSubmit={(e) => { e.preventDefault(); handleSend(); }} className="flex gap-2">
              <input type="text" value={input} onChange={e => setInput(e.target.value)} placeholder="Type your message..." className="flex-1 px-4 py-2.5 bg-gray-50 rounded-full text-sm focus:outline-none focus:ring-2 focus:ring-primary-400" />
              <button type="submit" className="w-10 h-10 bg-primary-500 text-white rounded-full flex items-center justify-center hover:bg-primary-600 transition flex-shrink-0">
                <Send size={16} />
              </button>
            </form>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBot;
