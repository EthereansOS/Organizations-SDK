# DFOHub Software Development Kit (BETA)

## Nodejs & NPM Apis to easily interact with DFOHub Ecosystem

### Totally Provider-Agnostic: no matter what will be your Ethereum Blockchain Provider Engine

#### Actually supported engines
[X] Web3

[ ] Ethers.js

## How to use

#### Before to start

##### In your NodeJS application

`npm install web3`

`npm install dfo-hub`

```javascript
const Web3 = require('web3');
const DFOHub = require('dfo-hub');

const web3 = new Web3('<your favorite node url goes here>');
```
##### In your Web application

```html
<script type="text/javascript" src="https://raw.githubusercontent.com/b-u-i-d-l/dfo-hub-sdk/master/dist/dfo-hub.js"></script>
```

#### In both environments

```javascript
async function main() {
    var myDFO = await DFOHub.load({
        engine: web3,
        address: '<Your DFO Address goes here. If undefined, DFOHub address will be used>'
    });

    console.log(myDFO.name + ' DFO Successfully loaded!');
    console.log('ENS is: ' + myDFO.ens);
    console.log('Every survey of this DFO will last ' + await myDFO.getMinimumBlockNumberForSurvey() + ' blocks');
};

main().catch(console.error);
```