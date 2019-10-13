'use strict';
let Application = require('forge-cli');

Application.register(__dirname, [
    './src/Commands'
])

let args = Object.assign({}, {args: process.argv});
// This "starts" the application
Application.start(args);
