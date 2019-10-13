const fs = require('fs');

const checkOrInitDeployFile = ({ pwd, configFile }) => {
    if (!fs.existsSync(pwd + configFile)) {
        fs.writeFileSync(pwd + configFile, `module.exports = {
    hosts: [
        {
            name: "huricane",
            ip: "20.3.103.54",
            identityFile: ".ssh/id_rsa",
            user: "root"
        },
        {
            name: "meadow",
            ip: "38.103.98.1",
            identityFile: "/.ssh/id_rsa",
            user: "root"
        }
    ],
    scripts: [
        {
            name: "deploy",
            file: ".scripts/init-deploy.sh",
        },
        {
            name: "deploy:prepare",
            file: ".scripts/prepare-deploy.sh",
        },
        {
            name: "deploy:release",
            file: ".scripts/release-deploy.sh",
        }
    ]
}
`);
    }
}

// Credit
// @see https://gist.github.com/hagemann/382adfc57adbd5af078dc93feef01fe1#file-slugify-js
function slugify(string) {
    const a = 'àáâäæãåāăąçćčđďèéêëēėęěğǵḧîïíīįìłḿñńǹňôöòóœøōõṕŕřßśšşșťțûüùúūǘůűųẃẍÿýžźż·/_,:;'
    const b = 'aaaaaaaaaacccddeeeeeeeegghiiiiiilmnnnnooooooooprrsssssttuuuuuuuuuwxyyzzz------'
    const p = new RegExp(a.split('').join('|'), 'g')

    return string.toString().toLowerCase()
        .replace(/\s+/g, '-') // Replace spaces with -
        .replace(p, c => b.charAt(a.indexOf(c))) // Replace special characters
        .replace(/&/g, '-and-') // Replace & with 'and'
        .replace(/[^\w\-]+/g, '') // Remove all non-word characters
        .replace(/\-\-+/g, '-') // Replace multiple - with single -
        .replace(/^-+/, '') // Trim - from start of text
        .replace(/-+$/, '') // Trim - from end of text
}

const checkOrInitLogFiles = (date, host, output) => {
    const logDir = '.scripts/logs/' + date + '/' + slugify(host.name);
    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, {
            recursive: true
        });
        fs.writeFileSync(logDir + '/' + slugify(script.name) + '.log', '');
    }

    fs.appendFileSync(logDir + '/' + slugify(script.name) + '.log', output);
}

module.exports = {
    checkOrInitDeployFile,
    slugify,
    checkOrInitLogFiles,
}