if (process.env.BUGSNAG_KEY) {
    const bugsnag = require('@bugsnag/js')
    global.bugsnag = bugsnag(process.env.BUGSNAG_KEY)
}
let Application = require('forge-cli');

Application.register(__dirname, [
    './src/Commands'
])

let args = Object.assign({}, {args: process.argv});
// This "starts" the application
Application.start(args);
