module.exports = {
    hosts: [
        {
            name: "main-meadow",
            ip: "192.81.214.240",
            identityFile: "/home/austinkregel/.ssh/id_rsa",
            user: "forge"
        }
    ],
    scripts: [
        {
            name: "deploy",
            file: ".scripts/release-deploy.sh",
        }
    ]
}
