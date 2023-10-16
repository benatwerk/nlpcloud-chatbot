import React, { useEffect, useRef, useContext } from "react";
import { ChatContext } from "@/ChatContext";
import { SendIcon } from "@/components/Icons";
import classNames from "classnames";
import styles from "./UserInput.module.scss";
import uiStyles from "@/ui.module.scss";

const UserInput: React.FC = () => {
    const { userInput, setUserInput, sendMessage, loading } =
        useContext(ChatContext) || {};

    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.focus();
        }
    }, [loading]);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = "auto";
            textarea.style.height = `${textarea.scrollHeight}px`;
        }
        if (textarea) {
            textarea.focus();
        }
    }, [userInput]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            sendMessage?.(e as unknown as React.FormEvent);
        }
    };

    const handleClearInput = () => {
        setUserInput?.("");
    };

    return (
        <form className={styles.inputForm} onSubmit={sendMessage}>
            <div className={uiStyles.input}>
                <textarea
                    ref={textareaRef}
                    rows={1}
                    value={userInput}
                    onChange={(e) => setUserInput?.(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter input"
                    disabled={loading}
                />
                {userInput && (
                    <button
                        type="button"
                        className={uiStyles.clearButton}
                        onClick={handleClearInput}
                    >
                        <span className={uiStyles.clearIcon}>&#x2716;</span>
                    </button>
                )}
                <button
                    type="submit"
                    title="Send"
                    className={classNames(
                        uiStyles.button,
                        uiStyles.greenButton
                    )}
                    disabled={loading}
                >
                    <SendIcon />
                </button>
            </div>
        </form>
    );
};

export default UserInput;
