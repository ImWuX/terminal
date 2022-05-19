import fs from "fs";
import express from "express";
import path from "path";
import http from "http";
import { Server, Socket } from "socket.io";
import { spawn, IPty } from "node-pty";

const staticSessionCount = 3;
let staticSessions: IPty[] = [];
let staticSessionOut: string[] = [];

const app = express();
const server = http.createServer(app);
const io = new Server(server);

for(let i = 0; i < staticSessionCount; i++) {
    staticSessions[i] = spawnTerminal();
    staticSessionOut[i] = "";
}

io.on("connection", async (socket) => {
    // Settings
    socket.on("settings", async (settings) => await fs.writeFileSync(path.join(__dirname, "..", "settings.json"), JSON.stringify(settings)));
    socket.emit("settings", JSON.parse(await fs.readFileSync(path.join(__dirname, "..", "settings.json")).toString()));

    dynamicTerminal(socket);
});

function dynamicTerminal(socket: Socket) {
    let terminal = spawnTerminal();
    terminal.onData((data) => socket.emit("out", data));
    socket.on("in", (data) => terminal.write(data));
    socket.on("resize", (data) => terminal.resize(data.cols, data.rows));
    socket.on("disconnect", () => terminal.kill());

    terminal.write("clear && motd\n");

    socket.on("static", (num) => {
        if(num < 0 || num >= staticSessionCount) return;

        terminal.kill();
        clearListeners(socket);
        staticTerminal(socket, num);
    });

    socket.emit("switch");
}

function staticTerminal(socket: Socket, num: number) {
    let terminal = staticSessions[num];

    let onDataListener = terminal.onData((data) => {
        staticSessionOut[num] += data;
        socket.emit("out", data);
    });
    socket.on("in", (data) => terminal.write(data));
    socket.on("resize", (data) => terminal.resize(data.cols, data.rows));

    socket.emit("out", staticSessionOut[num]);

    socket.on("dynamic", () => {
        clearListeners(socket);
        onDataListener.dispose();
        dynamicTerminal(socket)
    });

    socket.on("static", (num) => {
        clearListeners(socket);
        onDataListener.dispose();
        staticTerminal(socket, num)
    });

    terminal.onExit(() => {
        clearListeners(socket);
        onDataListener.dispose();
        staticSessionOut[num] = "\u001b[31mERROR: Session Closed (Restarting)\u001b[0m\n";''
        staticSessions[num] = spawnTerminal();
        staticTerminal(socket, num);
    });

    socket.emit("switch");
}

function clearListeners(socket: Socket) {
    socket.removeAllListeners("in");
    socket.removeAllListeners("resize");
    socket.removeAllListeners("disconnect");
    socket.removeAllListeners("static");
    socket.removeAllListeners("dynamic");
}

function spawnTerminal() {
    return spawn("bash", [], {
        name: "xterm-color",
        cols: 80,
        rows: 30,
        cwd: process.env.HOME
    });
}

// Serve Frontend
app.use(express.static(path.join(__dirname, "..", "frontend")));

server.listen(Number(process.env.TERMINAL_PORT), () => {
    console.log(`Serving Terminal on port ${process.env.TERMINAL_PORT}`);
});