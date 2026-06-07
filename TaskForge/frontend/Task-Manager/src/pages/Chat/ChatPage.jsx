import React from 'react';
import DashboardLayout from '../../components/layouts/DashboardLayout';
import ChatInterface from '../../components/Chat/ChatInterface';
import { useUserAuth } from '../../hooks/useUserAuth';

const ChatPage = () => {
    useUserAuth();

    return (
        <DashboardLayout activeMenu="Chat" isChatPage={true}>
            <div className="h-full overflow-hidden">
                <ChatInterface />
            </div>
        </DashboardLayout>
    );
};

export default ChatPage;
