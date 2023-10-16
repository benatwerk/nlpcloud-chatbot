export interface Chat {
    id: number;
    title: string;
    timestamp: string;
    session_id: string;
    context: string;
    input: string;
}

export interface CurrentChat {
    id: number;
    session_id: string;
    timestamp: string;
    input: string;
    response: string;
}

export interface NewSessionResponse {
    sessionId?: string;
}
