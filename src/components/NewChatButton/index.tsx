import React, { useContext } from "react";
import { ChatContext } from "@/ChatContext";
import classNames from "classnames";
import styles from "./NewChatButton.module.scss";
import { NewIcon } from "@/components/Icons";

const NewChatButton: React.FC = () => {
    const { startNewChat } = useContext(ChatContext) || {};
    return (
        <button
            className={classNames("new-chat-button", styles.newChatButton)}
            onClick={startNewChat}
        >
            <NewIcon /> <strong>New Chat</strong>
        </button>
    );
};

export default NewChatButton;
