
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
    if (!message.content) return '';
    try {
      return marked.parse(message.content);
    } catch (e) { return message.content; }
  }, [message.content]);

  if (isQuiz && message.quizData) {
    return <QuizCard quiz={message.quizData} onCorrect={onQuizCorrect || (() => {})} />;
  }

  if (isSystem) {
    return (
      <div className="flex w-full justify-center py-8">
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 bg-slate-50 px-5 py-2 rounded-full border border-slate-100/50 shadow-sm">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full mb-10 ${isAssistant ? 'justify-start' : 'justify-end'} animate-in slide-in-from-bottom-2 duration-400`}>
      <div className={`max-w-[88%] md:max-w-[82%] rounded-[2.5rem] px-10 py-9 transition-all duration-300 ${
        isAssistant 
          ? 'bg-white text-slate-800 border border-slate-100 shadow-slate-200/10 shadow-2xl rounded-tl-none' 
          : 'bg-[#F9FBFF] text-slate-900 border border-slate-200/30 shadow-slate-100/20 shadow-xl rounded-tr-none'
      }`}>
        <div className="text-[10px] font-black uppercase tracking-[0.2em] opacity-30 mb-5 flex justify-between items-center">
          <span className={isAssistant ? 'text-indigo-600' : 'text-slate-600'}>
            {isAssistant ? 'Spark' : 'You'}
          </span>
          <span className="font-semibold">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        
        {message.media && (
          <div className="mb-8 rounded-3xl overflow-hidden border border-slate-100 bg-white shadow-md">
            {message.media.mimeType.startsWith('image/') ? (
              <img src={`data:${message.media.mimeType};base64,${message.media.data}`} alt="Context" className="max-h-[500px] w-full object-cover" />
            ) : (
              <div className="p-6 flex items-center gap-5">
                <div className="w-14 h-14 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-2xl shrink-0 border border-indigo-100/50 shadow-inner">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-base font-bold text-slate-900 truncate tracking-tight">{message.media.name}</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Context Reference</span>
                </div>
              </div>
            )}
          </div>
        )}

        {message.content && (
          <div className="markdown-content" dangerouslySetInnerHTML={{ __html: renderedContent }} />
        )}
      </div>
    </div>
  );
};

export default ChatBubble;
