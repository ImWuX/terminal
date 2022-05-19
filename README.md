# Terminal
Terminal is an SSH like terminal in the browser. It does not have any authentication built-in, it is recommended to use a reverse proxy based authentication system. For example, [Vouch](https://github.com/vouch/vouch-proxy).

**Features:**
- Many themes to choose from
- Three static terminals (persists after refesh)

# Installation
Simply clone the repository onto your server. After that build the project using `npm run build`. Then simply run index.js in build/ using node. For a production environment on linux, you could use the service unit file provided.