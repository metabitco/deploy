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
