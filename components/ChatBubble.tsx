
import React from 'react';
import { Message } from '../types';
import QuizCard from './QuizCard';

interface ChatBubbleProps {
  message: Message;
  onQuizCorrect?: () => void;
}

declare const marked: any;

const ChatBubble: React.FC<ChatBubbleProps> = ({ message, onQuizCorrect }) => {
  const isAssistant = message.role === 'assistant';
  const isQuiz = message.isQuiz;
  const isSystem = message.isSystemReport;

  const renderedContent = React.useMemo(() => {
    try {
      return marked.parse(message.content);
    } catch (e) { return message.content; }
  }, [message.content]);

  if (isQuiz && message.quizData) {
    return <QuizCard quiz={message.quizData} onCorrect={onQuizCorrect || (() => {})} />;
  }

  if (isSystem) {
    return (
      <div className="flex w-full justify-center py-4">
        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-300 border-b border-slate-50 pb-1">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full mb-2 ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[85%] md:max-w-[80%] rounded-2xl px-6 py-5 ${
        isAssistant 
          ? 'bg-white text-slate-800 border border-slate-100' 
          : 'bg-slate-900 text-white shadow-lg shadow-slate-200'
      }`}>
        <div className="text-[9px] font-bold uppercase tracking-widest opacity-30 mb-2 flex justify-between items-center">
          <span>{isAssistant ? 'CogSustain' : 'You'}</span>
          <span>{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        
        {message.media && (
          <div className="mb-4 rounded-xl overflow-hidden border border-black/5 bg-slate-50/50">
            {message.media.mimeType.startsWith('image/') ? (
              <img src={`data:${message.media.mimeType};base64,${message.media.data}`} alt="Upload" className="max-h-64 w-full object-cover" />
            ) : (
              <div className="p-4 flex items-center gap-3">
                <div className="p-2 bg-slate-200 rounded-lg text-slate-600">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" /></svg>
                </div>
                <div className="flex flex-col">
                  <span className="text-xs font-bold text-slate-700">{message.media.name}</span>
                  <span className="text-[9px] opacity-40 uppercase font-black">Linked Context</span>
                </div>
              </div>
            )}
          </div>
        )}

        {message.goal && isAssistant && (
          <div className="inline-block px-2 py-0.5 mb-3 rounded-md bg-slate-50 text-slate-400 text-[9px] font-bold uppercase tracking-wider border border-slate-100">
            {message.goal}
          </div>
        )}

        <div className="markdown-content" dangerouslySetInnerHTML={{ __html: renderedContent }} />
      </div>
    </div>
  );
};

export default ChatBubble;
