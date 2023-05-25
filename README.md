# Terminal
Terminal is... well a terminal in the browser. It does not have any authentication built-in, it is recommended to use a reverse proxy based authentication system. For example, [Vouch](https://github.com/vouch/vouch-proxy). It has bare bones features, such as some themes but besides that it is just a terminal.

# Installation
Simply clone the repository onto your server. After that build the project using `npm run build`. Then simply run index.js in build/ using node. For a production environment on linux, you could use the service unit file provided.
