module.exports = {
    settings: {
        "vetur.format.defaultFormatter.js": "vscode- typescript",
        "vetur.format.defaultFormatter.html": "prettyhtml",
        "vetur.format.defaultFormatter.css": "prettier",
        "vetur.format.defaultFormatter.scss": "prettier",
        "vetur.format.defaultFormatter.less": "prettier",
        "vetur.format.defaultFormatter.postcss": "prettier",
        "vetur.format.defaultFormatter.stylus": "stylus- supremacy"
    },
    projects: [
        {
            root: "./frontend",
            package: "./package.json"
        }
    ],
    workspaceFolder: "./frontend"
};
