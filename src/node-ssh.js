const Path = require('path');
const SSH2 = require('ssh2');
const pMap = require('p-map');
const invariant = require('assert');
const scanDirectory = require('sb-scandir');
const shellEscape = require('shell-escape');
const Helpers = require('./node-ssh-helpers');

class SSH {
    constructor() {
        this.connection = null;
    }
    connect(givenConfig) {
        const connection = new SSH2();
        this.connection = connection;
        return new Promise(function (resolve) {
            resolve(Helpers.normalizeConfig(givenConfig));
        }).then(config => new Promise((resolve, reject) => {
            connection.on('error', reject);
            if (config.onKeyboardInteractive) {
                connection.on('keyboard-interactive', config.onKeyboardInteractive);
            }
            connection.on('ready', () => {
                connection.removeListener('error', reject);
                resolve(this);
            });
            connection.on('end', () => {
                if (this.connection === connection) {
                    this.connection = null;
                }
            });
            connection.on('close', () => {
                if (this.connection === connection) {
                    this.connection = null;
                }
                const error = new Error('No response from server');
                // $FlowIgnore: Custom attribute
                error.code = 'ETIMEDOUT';
                reject(error);
            });
            connection.connect(config);
        }));
    }

    async requestShell() {
        const {connection} = this;
        invariant(connection, 'Not connected to server');
        return new Promise(function (resolve, reject) {
            connection.shell(Helpers.generateCallback(resolve, reject));
        });
    }

    async requestSFTP() {
        const {connection} = this;
        invariant(connection, 'Not connected to server');
        return new Promise(function (resolve, reject) {
            connection.sftp(Helpers.generateCallback(resolve, reject));
        });
    }

    async mkdir(path, type = 'sftp', givenSftp = null) {
        invariant(this.connection, 'Not connected to server');
        invariant(type === 'exec' || type === 'sftp', 'Type should either be sftp or exec');
        if (type === 'exec') {
            const output = await this.exec('mkdir', ['-p', path]);
            if (output.stdout) {
                throw new Error(output.stdout);
            }
        } else {
            invariant(!givenSftp || typeof givenSftp === 'object', 'sftp must be an object');
            const sftp = givenSftp || (await this.requestSFTP());
            const makeSftpDirectory = retry => Helpers.mkdirSftp(path, sftp).catch(error => {
                if (retry && error && (error.message === 'No such file' || error.code === 'ENOENT')) {
                    return this.mkdir(Path.dirname(path), 'sftp', sftp).then(() => makeSftpDirectory(false));
                }
                throw error;
            });
            try {
                await makeSftpDirectory(true);
            } finally {
                if (!givenSftp) {
                    sftp.end();
                }
            }
        }
    }

    async exec(command, parameters = [], options = {}) {
        invariant(this.connection, 'Not connected to server');
        invariant(typeof options === 'object' && options, 'options must be an Object');
        invariant(!options.cwd || typeof options.cwd === 'string', 'options.cwd must be a string');
        invariant(!options.stdin || typeof options.stdin === 'string', 'options.stdin must be a string');
        invariant(!options.stream || ['stdout', 'stderr', 'both'].indexOf(options.stream) !== -1, 'options.stream must be among "stdout", "stderr" and "both"');
        invariant(!options.options || typeof options.options === 'object', 'options.options must be an object');
        const output = await this.execCommand([command].concat(shellEscape(parameters)).join(' '), options);
        if (!options.stream || options.stream === 'stdout') {
            if (output.code !== 0) {
                throw new Error(output.stderr);
            }
            return {
                stdout: output.stdout,
                stderr: output.stderr,
            };
        }
        if (options.stream === 'stderr') {
            return {
                stderr: output.stderr,
                stdout: output.stdout,
            };
        }
        return output;
    }

    async execCommand(givenCommand, options = {}) {
        let command = givenCommand;
        const {connection} = this;
        invariant(connection, 'Not connected to server');
        invariant(typeof options === 'object' && options, 'options must be an Object');
        invariant(!options.cwd || typeof options.cwd === 'string', 'options.cwd must be a string');
        invariant(!options.stdin || typeof options.stdin === 'string', 'options.stdin must be a string');
        invariant(!options.options || typeof options.options === 'object', 'options.options must be an object');
        if (options.cwd) {
            // NOTE: Output piping cd command to hide directory non-existent errors
            command = `cd ${shellEscape([options.cwd])} 1> /dev/null 2> /dev/null; ${command}`;
        }
        const output = {stdout: [], stderr: []};
        return new Promise(function (resolve, reject) {
            connection.exec(command, options.options || {}, Helpers.generateCallback(function (stream) {
                stream.on('data', function (chunk) {
                    if (options.onStdout)
                        options.onStdout(chunk);
                    output.stdout.push(chunk);
                });
                stream.stderr.on('data', function (chunk) {
                    if (options.onStderr)
                        options.onStderr(chunk);
                    output.stderr.push(chunk);
                });
                if (options.stdin) {
                    stream.write(options.stdin);
                    stream.end();
                }
                stream.on('close', function (code, signal) {
                    resolve({
                        code,
                        signal,
                        stdout: output.stdout.join('').trim(),
                        stderr: output.stderr.join('').trim()
                    });
                });
            }, reject));
        });
    }

    async getFile(localFile, remoteFile, givenSftp = null, givenOpts = null) {
        invariant(this.connection, 'Not connected to server');
        invariant(typeof localFile === 'string' && localFile, 'localFile must be a string');
        invariant(typeof remoteFile === 'string' && remoteFile, 'remoteFile must be a string');
        invariant(!givenSftp || typeof givenSftp === 'object', 'sftp must be an object');
        invariant(!givenOpts || typeof givenOpts === 'object', 'opts must be an object');
        const opts = givenOpts || {};
        const sftp = givenSftp || (await this.requestSFTP());
        try {
            await new Promise(function (resolve, reject) {
                sftp.fastGet(remoteFile, localFile, opts, Helpers.generateCallback(resolve, reject));
            });
        } finally {
            if (!givenSftp) {
                sftp.end();
            }
        }
    }

    async putFile(localFile, remoteFile, givenSftp = null, givenOpts = null) {
        invariant(this.connection, 'Not connected to server');
        invariant(typeof localFile === 'string' && localFile, 'localFile must be a string');
        invariant(typeof remoteFile === 'string' && remoteFile, 'remoteFile must be a string');
        invariant(!givenSftp || typeof givenSftp === 'object', 'sftp must be an object');
        invariant(!givenOpts || typeof givenOpts === 'object', 'opts must be an object');
        invariant(await Helpers.exists(localFile), `localFile does not exist at ${localFile}`);
        const that = this;
        const opts = givenOpts || {};
        const sftp = givenSftp || (await this.requestSFTP());

        function putFile(retry) {
            return new Promise(function (resolve, reject) {
                sftp.fastPut(localFile, remoteFile, opts, Helpers.generateCallback(resolve, function (error) {
                    if (error.message === 'No such file' && retry) {
                        resolve(that.mkdir(Path.dirname(remoteFile), 'sftp', sftp).then(() => putFile(false)));
                    } else {
                        reject(error);
                    }
                }));
            });
        }

        try {
            await putFile(true);
        } finally {
            if (!givenSftp) {
                sftp.end();
            }
        }
    }

    async putFiles(files, givenConfig = {}) {
        invariant(this.connection, 'Not connected to server');
        invariant(Array.isArray(files), 'files must be an array');
        for (let i = 0, {length} = files; i < length; ++i) {
            const file = files[i];
            invariant(file, 'files items must be valid objects');
            invariant(file.local && typeof file.local === 'string', `files[${i}].local must be a string`);
            invariant(file.remote && typeof file.remote === 'string', `files[${i}].remote must be a string`);
        }
        const transferred = [];
        const config = Helpers.normalizePutFilesOptions(givenConfig);
        const sftp = config.sftp || (await this.requestSFTP());
        try {
            await pMap(files, async (file) => {
                await this.putFile(file.local, file.remote, sftp, config.sftpOptions);
                transferred.push(file);
            });
        } catch (error) {
            error.transferred = transferred;
            throw error;
        } finally {
            if (!sftp) {
                sftp.end();
            }
        }
    }

    async putDirectory(localDirectory, remoteDirectory, givenConfig = {}) {
        invariant(this.connection, 'Not connected to server');
        invariant(typeof localDirectory === 'string' && localDirectory, 'localDirectory must be a string');
        invariant(typeof remoteDirectory === 'string' && remoteDirectory, 'remoteDirectory must be a string');
        invariant(await Helpers.exists(localDirectory), `localDirectory does not exist at ${localDirectory}`);
        invariant((await Helpers.stat(localDirectory)).isDirectory(), `localDirectory is not a directory at ${localDirectory}`);
        invariant(typeof givenConfig === 'object' && givenConfig, 'config must be an object');
        const config = Helpers.normalizePutDirectoryOptions(givenConfig);
        const sftp = config.sftp || (await this.requestSFTP());
        const scanned = await scanDirectory(localDirectory, config.recursive, config.validate);
        const files = scanned.files.map(i => Path.relative(localDirectory, i));
        const directories = scanned.directories.map(i => Path.relative(localDirectory, i));
        let failed = false;
        let directoriesQueue = Promise.resolve();
        const directoriesCreated = new Set();
        const createDirectory = async (path) => {
            if (!directoriesCreated.has(path)) {
                directoriesCreated.add(path);
                directoriesQueue = directoriesQueue.then(() => this.mkdir(path, 'sftp', sftp));
                await directoriesQueue;
            }
        };
        try {
            await pMap(files, async (file) => {
                const localFile = Path.join(localDirectory, file);
                const remoteFile = Path.join(remoteDirectory, file)
                    .split(Path.sep)
                    .join('/');
                const remoteFileDirectory = Path.dirname(remoteFile);
                await createDirectory(remoteFileDirectory);
                try {
                    await this.putFile(localFile, remoteFile, sftp, config.sftpOptions);
                    config.tick(localFile, remoteFile, null);
                } catch (_) {
                    failed = true;
                    config.tick(localFile, remoteFile, _);
                }
            }, {concurrency: config.concurrency});
            await pMap(directories, async function (entry) {
                const remoteEntry = Path.join(remoteDirectory, entry)
                    .split(Path.sep)
                    .join('/');
                await createDirectory(remoteEntry);
            }, {concurrency: config.concurrency});
        } finally {
            if (!config.sftp) {
                sftp.end();
            }
        }
        return !failed;
    }

    dispose() {
        if (this.connection) {
            this.connection.end();
        }
    }
}

module.exports = SSH;
