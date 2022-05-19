import "./node_modules/socket.io-client/dist/socket.io.js";
import "./node_modules/xterm/lib/xterm.js";
import themes from "./themes.js";

$(document).ready(() => {
    const socket = io();
    let session = 0;

    let terminal = new Terminal({
        cursorStyle: "bar",
        cursorBlink: true,
        fontFamily: "Menlo",
        fontWeight: "normal",
        fontSize: 15,
        bellStyle: "sound",
        allowTransparency: true
    });
    terminal.open($("#terminal-section").get(0));

    const refreshTerminalSize = () => {
        let dims = terminal._core._renderService.dimensions;
        let width = Math.floor($("#terminal-section").width() / dims.actualCellWidth) - 1;
        let height = Math.floor($("#terminal-section").height() / dims.actualCellHeight);
        terminal.resize(width, height);

        socket.emit("resize", { cols: terminal.cols, rows: terminal.rows });
    }

    socket.on("connect", () => {
        $("#loader").hide();
        if(session > 0) $(`#session${session}-button`).removeClass("selected");
        session = 0;

        // This line makes the resize work. idk why
        terminal.resize(1, 1);
        refreshTerminalSize();
    });

    socket.on("switch", () => refreshTerminalSize());

    socket.on("out", (data) => terminal.write(data));

    terminal.onKey(({ key, event }) => socket.emit("in", key));

    terminal.attachCustomKeyEventHandler((event) => {
        if(!event.ctrlKey || (event.key != "c" && event.key != "v")) return true;
        if(event.type == "keydown" && event.key == "c") {
            if(terminal.getSelection().length <= 0) return true;
            navigator.clipboard.writeText(terminal.getSelection());
            terminal.clearSelection();
        }
        if(event.type == "keydown" && event.key == "v") {
            navigator.clipboard.readText().then((txt) => {
                socket.emit("in", txt);
            });
        }
        return false;
    });

    $("#refresh-button").click(() => refreshTerminalSize());

    // Settings
    socket.on("settings", (settings) => {
        setTheme(settings.theme);
    });

    const setTheme = (index) => {
        if(!index) return;
        let settings = { theme: index };
        socket.emit("settings", settings);
        let theme = Object.values(themes)[index];
        $("body").css("background-color", theme.background);
        terminal.setOption("theme", theme);
        $("#theme-select").val(index);
    }

    $("#settings-button").click(() => $("#settings").show());

    $("#close-settings").click(() => $("#settings").hide());

    $("#theme-select").change(() => setTheme($("#theme-select").val()));

    Object.keys(themes).forEach((theme, i) => {
        $("#theme-select").append(`<option value="${i}">${theme}</option>`)
    });

    for(let i = 1; i <= 3; i++) {
        $(`#session${i}-button`).click(() => {
            terminal.clear();
            if(session > 0) $(`#session${session}-button`).removeClass("selected");
            if(session == i) {
                socket.emit("dynamic");
                session = 0;
            } else {
                socket.emit("static", i - 1);
                $(`#session${i}-button`).addClass("selected");
                session = i;
            }
        });
    }
});