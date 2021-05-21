import express from "express";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { v4 as uuidV4 } from "uuid";

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 5000;
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
    },
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const peers = {};

app.get("/", (req, res) => {
    res.send("Server is running");
});

app.get("/join", (req, res) => {
    const roomId = uuidV4();
    res.send({ link: roomId });
});

io.on("connection", (socket) => {
    socket.emit("me", socket.id);

    socket.on("disconnect", () => {
        console.log("socket disconnected " + socket.id);
        // socket.broadcast.emit("removePeer", socket.id);
        delete peers[socket.id];
    });

    socket.on("join-room", (userData) => {
        const { roomID } = userData;
        const userID = socket.id;
        socket.join(roomID);
        console.log(`user ${userID} joined room ${roomID}`);

        socket.to(roomID).emit("initReceive", userID);
        console.log("sending init receive to " + userID);

        /**
         * Send message to client to initiate a connection
         * The sender has already setup a peer connection receiver
         */
        socket.on("initSend", (init_socket_id) => {
            console.log("INIT SEND by " + socket.id + " for " + init_socket_id);
            socket.to(roomID).emit("initSend", socket.id);
        });

        socket.on("signal", (data) => {
            console.log("sending signal from " + socket.id + " to ", data);
            socket.to(roomID).emit("signal", {
                socket_id: socket.id,
                signal: data.signal,
            });
        });

        socket.on("disconnect", () => {
            console.log("user disconnected");
            socket.to(roomID).emit("disconnected", userID);
        });

        socket.on("broadcast-message", (message) => {
            socket.to(roomID).emit("new-broadcast-messsage", {
                ...message,
                userData,
            });
        });
        // socket.on('reconnect-user', () => {
        //     socket.to(roomID).broadcast.emit('new-user-connect', userData);
        // });
        socket.on("display-media", (value) => {
            socket
                .to(roomID)
                .broadcast.emit("display-media", { userID, value });
        });
        socket.on("user-video-off", (value) => {
            socket.to(roomID).broadcast.emit("user-video-off", value);
        });
    });
});

server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
