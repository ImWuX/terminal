import "./node_modules/socket.io-client/dist/socket.io.js";
import "./node_modules/xterm/lib/xterm.js";
import themes from "./themes.js";

$(document).ready(() => {
    const socket = io();

    window.addEventListener('dragover', (e) => {
        e.preventDefault()
    });

    window.addEventListener("drop", (e) => {
        let files = e.dataTransfer.files;
        e.preventDefault();

        socket.emit("upload", (secret) => {
            let formData = new FormData()
            for(let file of files) {
                console.log(file.name);
                formData.append(`file_${file.name}`, file);
            }
            fetch(`/upload/${secret}`, {
                method: 'POST',
                body: formData
            });
        });

    });

    let session = 0;

    let terminal = new Terminal({
        cursorStyle: "bar",
        cursorBlink: true,
        fontFamily: "FiraCode",
        fontWeight: "normal",
        fontSize: 15,
        bellStyle: "sound",
        allowTransparency: true,
        tabStopWidth: 4
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
        const settings = { theme: index };
        socket.emit("settings", settings);

        let theme = Object.values(themes)[index];
        if(theme.extends) {
            const extendedTheme = themes[theme.extends];
            for(const [key, value] of Object.entries(extendedTheme)) {
                if(!theme[key]) theme[key] = value;
            }
        }
        if(theme.image) {
            theme.background = "transparent";
            $("body").css("background", `linear-gradient(rgba(0, 0, 0, ${theme.imageDarken ? theme.imageDarken : 0}), rgba(0, 0, 0, ${theme.imageDarken ? theme.imageDarken : 0})), url(${theme.image})`);
        } else {
            $("body").css("background", "");
            $("body").css("background-color", theme.background);
        }
        terminal.setOption("theme", theme);
        $("#theme-select").val(index);
    }

    $("#settings-button").click(() => $("#settings").show());

    $("#close-settings").click(() => $("#settings").hide());

    $("#theme-select").change(() => setTheme($("#theme-select").val()));

    Object.keys(themes).forEach((theme, i) => {
        $("#theme-select").append(`<option value="${i}">${theme}</option>`)
    });
});