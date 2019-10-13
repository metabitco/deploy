module.exports = {
    hosts: [
        {
            name: "hurricane",
            ip: "165.120.8.12",
            identityFile: "/home/austinkregel/.ssh/id_rsa",
            user: "forge"
        },
        {
            name: "mossy",
            ip: "8.12.190.29",
            identityFile: "/home/austinkregel/.ssh/id_rsa",
            user: "forge"
        },
    ],
    scripts: [
        {
            name: "clone:new-release",
            file: ".scripts/1.clone-new-release.sh",
        },
        {
            name: "install:composer-dependencies",
            file: ".scripts/2.a.install-composer-dependencies.sh",
        },
        {
            name: "install:dependencies",
            file: ".scripts/2.b.install-npm-dependencies.sh",
        },
        {
            name: "build:assets",
            file: ".scripts/2.c.build-assets.sh",
        },
        {
            name: "copy:env-file",
            file: ".scripts/3.cp-env-file.sh",
        },
        {
            name: "install:the-db",
            file: ".scripts/4.install-db.sh",
        },
        {
            name: "publish:laravel-packages",
            file: ".scripts/5.publish-laravel-packages.sh",
        },
        {
            name: "optimize:php",
            file: ".scripts/6.optimize-php.sh",
        },
        {
            name: "link:storage",
            file: ".scripts/7.link-storage.sh",
        },
        {
            name: "reset:horizon",
            file: ".scripts/8.reset-horizon.sh",
        },
        {
            name: "activate:new-release",
            file: ".scripts/9.activate-new-release.sh",
        },
        {
            name: "clear:cache",
            file: ".scripts/10.clear-cache.sh",
        },
        {
            name: "cleanup",
            file: ".scripts/11.cleanup.sh",
        },
        {
            name: "restart:fpm",
            file: ".scripts/12.restart-fpm.sh",
        }
    ]
}
