import dotenv from "dotenv";
import express from "express";
import process from "process";
import sqlite3 from "sqlite3";
import cors from "cors";
import { v4 as uuidv4 } from "uuid";
import NLPCloudClient from "nlpcloud";

const app = express();
app.use(express.json());
app.use(cors());

dotenv.config();

if (!process.env.NLP_API_KEY || !process.env.NLP_MODEL) {
    throw new Error(
        "API key or Model is missing. Please add them to a .env file."
    );
}

const TOKEN_LIMIT = process.env.TOKEN_LIMIT || 2048;

/**
 * Creates a new NLPCloudClient instance with the specified model and API key.
 * @constructor
 * @param {string} model - The name of the NLP model to use.
 * @param {string} apiKey - The API key to use for authentication.
 * @param {boolean} [useSsl=true] - Whether to use SSL for requests (default: true).
 */
const client = new NLPCloudClient(
    process.env.NLP_MODEL,
    process.env.NLP_API_KEY,
    true
);

/**
 * Creates a new SQLite database connection.
 * @constructor
 * @param {string} database - The path to the SQLite database file.
 * @param {function} callback - The callback function to execute when the connection is established.
 */
const db = new sqlite3.Database("./database.db", (err) => {
    if (err) {
        console.error("Failed to connect to SQLite database:", err);
        return;
    }
    console.log("Connected to SQLite database.");

    // Create session_metadata table if it doesn't exist
    db.run(
        `CREATE TABLE IF NOT EXISTS session_metadata(
            session_id TEXT PRIMARY KEY, 
            title TEXT, 
            context TEXT
        );`
    );

    // Create chats table if it doesn't exist
    db.run(
        `CREATE TABLE IF NOT EXISTS chats(
            id INTEGER PRIMARY KEY AUTOINCREMENT, 
            session_id TEXT, 
            timestamp TEXT, 
            input TEXT, 
            response TEXT,
            FOREIGN KEY(session_id) REFERENCES session_metadata(session_id)
        );`
    );
});

/**
 * Tokenizes a string into an array of tokens.
 * @param {string} text - The text to tokenize.
 * @returns {string[]} An array of tokens.
 */
const tokenize = (text) => {
    // Define the size of each token.
    const tokenSize = 4;

    // Check if the input is a string.
    if (typeof text !== "string") {
        return [];
    }

    // Initialize an empty array to store the tokens.
    const tokens = [];

    // Loop through the input string and extract tokens of the specified size.
    for (let i = 0; i < text.length; i += tokenSize) {
        const token = text.slice(i, i + tokenSize);
        tokens.push(token);
    }

    // Return the array of tokens.
    return tokens;
};

/**
 * Trims the number of tokens in an array to a specified maximum.
 * @param {string[]} tokens - The array of tokens to trim.
 * @param {number} maxTokens - The maximum number of tokens to keep.
 * @returns {string} A string containing the trimmed tokens.
 */
const trimTokens = (tokens, maxTokens) => {
    // Remove tokens from the beginning of the array until the array length is less than or equal to the maximum.
    while (tokens.length > maxTokens) {
        tokens.shift();
    }

    // Join the remaining tokens into a single string and return it.
    return tokens.join("");
};

/**
 * Trims the chat history to a maximum number of tokens.
 *
 * @param {Array} chatHistory - The chat history to trim.
 * @param {number} maxTokens - The maximum number of tokens to allow in the chat history.
 * @returns {Array} - The trimmed chat history.
 */
const trimChatHistory = (chatHistory, maxTokens) => {
    let totalTokens = 0;

    // Calculate total token count in the chat history
    for (const message of chatHistory) {
        totalTokens += tokenize(message.input).length;
        totalTokens += tokenize(message.response).length;
    }

    // Remove oldest messages until we are below the token limit
    while (totalTokens > maxTokens) {
        const oldestMessage = chatHistory.shift(); // Remove the oldest message
        if (!oldestMessage) break; // Exit loop if chat history is empty

        // Subtract the tokens of the removed message from the total
        totalTokens -=
            tokenize(oldestMessage.input).length +
            tokenize(oldestMessage.response).length;
    }

    return chatHistory;
};

/**
 * Trims the input, context, and chat history to a maximum number of tokens.
 *
 * @param {string} input - The input text to trim.
 * @param {string} context - The context text to trim.
 * @param {Array<{input: string, response: string}>} chatHistory - The chat history to trim.
 * @param {number} maxTokens - The maximum number of tokens to allow.
 * @returns {{
 *  trimmedInput: string,
 *  trimmedContext: string,
 *  trimmedChatHistory: Array<{input: string, response: string}>,
 *  maxTokens: number,
 *  totalTokens: number
 * }} - An object containing the trimmed input, context, chat history, and token counts.
 */
const trimAllContent = (input, context, chatHistory, maxTokens) => {
    const inputTokens = tokenize(input);
    const contextTokens = tokenize(context);

    const chatHistoryString = chatHistory
        .map((item) => `${item.input} ${item.response}`)
        .join(" ");
    const historyTokens = tokenize(chatHistoryString);

    let totalTokens =
        inputTokens.length + historyTokens.length + contextTokens.length;

    if (totalTokens > maxTokens) {
        // Calculate remaining tokens for chatHistory and context after accounting for input
        let remainingTokens = maxTokens - inputTokens.length;

        // Trim chatHistory if necessary
        if (historyTokens.length > remainingTokens) {
            chatHistory = trimChatHistory(chatHistory, remainingTokens);
            remainingTokens = 0; // No more tokens left for context
        } else {
            remainingTokens -= historyTokens.length; // Update remaining tokens
        }

        // Trim context if necessary
        if (contextTokens.length > remainingTokens) {
            context = trimTokens(contextTokens, remainingTokens);
        }
    }

    return {
        trimmedInput: input,
        trimmedContext: context,
        trimmedChatHistory: chatHistory,
        maxTokens,
        totalTokens,
    };
};

/**
 * Cleans the chat history array by removing unnecessary properties.
 * @param {Object[]} arr - The chat history array to clean.
 * @returns {Object[]} A new array with the cleaned chat history.
 */
function cleanHistory(arr = []) {
    // Check if the input is an array.
    if (!Array.isArray(arr)) {
        console.error("The argument for fn cleanHistory is not an array.", arr);
        return [];
    }

    // Create a new array with the cleaned chat history and return it.
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    return arr.map(({ id, timestamp, session_id, ...rest }) => rest);
}

/**
 * Calls the NLP API to generate a response to the user's input.
 * @param {string} input - The user's input.
 * @param {Object} context - The context object for the conversation.
 * @param {Object[]} chatHistory - The chat history array.
 * @returns {Promise<Object>} A Promise that resolves to the API response data.
 * @throws {Error} If the API call fails.
 */
const callNlpApi = async (input, context, chatHistory) => {
    try {
        // Remove unnecessary properties from the chat history
        const cleanedHistory = cleanHistory(chatHistory);
        // Call the NLP API to generate a response.
        const response = await client.chatbot(input, context, cleanedHistory);

        // Return the response data.
        return response.data;
    } catch (error) {
        // Log the error details and re-throw the error.
        console.error("callNlpApi, Data:", error.response.data);
        console.error("callNlpApi, Status:", error.response.status);
        throw error;
    }
};

// jsdoc comment
/**
 * Creates a new chat session.
 * @param {string} input - The user's input.
 * @param {string} context - The context object for the conversation.
 * @param {Object[]} chatHistory - The chat history array.
 * @param {string} sessionId - The session ID for the chat session.
 * @param {boolean} isNewSession - Whether the chat session is new.
 * @returns {Promise<Object>} A Promise that resolves to the API response data.
 * @throws {Error} If the API call fails.
 * @throws {Error} If the input or session ID is missing.
 * @throws {Error} If the chat session is not new.
 * @throws {Error} If the chat session is not found.
 */
app.post("/api/chat", async (req, res) => {
    let { input, context, chatHistory, sessionId, isNewSession } = req.body;

    // Only proceed if there is input
    if (!input) {
        return res
            .status(400)
            .json({ error: "Input is required for a new chat" });
    }

    // Only proceed if there is a session id
    if (!sessionId) {
        return res
            .status(400)
            .json({ error: "Session Id is required for a new chat" });
    }

    if (isNewSession) {
        // Insert a new row into session_metadata when a new session starts
        db.run(
            "INSERT INTO session_metadata(session_id, title, context) VALUES (?, ?, ?)",
            [sessionId, input.substring(0, 100), context]
        );
    }

    try {
        const timestamp = new Date().toISOString();

        // There's some ambiguity here about token limits so this is a work in process
        // Is it total across input, context and history or just input and history or each it's own?
        // TODO: Figure out how to handle token limits
        const { trimmedInput, trimmedContext, trimmedChatHistory } =
            trimAllContent(input, context, chatHistory, TOKEN_LIMIT);

        const apiResponse = await callNlpApi(
            trimmedInput,
            trimmedContext,
            trimmedChatHistory
        );

        const botResponse = apiResponse.response;

        // Insert a new chat message into chats table
        db.run(
            "INSERT INTO chats(session_id, timestamp, input, response) VALUES (?, ?, ?, ?)",
            [sessionId, timestamp, input, botResponse]
        );

        res.json({ ...apiResponse, sessionId });
    } catch (error) {
        if (error.response) {
            // The request was made and the server responded with a status code
            // We already console.log this in the callNlpApi function
            // console.log("Headers:", error.response.headers);
        } else if (error.request) {
            // The request was made but no response was received
            console.error("Request:", error.request);
        } else {
            // Something happened in setting up the request that triggered an Error
            console.error("Error:", error.message);
        }
        res.status(500).json({ error: "An error occurred" });
    }
});

/**
 * Fetches the chat history for a given session ID.
 * @param {string} sessionId - The session ID to fetch the chat history for.
 * @returns {Promise<Object[]>} A Promise that resolves to an array of chat history objects.
 */
app.get("/api/previous-chats", async (req, res) => {
    try {
        const query = `
            SELECT session_metadata.session_id, 
                    session_metadata.title, 
                    session_metadata.context,
                    chats.timestamp,
                    chats.input,
                    chats.id
            FROM (
                SELECT session_id, MAX(timestamp) as MaxTime
                FROM chats
                GROUP BY session_id
            ) latestChats
            INNER JOIN session_metadata ON session_metadata.session_id = latestChats.session_id
            INNER JOIN chats ON chats.session_id = latestChats.session_id AND chats.timestamp = latestChats.MaxTime
            ORDER BY chats.timestamp DESC
        `;
        db.all(query, [], (err, rows) => {
            if (err) {
                throw err;
            }
            res.json(rows || []); // Send an empty array if no rows are returned
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({
            error: "An error occurred while fetching previous chats.",
        });
    }
});

/**
 * Fetches the chat history for a given session ID.
 * @param {string} sessionId - The session ID to fetch the chat history for.
 * @returns {Promise<Object[]>} A Promise that resolves to an array of chat history objects.
 */
app.get("/api/get-chat-history/:sessionId", async (req, res) => {
    const { sessionId } = req.params;
    try {
        // Query to fetch full chat history for the given sessionId
        const query = `SELECT * FROM chats WHERE session_id = ? ORDER BY timestamp ASC`;
        db.all(query, [sessionId], (err, rows) => {
            if (err) {
                throw err;
            }
            res.json(rows || []); // Send an empty array if no rows are returned
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({
            error: "An error occurred while fetching chat history.",
        });
    }
});

/**
 * Fetches the context for a given session ID.
 * @param {string} sessionId - The session ID to fetch the context for.
 * @returns {Promise<string>} A Promise that resolves to the context for the given session ID.
 */
app.get("/api/start-new-session", (req, res) => {
    const sessionId = uuidv4(); // Generate a new session ID
    res.json({ sessionId }); // Return the new session ID to the client
});

/**
 * Updates the context for a given session ID.
 * @param {string} sessionId - The session ID to update.
 * @param {string} newContext - The new context to set for the session.
 * @returns {Promise} A Promise that resolves when the context is updated.
 */
app.put("/api/update-context", async (req, res) => {
    const { context, sessionId } = req.body;
    if (!sessionId) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const query =
            "UPDATE session_metadata SET context = ? WHERE session_id = ?";
        db.run(query, [context, sessionId], function (err) {
            if (err) {
                throw err;
            }
            res.json({
                message: "Context updated successfully",
                changes: this.changes,
            });
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({
            error: "An error occurred while updating the context.",
        });
    }
});

/**
 * Deletes a chat session.
 * @param {string} sessionId - The session ID to delete.
 * @returns {Promise} A Promise that resolves when the chat is deleted.
 * @throws {Error} If the chat cannot be deleted.
 */
app.delete("/api/delete-chat", (req, res) => {
    const { sessionId } = req.body;

    if (!sessionId) {
        return res.status(400).json({ error: "Session ID is required" });
    }

    // Start a database transaction
    db.serialize(() => {
        db.run("BEGIN TRANSACTION");

        db.run(
            "DELETE FROM chats WHERE session_id = ?",
            [sessionId],
            function (err) {
                if (err) {
                    db.run("ROLLBACK");
                    console.error("Error:", err);
                    return res.status(500).json({
                        error: "An error occurred while deleting the chat.",
                    });
                }
            }
        );

        db.run(
            "DELETE FROM session_metadata WHERE session_id = ?",
            [sessionId],
            function (err) {
                if (err) {
                    db.run("ROLLBACK");
                    console.error("Error:", err);
                    return res.status(500).json({
                        error: "An error occurred while deleting the session metadata.",
                    });
                }
            }
        );

        db.run("COMMIT");
    });

    res.json({
        message: "Chat session deleted successfully",
    });
});

/**
 * Renames a chat session.
 * @param {string} newTitle - The new title for the chat session.
 * @param {string} sessionId - The session ID to rename.
 * @returns {Promise} A Promise that resolves when the chat is renamed.
 * @throws {Error} If the chat cannot be renamed.
 */
app.put("/api/rename-chat", async (req, res) => {
    const { newTitle, sessionId } = req.body;
    if (!newTitle || !sessionId) {
        return res.status(400).json({ error: "Missing required fields" });
    }

    try {
        const query =
            "UPDATE session_metadata SET title = ? WHERE session_id = ?";
        db.run(query, [newTitle, sessionId], function (err) {
            if (err) {
                throw err;
            }
            res.json({
                message: "Chat renamed successfully",
                changes: this.changes,
            });
        });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).json({
            error: "An error occurred while renaming the chat.",
        });
    }
});

/**
 * Updates the context for a given session ID.
 * @param {string} sessionId - The session ID to update.
 * @param {string} newContext - The new context to set for the session.
 * @returns {Promise} A Promise that resolves when the context is updated.
 */
app.post("/api/update-context", async (req, res) => {
    const { sessionId, newContext } = req.body;

    try {
        // SQL query to update the context for a given session ID
        const query = `
        UPDATE session_metadata
        SET context = $1
        WHERE session_id = $2
      `;

        // Execute the query
        await db.none(query, [newContext, sessionId]);

        res.status(200).json({ message: "Context updated successfully" });
    } catch (error) {
        console.error("Error updating context:", error);
        res.status(500).json({ message: "Internal Server Error" });
    }
});

const PORT = process.env.SERVER_PORT || 3000;
app.listen(PORT, () => {
    console.log(
        `Server is running on port ${PORT}\nModel: ${process.env.NLP_MODEL}\nToken Limit: ${process.env.TOKEN_LIMIT}`
    );
});
