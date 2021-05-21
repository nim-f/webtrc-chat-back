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
    res.send({ link: uuidV4() });
});

const peers = {};

io.on("connection", (socket) => {
    peers[socket.id] = socket;
    // Asking all other clients to setup the peer connection receiver
    for (let id in peers) {
        if (id === socket.id) continue;
        console.log("sending init receive to " + socket.id);
        peers[id].emit("initReceive", socket.id);
    }

    /**
     * relay a peerconnection signal to a specific socket
     */
    socket.on("signal", (data) => {
        console.log("sending signal from " + socket.id + " to ", data);
        if (!peers[data.socket_id]) return;
        peers[data.socket_id].emit("signal", {
            socket_id: socket.id,
            signal: data.signal,
        });
    });

    socket.emit("me", socket.id);

    socket.on("disconnect", () => {
        console.log("socket disconnected " + socket.id);

        socket.broadcast.emit("removePeer", socket.id);
        delete peers[socket.id];
    });

    /**
     * Send message to client to initiate a connection
     * The sender has already setup a peer connection receiver
     */
    socket.on("initSend", (init_socket_id) => {
        console.log("INIT SEND by " + socket.id + " for " + init_socket_id);
        peers[init_socket_id].emit("initSend", socket.id);
    });
});

server.listen(port, () => {
    console.log(`Server listening on port ${port}`);
});
