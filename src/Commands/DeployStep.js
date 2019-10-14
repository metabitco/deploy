const Command = require('forge-cli/src/Command');
const { checkOrInitDeployFile, timestamp, checkOrInitLogFiles } = require('../helpers');
const node_ssh = require('node-ssh');
const ssh  = new node_ssh();
const fs = require('fs');
const date = timestamp();

module.exports = class DeployStepCommand extends Command {
    constructor(context) {
        super(context);
        this.signature = 'step {part}';
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

        let type = 'succeed'
        for (let key in config.hosts) {
            const host = config.hosts[key];
            let status = await this.connectAndExecute({
                host,
                scripts: config.scripts.filter(script => script.name === this.argument('part')),
            })

            if (status === 1) {
                type = 'fail';
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
        const { ip, user, identityFile, name } = host;
        if (scripts.length === 0) {
            this.spinner.fail('We have no scripts to run for server ' + name);
            return 1;
        }

        this.spinner.start('Logging into ' + ip + ' as ' + user);
        try {
            await ssh.connect({
                host: ip,
                username: user,
                privateKey: identityFile
            });
            this.spinner = this.spinner.stopAndPersist({
                text: 'Successfully logged into ' + ip + ' as ' + user,
                symbol: this.chalk.green('✔'),
            })
        } catch (e) {
            this.spinner.stopAndPersist();
            this.spinner.fail('Couldn\'t login! Please check the auth details and internet connection, then try again.')
            return;
        }

        for (let key in scripts) {
            const script = scripts[key];

            await this.executeScript(script, host)
        }

        ssh.dispose();
    }

    async executeScript({ file, name }, host) {
        try {
            const {stderr, stdout} = await ssh.exec(fs.readFileSync(file))
            this.spinner = this.spinner.stopAndPersist({
                text: this.chalk.green(name) + this.chalk.white(' on ') + this.chalk.green(host.name),
                symbol: this.chalk.green('✔'),
            });
            checkOrInitLogFiles(date, host, stderr, name+'-stderr');
            checkOrInitLogFiles(date, host, stdout, name+'-stdout');
            return;
        } catch (e) {
            console.error(e)
            this.spinner = this.spinner.stopAndPersist({
                text: name + ' failed during execution!',
                symbol: this.chalk.red('✖'),
            })
            return null;
        }
    }
}