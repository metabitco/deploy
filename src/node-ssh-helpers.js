// @flow
const FS = require('fs');
const Path = require('path');
const { promisify } = require('sb-promisify');
const CODE_REGEXP = /Error: (E[\S]+): /;
const DEFAULT_CONCURRENCY = 5;
const readFile = promisify(FS.readFile);

const stat = promisify(FS.stat);
const readdir = promisify(FS.readdir);

function transformError(givenError) {
    const code = CODE_REGEXP.exec(givenError);
    if (code) {
        // eslint-disable-next-line no-param-reassign,prefer-destructuring
        givenError.code = code[1];
    }
    return givenError;
}
function exists(filePath) {
    return new Promise(function (resolve) {
        FS.access(filePath, FS.R_OK, function (error) {
            resolve(!error);
        });
    });
}
async function mkdirSftp(path, sftp) {
    let stats;
    try {
        stats = await promisify(sftp.stat).call(sftp, path);
    }
    catch (_) {
        /* No Op */
    }
    if (stats) {
        if (stats.isDirectory()) {
            // Already exists, nothing to worry about
            return;
        }
        throw new Error('mkdir() failed, target already exists and is not a directory');
    }
    try {
        await promisify(sftp.mkdir).call(sftp, path);
    }
    catch (error) {
        throw transformError(error);
    }
}
async function normalizeConfig(givenConfig) {
    const config = Object.assign({}, givenConfig);
    if (config.username && typeof config.username !== 'string') {
        throw new Error('config.username must be a valid string');
    }
    if (typeof config.host !== 'undefined') {
        if (typeof config.host !== 'string' || !config.host) {
            throw new Error('config.host must be a valid string');
        }
    }
    else if (typeof config.sock !== 'undefined') {
        if (!config.sock || typeof config.sock !== 'object') {
            throw new Error('config.sock must be a valid object');
        }
    }
    else {
        throw new Error('config.host or config.sock must be provided');
    }
    if (config.privateKey) {
        const { privateKey } = config;
        if (typeof privateKey !== 'string') {
            throw new Error('config.privateKey must be a string');
        }
        if (!(privateKey.includes('BEGIN') && privateKey.includes('KEY'))) {
            try {
                config.privateKey = await readFile(privateKey, 'utf8');
            }
            catch (error) {
                if (error.code === 'ENOENT') {
                    throw new Error(`config.privateKey does not exist at ${privateKey}`);
                }
                throw error;
            }
        }
    }
    else if (config.password) {
        const { password } = config;
        if (typeof password !== 'string') {
            throw new Error('config.password must be a string');
        }
    }
    config.tryKeyboard = !!config.tryKeyboard;
    if (config.tryKeyboard === true) {
        if (typeof config.onKeyboardInteractive !== 'function') {
            config.onKeyboardInteractive = (name, instructions, instructionsLang, prompts, finish) => {
                if (prompts.length > 0 && prompts[0].prompt.toLowerCase().includes('password')) {
                    finish([config.password]);
                }
            };
        }
    }
    else {
        config.onKeyboardInteractive = null;
    }
    return config;
}
function normalizePutFilesOptions(givenConfig) {
    const config = {};
    if (givenConfig.sftpOptions && typeof givenConfig.sftpOptions === 'object') {
        config.sftpOptions = givenConfig.sftpOptions;
    }
    else
        config.sftpOptions = {};
    if (typeof givenConfig.concurrency === 'number') {
        config.concurrency = givenConfig.concurrency;
    }
    else
        config.concurrency = DEFAULT_CONCURRENCY;
    if (typeof givenConfig.sftp === 'object') {
        config.sftp = givenConfig.sftp;
    }
    else
        config.sftp = null;
    return config;
}
function normalizePutDirectoryOptions(givenConfig) {
    const config = normalizePutFilesOptions(givenConfig);
    if (givenConfig.tick) {
        if (typeof givenConfig.tick !== 'function') {
            throw new Error('config.tick must be a function');
        }
        config.tick = givenConfig.tick;
    }
    else {
        config.tick = function () { };
    }
    if (givenConfig.validate) {
        if (typeof givenConfig.validate !== 'function') {
            throw new Error('config.validate must be a function');
        }
        config.validate = givenConfig.validate;
    }
    else {
        config.validate = function (path) {
            return Path.basename(path).substr(0, 1) !== '.';
        };
    }
    config.recursive = {}.hasOwnProperty.call(givenConfig, 'recursive') ? !!givenConfig.recursive : true;
    return config;
}
function generateCallback(resolve, reject) {
    return function (error, result) {
        if (error) {
            reject(error);
        }
        else {
            resolve(result);
        }
    };
}

module.exports = {
    stat,
    readdir,
    transformError,
    exists,
    mkdirSftp,
    normalizeConfig,
    normalizePutFilesOptions,
    normalizePutDirectoryOptions,
    generateCallback,
}