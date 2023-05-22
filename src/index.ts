import "dotenv/config";
import fs from "fs";
import express, { Request, Response } from "express";
import path from "path";
import http from "http";
import { Server, Socket } from "socket.io";
import { spawn } from "node-pty";
import fileUpload, { UploadedFile, FileArray } from "express-fileupload";
import crypto from "crypto";

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    maxHttpBufferSize: 0x1E8
});

let fileUploadSecrets: { [key: string]: { path: string, socket: Socket }} = {};

app.use(fileUpload({
    limits: {
        fileSize: 1024 * 1024 * 1024 * 10
    }
}));

io.on("connection", async (socket) => {
    // Settings
    socket.on("settings", async (settings) => await fs.writeFileSync(path.join(__dirname, "..", "settings.json"), JSON.stringify(settings)));
    socket.emit("settings", JSON.parse(await fs.readFileSync(path.join(__dirname, "..", "settings.json")).toString()));

    // Terminal
    let bash = spawn("bash", [], {
        name: "xterm-color",
        cols: 80,
        rows: 30,
        cwd: process.env.HOME
    });
    let terminal = bash;
    terminal.onData((data) => socket.emit("out", data));
    socket.on("in", (data) => terminal.write(data));
    socket.on("resize", (data) => terminal.resize(data.cols, data.rows));
    socket.on("disconnect", () => terminal.kill());

    socket.on("upload", (cb) => {
        let secret: string;
        do {
            secret = crypto.randomBytes(16).toString("hex");
        } while(fileUploadSecrets[secret]);
        fs.readlink(`/proc/${bash.pid}/cwd`, (err, path) => {
            if(err) throw err;
            fileUploadSecrets[secret] = { path: path, socket: socket };
        });
        cb(secret);
    });

    terminal.write("clear && motd\n");
});

// Serve Frontend
app.use(express.static(path.join(__dirname, "..", "frontend")));

app.post("/upload/:secret", (req: Request, res: Response) => {
    if(!req.files) return res.sendStatus(400);
    for(let file of Object.values(req.files) as UploadedFile[]) {
        file.mv(`${fileUploadSecrets[req.params.secret].path}/${file.name}`);
        fileUploadSecrets[req.params.secret].socket.emit("out", `Uploaded ${file.name} to ${fileUploadSecrets[req.params.secret].path}\n\r`);
    }
    delete fileUploadSecrets[req.params.secret];
    res.sendStatus(200);
});

server.listen(Number(process.env.TERMINAL_PORT), () => {
    console.log(`Serving Terminal on port ${process.env.TERMINAL_PORT}`);
});