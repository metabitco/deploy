const fs = require('fs');

const checkOrInitDeployFile = ({ pwd, configFile }) => {
    if (!fs.existsSync(pwd + configFile)) {
        fs.writeFileSync(pwd + configFile, `module.exports = {
    hosts: [
        {
            name: "example",
            ip: "example.com",
            identityFile: ".ssh/id_rsa",
            user: "root"
        }
    ],
    scripts: [
        {
            name: "deploy",
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

const checkOrInitLogFiles = (date, host, output, name) => {
    const logDir = '.scripts/logs/' + date + '/' + slugify(host.name);

    if (output.length === 0) {
         return;
    }

    if (!fs.existsSync(logDir)) {
        fs.mkdirSync(logDir, {
            recursive: true
        });
        fs.writeFileSync(logDir + '/' + slugify(name) + '.log', '');
    }

    fs.appendFileSync(logDir + '/' + slugify(name) + '.log', output);
}

const timestamp = () => {
    const pad = (number) => {
        var r = String(number);
        if ( r.length === 1 ) {
            r = '0' + r;
        }
        return r;
    }

    let date = new Date;
    return date.getUTCFullYear()
        + '-' + pad( date.getUTCMonth() + 1 )
        + '-' + pad( date.getUTCDate() )
        + ' ' + pad( date.getUTCHours() )
        + ':' + pad( date.getUTCMinutes() )
        + ':' + pad( date.getUTCSeconds() )
        + '-UTC'
}

module.exports = {
    checkOrInitDeployFile,
    slugify,
    checkOrInitLogFiles,
    timestamp
}