# Deploy.
This 

# Installation
```bash
npm i -g @metabit/deploy
```

# Useage
```bash
deploy start
```
or if you're on version > 0.1.0
```bash
deploy step deploy:cleanup
```

# Configuration
When running `deploy start` for the first time we create a `.deploy.js` file by default. In that file we export a variable called `hosts`, and one called `scripts`.
```typescript
type host = {
    name: string;
    ip: string;
    identityFile: string;
    user: string;
}
```
 and 
 ```typescript
type script = {
    name: string;
    file: string;
}
```

for each script denoted, it will be ran on each server once. Scripts will be ran on servers in order.

### Scripts
Scripts are located in a `.scripts` directory in your current working directory. Scripts are expected to be bash scripts and are not fed any extra parameters by default.

Scripts cannot be ran in parallel, and is not planned to be a supported feature.

### Hosts
Hosts are expected to be your own. Don't use this tool to do things on other peoples hosts... That's not nice.

Logging into a host with a password will not be supported by this package.

The ip address field for hosts can be either ip addresses or domain names.

Host users can be any valid user with access to a TTY session. 