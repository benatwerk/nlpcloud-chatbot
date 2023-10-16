import React, { useState, useEffect, useRef, useContext } from "react";
import { ChatContext } from "@/ChatContext";
import classNames from "classnames";
import uiStyles from "@/ui.module.scss";
import styles from "./ContextInput.module.scss";
import { ContextIcon, SaveIcon } from "@/components/Icons";

const ContextInput: React.FC = () => {
    const { chatContext, setChatContext, updateContext } =
        useContext(ChatContext) || {};

    const [contextCollapsed, setContextCollapsed] = useState(true);

    const handleContextCollapsedToggle = () => {
        setContextCollapsed(!contextCollapsed);
    };

    const formRef = useRef<HTMLFormElement>(null);
    const textareaRef = useRef<HTMLTextAreaElement>(null);

    useEffect(() => {
        const textarea = textareaRef.current;
        if (textarea) {
            textarea.style.height = "auto";
            if (textarea.scrollHeight)
                textarea.style.height = `${textarea.scrollHeight}px`;
        }
    }, [chatContext]);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            updateContext?.(e as unknown as React.FormEvent);
        }
    };

    const handleClearInput = () => {
        setChatContext?.("");
    };

    return (
        <form
            ref={formRef}
            className={classNames(styles.inputForm, {
                [styles.collapsed]: contextCollapsed,
            })}
            onSubmit={updateContext}
        >
            <button
                className={styles.contentCollapsedButton}
                onClick={handleContextCollapsedToggle}
            >
                <ContextIcon /> <strong>Change Context</strong>
            </button>
            <div className={classNames(uiStyles.input, styles.input)}>
                <textarea
                    ref={textareaRef}
                    rows={4}
                    value={chatContext}
                    className={styles.textarea}
                    onChange={(e) => setChatContext?.(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Enter context"
                />
                {chatContext && (
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
                    title="Update Context"
                    className={classNames(uiStyles.button, uiStyles.blueButton)}
                >
                    <SaveIcon />
                </button>
            </div>
        </form>
    );
};

export default ContextInput;
