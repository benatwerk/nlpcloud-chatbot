import React, { createContext, useState, useEffect, ReactNode } from "react";
import { Chat, CurrentChat, NewSessionResponse } from "@/types/types";

export type ChatContextType = {
    sessionId: string | null;
    isNewSession: boolean;
    loading: boolean;
    currentChat: CurrentChat[];
    previousChats: Chat[];
    chatContext: string;
    setChatContext: React.Dispatch<React.SetStateAction<string>>;
    userInput: string;
    setUserInput: React.Dispatch<React.SetStateAction<string>>;
    sendMessage: (e: React.FormEvent) => Promise<void>;
    loadPreviousChats: () => Promise<void>;
    loadChatHistory: (selectedSessionId: string) => Promise<void>;
    loadChat: (selectedSessionId: string) => Promise<void>;
    renameChat: (sessionId: string, title: string) => Promise<void>;
    deleteChat: (sessionId: string) => Promise<void>;
    startNewChat: () => Promise<void>;
    updateContext: (e: React.FormEvent) => Promise<void>;
    isNavCollapsed: boolean;
    handleNavToggle: () => void;
};

export const ChatContext = createContext<ChatContextType | null>(null);

interface ChatProviderProps {
    children: ReactNode;
}

export const ChatProvider: React.FC<ChatProviderProps> = ({ children }) => {
    const [sessionId, setSessionId] = useState<string | null>(null);
    const [isNewSession, setIsNewSession] = useState(false);
    const [loading, setLoading] = useState(false);
    const [currentChat, setCurrentChat] = useState<CurrentChat[]>([]);
    const [previousChats, setPreviousChats] = useState<Chat[]>([]);
    const [chatContext, setChatContext] = useState<string>("");
    const [userInput, setUserInput] = useState<string>("");
    const [isNavCollapsed, setIsNavCollapsed] = useState(false);

    const handleNavToggle = () => {
        setIsNavCollapsed(!isNavCollapsed);
    };

    // Fetch a new session ID
    const fetchNewSession = async (): Promise<NewSessionResponse> => {
        const response = await fetch("/api/start-new-session");
        const data = await response.json();
        const sessionId = data.sessionId;
        if (sessionId) {
            setSessionId(sessionId);
            setIsNewSession(true);
            return { sessionId };
        }
        return {};
    };

    const startNewChat = async () => {
        setLoading(true);
        try {
            const { sessionId } = await fetchNewSession();
            if (sessionId) {
                setSessionId(sessionId);
                setCurrentChat([]);
                setIsNewSession(true);
                setLoading(false);
            }
        } catch (error) {
            console.error(error);
        }
    };

    const sendMessage = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!userInput || !sessionId) return;

        // Prepare the new chat history with the user's message
        const newChatHistory = [
            ...currentChat,
            {
                id: Date.now(),
                session_id: sessionId,
                timestamp: new Date().toISOString(),
                input: userInput,
                response: "",
            },
        ];
        setLoading(true);

        try {
            // Make API call to get chatbot's response
            const response = await fetch("/api/chat", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    input: userInput,
                    context: chatContext,
                    chatHistory: newChatHistory,
                    sessionId: sessionId,
                    isNewSession: isNewSession,
                }),
            });

            if (!response.ok) {
                throw new Error("Network response was not ok");
            }

            const apiResponse = await response.json();

            // Update currentChat with chatbot's response
            setCurrentChat([
                ...currentChat,
                {
                    id: Date.now(),
                    session_id: sessionId,
                    timestamp: new Date().toISOString(),
                    input: userInput,
                    response: apiResponse.response,
                },
            ]);

            // Clear userInput
            setIsNewSession(false);
            setUserInput("");
            setLoading(false);
        } catch (error) {
            console.error("Error:", error);
            setUserInput("");
            setCurrentChat([
                ...newChatHistory,
                {
                    id: Date.now(),
                    session_id: sessionId,
                    timestamp: new Date().toISOString(),
                    input: userInput,
                    response: "An error occurred. Please try again.",
                },
            ]);
        }
    };

    const loadPreviousChats = async () => {
        setLoading(true);
        try {
            // Make API call to fetch previous chats
            const response = await fetch("/api/previous-chats", {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                },
            });

            if (!response.ok) {
                throw new Error("Network response was not ok");
            }

            const apiResponse = await response.json();

            // Update previousChats state with the fetched data
            setPreviousChats(apiResponse);
            const currentChatObject = apiResponse.find(
                (chat: Chat) => chat.session_id === sessionId
            );
            if (currentChatObject) {
                setChatContext(currentChatObject.context || "");
            }
            setLoading(false);
        } catch (error) {
            console.error("Error:", error);
        }
    };

    useEffect(() => {
        const currentChatObject = previousChats.find(
            (chat) => chat.session_id === sessionId
        );
        if (currentChatObject) {
            setChatContext(currentChatObject.context || "");
        }
    }, [previousChats, sessionId]);

    const loadChatHistory = async (selectedSessionId: string) => {
        try {
            const response = await fetch(
                `/api/get-chat-history/${selectedSessionId}`
            );
            if (!response.ok) {
                throw new Error("Network response was not ok");
            }
            const apiResponse = await response.json();
            setCurrentChat(apiResponse);
        } catch (error) {
            console.error("Error:", error);
        }
    };

    const loadChat = async (selectedSessionId: string) => {
        setSessionId(selectedSessionId);
        setIsNewSession(false);
        loadChatHistory(selectedSessionId);
    };

    const renameChat = async (sessionId: string, title: string) => {
        const newTitle = prompt("Enter new title:", title);
        if (newTitle) {
            try {
                const response = await fetch("/api/rename-chat", {
                    method: "PUT",
                    headers: {
                        "Content-Type": "application/json",
                    },
                    body: JSON.stringify({
                        newTitle,
                        sessionId,
                    }),
                });

                if (!response.ok) {
                    throw new Error("Network response was not ok");
                }

                // Refetch the chat history to reflect the changes
                loadPreviousChats();
            } catch (error) {
                console.error("Error:", error);
            }
        }
    };

    const deleteChat = async (sessionId: string) => {
        const selectedChatObject = previousChats.find(
            (chat) => chat.session_id === sessionId
        ) ?? { title: "" };
        const userConfirmed = window.confirm(
            `Are you sure you want to delete "${selectedChatObject.title}"?`
        );
        if (!userConfirmed) {
            return;
        }
        try {
            const response = await fetch("/api/delete-chat", {
                method: "DELETE",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    sessionId,
                }),
            });

            if (!response.ok) {
                throw new Error("Network response was not ok");
            }

            // Refetch the chat history to reflect the changes
            loadPreviousChats();
            startNewChat();
        } catch (error) {
            console.error("Error:", error);
        }
    };

    const updateContext = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!sessionId) return;

        setLoading(true);
        try {
            const response = await fetch("/api/update-context", {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                },
                body: JSON.stringify({
                    context: chatContext,
                    sessionId: sessionId,
                }),
            });

            if (!response.ok) {
                throw new Error("Network response was not ok");
            }

            setLoading(false);
        } catch (error) {
            console.error("Error:", error);
        }
    };

    useEffect(() => {
        fetchNewSession();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    useEffect(() => {
        loadPreviousChats();
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [sessionId]);

    return (
        <ChatContext.Provider
            value={{
                sessionId,
                isNewSession,
                loading,
                currentChat,
                previousChats,
                chatContext,
                setChatContext,
                userInput,
                setUserInput,
                sendMessage,
                loadPreviousChats,
                loadChatHistory,
                loadChat,
                renameChat,
                deleteChat,
                startNewChat,
                updateContext,
                isNavCollapsed,
                handleNavToggle,
            }}
        >
            {children}
        </ChatContext.Provider>
    );
};
