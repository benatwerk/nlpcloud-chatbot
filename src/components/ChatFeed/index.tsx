import React, { useContext } from "react";
import classNames from "classnames";
import styles from "./ChatFeed.module.scss";
import { ChatContext } from "@/ChatContext";

const ChatFeed: React.FC = () => {
    const { currentChat } = useContext(ChatContext) || {};

    const wrapNewlines = (text: string): JSX.Element[] => {
        const lines = text.split("\n");
        return lines.map((line: string, index: number) => (
            <p key={index}>{line}</p>
        ));
    };

    return (
        <ul className={styles.chatFeed}>
            {currentChat && currentChat.length ? (
                currentChat.map((msg, index) => (
                    <li key={index}>
                        <div
                            className={classNames(styles.feedItem, styles.user)}
                        >
                            <span className={styles.message}>
                                {wrapNewlines(msg.input)}
                            </span>
                        </div>
                        <div
                            className={classNames(styles.feedItem, styles.bot)}
                        >
                            <span className={styles.message}>
                                {msg.response ? (
                                    wrapNewlines(msg.response)
                                ) : (
                                    <em>...</em>
                                )}
                            </span>
                        </div>
                    </li>
                ))
            ) : (
                <li className={styles.empty}>
                    <p>Start a new chat to begin.</p>
                </li>
            )}
        </ul>
    );
};

export default ChatFeed;
