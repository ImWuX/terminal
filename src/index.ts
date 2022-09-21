import fs from "fs";
import express from "express";
import path from "path";
import http from "http";
import { Server  } from "socket.io";
import { spawn } from "node-pty";

const app = express();
const server = http.createServer(app);
const io = new Server(server);

io.on("connection", async (socket) => {
    // Settings
    socket.on("settings", async (settings) => await fs.writeFileSync(path.join(__dirname, "..", "settings.json"), JSON.stringify(settings)));
    socket.emit("settings", JSON.parse(await fs.readFileSync(path.join(__dirname, "..", "settings.json")).toString()));

    // Terminal
    let terminal = spawn("bash", [], {
        name: "xterm-color",
        cols: 80,
        rows: 30,
        cwd: process.env.HOME
    });
    terminal.onData((data) => socket.emit("out", data));
    socket.on("in", (data) => terminal.write(data));
    socket.on("resize", (data) => terminal.resize(data.cols, data.rows));
    socket.on("disconnect", () => terminal.kill());

    terminal.write("clear && motd\n");
});

// Serve Frontend
app.use(express.static(path.join(__dirname, "..", "frontend")));

server.listen(Number(process.env.TERMINAL_PORT), () => {
    console.log(`Serving Terminal on port ${process.env.TERMINAL_PORT}`);
});