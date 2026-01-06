
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
      <div className="flex w-full justify-center py-6">
        <div className="text-[10px] font-black uppercase tracking-[0.25em] text-slate-300 bg-slate-50/50 px-4 py-1.5 rounded-full border border-slate-100/50">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full mb-8 ${isAssistant ? 'justify-start' : 'justify-end'} animate-in slide-in-from-bottom-2 duration-300`}>
      <div className={`max-w-[85%] md:max-w-[75%] rounded-[2rem] px-8 py-7 shadow-sm transition-all duration-300 ${
        isAssistant 
          ? 'bg-white text-slate-800 border border-slate-100 shadow-slate-200/20 shadow-xl rounded-tl-none' 
          : 'bg-[#F9FBFF] text-slate-900 border border-slate-200/30 shadow-slate-100/30 shadow-lg rounded-tr-none'
      }`}>
        <div className="text-[9px] font-black uppercase tracking-widest opacity-25 mb-4 flex justify-between items-center">
          <span className={isAssistant ? 'text-indigo-600' : 'text-slate-600'}>
            {isAssistant ? 'Spark' : 'You'}
          </span>
          <span className="font-medium text-[8px]">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        
        {message.media && (
          <div className="mb-6 rounded-2xl overflow-hidden border border-slate-100 bg-white shadow-sm">
            {message.media.mimeType.startsWith('image/') ? (
              <img src={`data:${message.media.mimeType};base64,${message.media.data}`} alt="Upload" className="max-h-96 w-full object-cover" />
            ) : (
              <div className="p-4 flex items-center gap-4">
                <div className="w-12 h-12 flex items-center justify-center bg-indigo-50/50 text-indigo-600 rounded-xl shrink-0 border border-indigo-100/50">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-bold text-slate-900 truncate">{message.media.name}</span>
                  <span className="text-[9px] font-black text-slate-400 uppercase tracking-widest mt-0.5">Context Reference</span>
                </div>
              </div>
            )}
          </div>
        )}

        <div className="markdown-content font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: renderedContent }} />
      </div>
    </div>
  );
};

export default ChatBubble;
