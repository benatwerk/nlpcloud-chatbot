import { test, afterEach } from "vitest";
import { JSDOM } from "jsdom";
import { render, cleanup } from "@testing-library/react";
import { assert } from "chai";
import { ChatContext, ChatContextType } from "@/ChatContext";
import ChatFeed from "@/components/ChatFeed";

const { window } = new JSDOM();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.window = window as any;
global.document = window.document;

const chatContextValue: Partial<ChatContextType> = {
    currentChat: [
        {
            id: 1,
            session_id: "session1",
            timestamp: "2023-09-18T12:34:56Z",
            input: "Hello",
            response: "Hi there!",
        },
        {
            id: 2,
            session_id: "session2",
            timestamp: "2023-09-18T12:35:56Z",
            input: "How are you?",
            response: "I am fine.",
        },
    ],
};

afterEach(() => {
    cleanup();
});

test("ChatFeed - renders without crashing", () => {
    const { getByText } = render(
        <ChatContext.Provider value={chatContextValue as ChatContextType}>
            <ChatFeed />
        </ChatContext.Provider>
    );
    assert.exists(getByText("Hello"));
});

test("ChatFeed - renders the correct number of chat messages", () => {
    const { getAllByText, debug } = render(
        <ChatContext.Provider value={chatContextValue as ChatContextType}>
            <ChatFeed />
        </ChatContext.Provider>
    );

    const userMessages = getAllByText(/Hello|How are you?/);
    const botMessages = getAllByText(/Hi there!|I am fine./);

    debug();

    assert.equal(userMessages.length, 2);
    assert.equal(botMessages.length, 2);
});
