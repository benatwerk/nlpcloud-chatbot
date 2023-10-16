import React, { useContext } from "react";
import { ChatContext } from "@/ChatContext";
import styles from "./Loader.module.scss";
import { LoadingIcon } from "@/components/Icons";

const Loader: React.FC = () => {
    const { loading } = useContext(ChatContext) || {};
    if (!loading) return null;
    return (
        <div className={styles.loader}>
            <LoadingIcon />
        </div>
    );
};

export default Loader;
