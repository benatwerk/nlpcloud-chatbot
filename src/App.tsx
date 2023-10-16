import { useEffect, useRef, useContext } from "react";
import { ChatContext } from "@/ChatContext";
import {
    PreviousChats,
    ChatFeed,
    ContextInput,
    UserInput,
    ToggleNavButton,
    Loader,
} from "@/components";
import classNames from "classnames";
import "./App.scss";
import "./overrides.scss";
import layoutStyles from "./layout.module.scss";

function App() {
    const { isNavCollapsed, currentChat } = useContext(ChatContext) || {};

    // Scroll to bottom of chat on new message
    const mainRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        const shouldScroll =
            mainRef.current &&
            mainRef.current.scrollTop + mainRef.current.clientHeight >=
                mainRef.current.scrollHeight - 1000; // threshold in px
        if (shouldScroll) {
            mainRef.current.scrollTo(0, mainRef.current.scrollHeight);
        }
    }, [currentChat]);

    return (
        <>
            <Loader />
            <div
                className={classNames(layoutStyles.container, {
                    [layoutStyles.hideNav]: isNavCollapsed,
                })}
            >
                <div className={layoutStyles.toggleSidebarButtonContainer}>
                    <ToggleNavButton />
                </div>
                <div
                    className={classNames(layoutStyles.sidebar, {
                        [layoutStyles.collapsed]: isNavCollapsed,
                    })}
                >
                    <div className={layoutStyles.container}>
                        <PreviousChats />
                    </div>
                </div>
                <div className={layoutStyles.content}>
                    <div className={layoutStyles.top}>
                        <ContextInput />
                    </div>
                    <div className={layoutStyles.main} ref={mainRef}>
                        <ChatFeed />
                    </div>
                    <div className={layoutStyles.bottom}>
                        <UserInput />
                    </div>
                </div>
            </div>
        </>
    );
}

export default App;
