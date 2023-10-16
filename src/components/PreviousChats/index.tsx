import React, { useContext } from "react";
import { ChatContext } from "@/ChatContext";
import { ToggleNavButton, NewChatButton } from "@/components";
import moment from "moment";
import classNames from "classnames";
import styles from "./PreviousChats.module.scss";
import { DeleteIcon, RenameIcon } from "@/components/Icons";

const PreviousChats: React.FC = () => {
    const { sessionId, previousChats, loadChat, renameChat, deleteChat } =
        useContext(ChatContext) || {};

    if (!Array.isArray(previousChats)) return null;

    const timeago = (timestamp: Date | string | number): string => {
        return moment(timestamp).fromNow();
    };

    const formattedDate = (timestamp: Date | string | number): string => {
        return moment(timestamp).format("M/D/YYYY [@]h:mma");
    };

    return (
        <div className={styles.previousChats}>
            <div className={styles.header}>
                <NewChatButton />
                <ToggleNavButton />
            </div>
            <h2>Past Chats</h2>
            <ul className={styles.chatList}>
                {previousChats.map((chat) => (
                    <li
                        key={chat.id}
                        className={classNames(styles.item, {
                            [styles.active]: chat.session_id === sessionId,
                        })}
                    >
                        <span
                            onClick={() => loadChat?.(chat.session_id)}
                            title={`${chat.title} (${formattedDate(
                                chat.timestamp
                            )})`}
                        >
                            <strong>{chat.title}</strong>
                            <em>({timeago(chat.timestamp)})</em>
                        </span>
                        <button
                            onClick={() =>
                                renameChat?.(chat.session_id, chat.title)
                            }
                            title="Rename chat"
                        >
                            <RenameIcon />
                        </button>
                        <button
                            onClick={() => deleteChat?.(chat.session_id)}
                            title="Delete chat"
                        >
                            <DeleteIcon />
                        </button>
                    </li>
                ))}
            </ul>
        </div>
    );
};

export default PreviousChats;
