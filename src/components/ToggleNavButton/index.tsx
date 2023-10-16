import React, { useContext } from "react";
import { ChatContext } from "@/ChatContext";
import { OpenIcon, CloseIcon } from "@/components/Icons";

const ToggleNavButton: React.FC = () => {
    const { isNavCollapsed, handleNavToggle } = useContext(ChatContext) || {};

    return (
        <button onClick={handleNavToggle}>
            {isNavCollapsed ? <OpenIcon size={24} /> : <CloseIcon size={24} />}
        </button>
    );
};

export default ToggleNavButton;
