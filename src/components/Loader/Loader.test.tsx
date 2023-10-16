import { test } from "vitest";
import { JSDOM } from "jsdom";
import { render } from "@testing-library/react";
import { assert } from "chai";
import { ChatContext, ChatContextType } from "@/ChatContext";
import Loader from "./index";

const { window } = new JSDOM();
// eslint-disable-next-line @typescript-eslint/no-explicit-any
global.window = window as any;
global.document = window.document;

const chatContextValue: Partial<ChatContextType> = {
    loading: true,
};

test("Loader - should render the loading icon when loading is true", () => {
    const { container } = render(
        <ChatContext.Provider value={chatContextValue as ChatContextType}>
            <Loader />
        </ChatContext.Provider>
    );
    const loaderElement = container.querySelector("svg");
    assert.notEqual(loaderElement, null);
});

test("Loader - should not render the loading icon when loading is false", () => {
    const { container } = render(
        <ChatContext.Provider
            value={{ ...chatContextValue, loading: false } as ChatContextType}
        >
            <Loader />
        </ChatContext.Provider>
    );
    const loaderElement = container.querySelector("svg");
    assert.equal(loaderElement, null);
});
