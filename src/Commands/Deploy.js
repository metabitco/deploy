const Command = require('forge-cli/src/Command');
const { checkOrInitDeployFile, slugify, checkOrInitLogFiles } = require('../helpers');
const node_ssh = require('node-ssh');
const ssh  = new node_ssh();
const fs = require('fs');
const date = new Date;

module.exports = class DeployCommand extends Command {
    constructor(context) {
        super(context);
        this.signature = 'start';
        this.description = 'This will list all commands registered with an application.';
        this.spinner = require('ora')();
        this.handle = this.handle.bind(this);
    }

    async handle() {
        const pwd = process.env.PWD + '/';
        const configFile = this.option('config') || '.deploy.js';

        checkOrInitDeployFile({ pwd, configFile });

        const config = require(pwd + configFile);

        this.ensureScriptsExist({
            scripts: config.scripts,
        })

        let type = 'succeed';
        for (let key in config.hosts) {
            const host = config.hosts[key];
            let status = await this.connectAndExecute({
                host,
                scripts: config.scripts,
            })

            if (status === 1) {
                type = 'fail';
                break;
            }
        }

        this.spinner[type](type === 'succeed'
            ? this.chalk.green('Successfully deployed!')
            : this.chalk.red('Something went wrong!'))
    }

    ensureScriptsExist({ scripts }) {
        scripts.forEach(({ file }) => {
            if (!fs.existsSync(file)) {
                console.error(this.chalk.red('The file [') + this.chalk.yellow(file) + this.chalk.red('] does not exist. Please create the script and try again'))
                process.exit(1);
            }
        });
    }

    async connectAndExecute({ host, scripts }) {
        const { ip, user, identityFile } = host;
        this.spinner.start('Logging into ' + ip + ' as ' + user);

        try {
            await ssh.connect({
                host: ip,
                username: user,
                privateKey: identityFile.startsWith('/') ? identityFile : process.env.HOME + '/' + identityFile
            });
            this.spinner = this.spinner.stopAndPersist({
                text: 'Successfully logged into ' + ip + ' as ' + user,
                symbol: this.chalk.green('✔'),
            })
        } catch (e) {
            this.spinner.stopAndPersist();
            this.spinner.fail('Couldn\'t login! Please check the auth details and internet connection, then try again.')
            return 1;
        }

        let status;
        for (let key in scripts) {
            const script = scripts[key];

            status = await this.executeScript(script, host)

            if (status === 1) {
                break;
            }
        }

        try {
            ssh.dispose();
        } finally {
            if (status === 1) {
                return 1;
            }
            return;
        }
    }

    async executeScript({name, file}, host) {
        this.spinner.start('Executing task ' + name)
        try {
            const output = await ssh.exec(fs.readFileSync(file))
            this.spinner = this.spinner.stopAndPersist({
                text: this.chalk.green(name) + this.chalk.white(' on ') + this.chalk.green(host.name),
                symbol: this.chalk.green('✔'),
            });
            checkOrInitLogFiles(date, host, name, output);
            return;
        } catch (e) {
            console.log('')
            console.error(e)
            this.spinner = this.spinner.stopAndPersist({
                text: name + ' failed during execution!',
                symbol: this.chalk.red('✖'),
            })
            return 1;
        }
    }
}