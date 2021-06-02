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

app.get("/", (req, res) => {
    res.send("Server is running");
});

app.get("/join", (req, res) => {
    const roomId = uuidV4();
    res.send({ link: roomId });
});

io.on("connection", (socket) => {
    socket.on("join-room", (roomID, userID) => {
        socket.join(roomID);
        console.log(`user ${userID} joined room ${roomID}`);
        socket.to(roomID).emit("user-connected", userID);

        socket.on("disconnect", () => {
            console.log("user disconnected ", userID);
            socket.to(roomID).emit("disconnected", userID);
        });

        socket.on("broadcast-message", (message) => {
            socket.to(roomID).emit("new-broadcast-messsage", {
                ...message,
                userData,
            });
        });
    });
});

server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
