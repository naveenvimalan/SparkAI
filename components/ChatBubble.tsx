
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
      <div className="flex w-full justify-center py-8">
        <div className="text-[10px] font-black uppercase tracking-[0.3em] text-slate-300 border-b border-slate-50 pb-1 px-4">
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className={`flex w-full mb-6 ${isAssistant ? 'justify-start' : 'justify-end'}`}>
      <div className={`max-w-[85%] md:max-w-[75%] rounded-[2rem] px-8 py-6 shadow-sm transition-all duration-300 ${
        isAssistant 
          ? 'bg-white text-slate-800 border border-slate-100 shadow-indigo-100/20 shadow-xl' 
          : 'bg-[#F8FAFC] text-slate-900 border border-slate-200/50 shadow-slate-100/50 shadow-lg'
      }`}>
        <div className="text-[9px] font-black uppercase tracking-widest opacity-30 mb-3 flex justify-between items-center">
          <span className={isAssistant ? 'text-indigo-600' : 'text-slate-600'}>
            {isAssistant ? 'Spark' : 'You'}
          </span>
          <span className="font-medium text-[8px]">{new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
        
        {message.media && (
          <div className="mb-5 rounded-2xl overflow-hidden border border-slate-200/50 bg-white/50 shadow-inner">
            {message.media.mimeType.startsWith('image/') ? (
              <img src={`data:${message.media.mimeType};base64,${message.media.data}`} alt="Upload" className="max-h-96 w-full object-cover" />
            ) : (
              <div className="p-5 flex items-center gap-5">
                <div className="w-14 h-14 flex items-center justify-center bg-indigo-50 text-indigo-600 rounded-2xl shrink-0 border border-indigo-100 shadow-sm">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-7 w-7" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                  </svg>
                </div>
                <div className="flex flex-col overflow-hidden">
                  <span className="text-sm font-bold text-slate-900 truncate leading-tight">{message.media.name}</span>
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest mt-1">Context Reference</span>
                </div>
              </div>
            )}
          </div>
        )}

        {message.goal && isAssistant && (
          <div className="inline-flex items-center gap-2 px-3 py-1 mb-4 rounded-full bg-slate-50 text-slate-400 text-[9px] font-black uppercase tracking-widest border border-slate-100">
            <span className="w-1 h-1 bg-indigo-400 rounded-full" />
            {message.goal}
          </div>
        )}

        <div className="markdown-content font-medium leading-relaxed" dangerouslySetInnerHTML={{ __html: renderedContent }} />
      </div>
    </div>
  );
};

export default ChatBubble;
