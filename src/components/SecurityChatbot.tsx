import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Lightbulb, AlertTriangle, FileText, Eye, Clock } from 'lucide-react';
import { ChatMessage, Employee, PolicyViolation } from '../types';
import { generateAIResponse } from '../data/aiResponses';
import { LoadingSpinner, InlineLoading } from './LoadingSpinner';
import { ErrorMessage, InlineError } from './ErrorMessage';
import { AppError, ErrorType, createError, withErrorHandling, logError } from '../utils/errorUtils';
import { chatAPI } from '../services/api';

interface SecurityChatbotProps {
  currentEmployee?: Employee;
  onActionClick?: (action: string, context?: any) => void;
  variant?: 'standalone' | 'modal';
}

export const SecurityChatbot: React.FC<SecurityChatbotProps> = ({ 
  currentEmployee, 
  onActionClick,
  variant = 'standalone'
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      type: 'assistant',
      content: `👋 Hello! I'm your AI security analyst assistant. I'm here to help you investigate threats, analyze employee behavior, and provide actionable security insights.\n\n${currentEmployee ? `I see you're looking at **${currentEmployee.name}** (Risk Score: ${currentEmployee.riskScore}). What would you like to know about their security profile?` : 'How can I assist you with your security investigation today?'}`,
      timestamp: new Date().toISOString()
    }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState<AppError | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentRequestRef = useRef<AbortController | null>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Real AI API call with error handling
  const sendChatMessage = async (query: string, signal?: AbortSignal): Promise<any> => {
    try {
      console.log('🤖 Sending message to AI:', query);
      
      // Send message with employee context if available
      const response = await chatAPI.sendMessage(query, currentEmployee?.id);
      
      console.log('✅ AI response received:', response);
      
      // Check if request was aborted
      if (signal?.aborted) {
        throw new Error('Request cancelled');
      }
      
      return {
        content: response.aiMessage?.content || response.response || response.message || 'I received your message but couldn\'t generate a response.',
        context: response.context
      };
      
    } catch (error) {
      // Handle abort signal
      if (signal?.aborted) {
        throw new Error('Request cancelled');
      }
      
      console.error('❌ AI request failed:', error);
      
      // Fallback to mock response if API fails
      console.log('🔄 Falling back to mock response...');
      const fallbackResponse = generateAIResponse(query, {
        employee: currentEmployee,
        violation: currentEmployee?.violations?.[0]
      });
      
      return fallbackResponse;
    }
  };

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isTyping) return;

    const messageContent = inputValue.trim();
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: messageContent,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputValue('');
    setError(null);
    setIsTyping(true);

    // Cancel any previous request
    if (currentRequestRef.current) {
      currentRequestRef.current.abort();
    }

    // Create new abort controller for this request
    const abortController = new AbortController();
    currentRequestRef.current = abortController;

    try {
      const { data, error: requestError } = await withErrorHandling(
        () => sendChatMessage(messageContent, abortController.signal),
        'SecurityChatbot.handleSendMessage'
      );

      // Check if request was aborted
      if (abortController.signal.aborted) {
        return;
      }

      if (requestError) {
        throw requestError;
      }

      const assistantMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        type: 'assistant',
        content: data.content,
        timestamp: new Date().toISOString(),
        context: {
          employeeId: currentEmployee?.id,
          actionType: 'analysis'
        }
      };

      setMessages(prev => [...prev, assistantMessage]);
      setRetryCount(0); // Reset retry count on success
      
    } catch (error) {
      // Don't show error if request was cancelled
      if (error instanceof Error && error.message === 'Request cancelled') {
        return;
      }

      const appError = error instanceof Error 
        ? createError(ErrorType.SERVER, 'Failed to get AI response. Please try again.', error, undefined, true)
        : error as AppError;

      setError(appError);
      logError(appError, 'SecurityChatbot');

      // Add error message to chat
      const errorMessage: ChatMessage = {
        id: (Date.now() + 2).toString(),
        type: 'assistant',
        content: `❌ Sorry, I encountered an error while processing your request. ${appError.message}`,
        timestamp: new Date().toISOString(),
        context: {
          actionType: 'analysis'
        }
      };

      setMessages(prev => [...prev, errorMessage]);
      
    } finally {
      setIsTyping(false);
      currentRequestRef.current = null;
    }
  };

  const handleRetry = async () => {
    if (retryCount >= 3) {
      setError(createError(
        ErrorType.SERVER,
        'Maximum retry attempts reached. Please refresh the page and try again.',
        undefined,
        undefined,
        false
      ));
      return;
    }

    setRetryCount(prev => prev + 1);
    
    // Get the last user message to retry
    const lastUserMessage = messages.filter(msg => msg.type === 'user').pop();
    if (lastUserMessage) {
      setInputValue(lastUserMessage.content);
      await handleSendMessage();
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (currentRequestRef.current) {
        currentRequestRef.current.abort();
      }
    };
  }, []);

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    inputRef.current?.focus();
  };

  const handleActionClick = (action: any) => {
    if (onActionClick) {
      onActionClick(action.type, { employee: currentEmployee, action });
    }
  };

  const formatMessage = (content: string) => {
    // Convert markdown-style formatting to HTML
    return content
      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
      .replace(/\*(.*?)\*/g, '<em>$1</em>')
      .replace(/`(.*?)`/g, '<code class="bg-gray-100 px-1 rounded text-sm">$1</code>')
      .replace(/\n/g, '<br />');
  };

  const getActionIcon = (type: string) => {
    switch (type) {
      case 'investigate': return <Eye className="w-4 h-4" />;
      case 'monitor': return <Clock className="w-4 h-4" />;
      case 'escalate': return <AlertTriangle className="w-4 h-4" />;
      case 'report': return <FileText className="w-4 h-4" />;
      default: return <Lightbulb className="w-4 h-4" />;
    }
  };

  const getActionColor = (priority: string) => {
    switch (priority) {
      case 'high': return 'bg-red-600 hover:bg-red-700 text-white';
      case 'medium': return 'bg-orange-600 hover:bg-orange-700 text-white';
      case 'low': return 'bg-gray-600 hover:bg-gray-700 text-white';
      default: return 'bg-blue-600 hover:bg-blue-700 text-white';
    }
  };

  // Quick suggestions based on context
  const getContextualSuggestions = () => {
    try {
      if (currentEmployee) {
        const suggestions = [
          `Analyze ${currentEmployee.name}'s risk factors`,
          'What violations has this employee committed?',
          'Recommend next steps for investigation',
          'Show network connections for this employee'
        ];
        
        if ((currentEmployee.violations?.length || 0) > 0) {
          suggestions.push('Explain the most recent violation');
        }
        
        return suggestions;
      }
      
      return [
        'Show me the highest risk employees',
        'What are the current security threats?',
        'Analyze network communication patterns',
        'How do I investigate a security incident?'
      ];
    } catch (error) {
      console.error('Error in getContextualSuggestions:', error);
      return [
        'Show me the highest risk employees',
        'What are the current security threats?',
        'Analyze network communication patterns',
        'How do I investigate a security incident?'
      ];
    }
  };

  return (
    <div className={`bg-white dark:bg-gray-800 flex flex-col ${
      variant === 'modal' 
        ? 'h-full' 
        : 'rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 h-[600px]'
    }`}>
      {/* Header - only show in standalone mode */}
      {variant === 'standalone' && (
        <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center">
              <Bot className="w-6 h-6 text-white" />
            </div>
            <div>
              <h3 className="font-semibold text-gray-900 dark:text-white">AI Security Analyst</h3>
              <p className="text-sm text-gray-600 dark:text-gray-300">
                {currentEmployee ? `Analyzing ${currentEmployee.name}` : 'Ready to assist with security investigations'}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[80%] ${message.type === 'user' ? 'order-2' : 'order-1'}`}>
              <div className={`flex items-start space-x-2 ${message.type === 'user' ? 'flex-row-reverse space-x-reverse' : ''}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${
                  message.type === 'user' ? 'bg-gray-600' : 'bg-blue-600'
                }`}>
                  {message.type === 'user' ? (
                    <User className="w-4 h-4 text-white" />
                  ) : (
                    <Bot className="w-4 h-4 text-white" />
                  )}
                </div>
                <div className={`rounded-lg p-3 ${
                  message.type === 'user' 
                    ? 'bg-gray-600 dark:bg-gray-700 text-white' 
                    : 'bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white border border-gray-200 dark:border-gray-600'
                }`}>
                  <div 
                    className="text-sm leading-relaxed"
                    dangerouslySetInnerHTML={{ __html: formatMessage(message.content) }}
                  />
                  
                  {/* Action buttons for assistant messages */}
                  {message.type === 'assistant' && !message.content.startsWith('❌') && (
                    <div className="mt-3 space-y-2">
                      {/* Quick suggestions */}
                      <div className="flex flex-wrap gap-2">
                        {(getContextualSuggestions() || []).slice(0, 2).map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => handleSuggestionClick(suggestion)}
                            disabled={isTyping}
                            className="text-xs px-2 py-1 bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 rounded-full hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                          >
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className={`text-xs text-gray-500 dark:text-gray-400 mt-1 ${message.type === 'user' ? 'text-right' : 'text-left'}`}>
                {new Date(message.timestamp).toLocaleTimeString()}
              </div>
            </div>
          </div>
        ))}
        
        {/* Typing indicator */}
        {isTyping && (
          <div className="flex justify-start">
            <div className="flex items-start space-x-2">
              <div className="w-8 h-8 bg-blue-600 dark:bg-blue-500 rounded-full flex items-center justify-center">
                <Bot className="w-4 h-4 text-white" />
              </div>
              <div className="bg-gray-50 dark:bg-gray-700 border border-gray-200 dark:border-gray-600 rounded-lg p-3">
                <InlineLoading text="Thinking..." />
              </div>
            </div>
          </div>
        )}

        {/* Error display */}
        {error && (
          <div className="flex justify-center">
            <ErrorMessage
              message={error.message}
              type="error"
              onRetry={error.retryable ? handleRetry : undefined}
              retryText={`Retry${retryCount > 0 ? ` (${retryCount}/3)` : ''}`}
              dismissible
              onDismiss={() => setError(null)}
              className="max-w-md"
            />
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>

      {/* Quick Actions */}
      <div className="p-3 border-t border-gray-100 dark:border-gray-700 bg-gray-50 dark:bg-gray-800">
        <div className="flex flex-wrap gap-2 mb-3">
          {(getContextualSuggestions() || []).slice(0, 4).map((suggestion, index) => (
            <button
              key={index}
              onClick={() => handleSuggestionClick(suggestion)}
              disabled={isTyping}
              className="text-xs px-3 py-1 bg-white dark:bg-gray-700 border border-gray-200 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-full hover:bg-gray-50 dark:hover:bg-gray-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {suggestion}
            </button>
          ))}
        </div>
      </div>

      {/* Input */}
      <div className="p-4 border-t border-gray-200 dark:border-gray-700">
        <div className="flex space-x-2">
          <input
            ref={inputRef}
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
            placeholder={isTyping ? "AI is thinking..." : currentEmployee ? `Ask about ${currentEmployee.name}...` : "Ask about security threats, investigations, or employee risks..."}
            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 text-sm bg-white dark:bg-gray-700 text-gray-900 dark:text-white disabled:bg-gray-100 dark:disabled:bg-gray-600 disabled:cursor-not-allowed"
            disabled={isTyping}
          />
          <button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isTyping}
            className="px-4 py-2 bg-blue-600 dark:bg-blue-500 text-white rounded-lg hover:bg-blue-700 dark:hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-w-[48px] flex items-center justify-center"
          >
            {isTyping ? (
              <LoadingSpinner size="sm" className="w-4 h-4" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </button>
        </div>
        
        {/* Connection status indicator */}
        <div className="mt-2 flex items-center justify-between text-xs text-gray-500 dark:text-gray-400">
          <div className="flex items-center space-x-2">
            <div className={`w-2 h-2 rounded-full ${error ? 'bg-red-500' : 'bg-green-500'}`}></div>
            <span>{error ? 'Connection issues' : 'AI Assistant ready'}</span>
          </div>
          {retryCount > 0 && (
            <span>Retry attempts: {retryCount}/3</span>
          )}
        </div>
      </div>
    </div>
  );
};