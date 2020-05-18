# DFOHub Software Development Kit (BETA)

## Nodejs & NPM Apis to easily interact with DFOHub Ecosystem

### Totally Provider-Agnostic: no matter what will be your Ethereum Blockchain Provider Engine

#### Actually supported engines
[X] Web3 ^1.0.0

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
And load your web3 connection object from your favorite provider (e.g. Metamask).

#### In both environments

```javascript
async function main() {
    DFOHub(web3);

    //DFOHub is now fully loaded in your Blockchain Provider object
    var myDFO = await web3.eth.dfoHub.load('<Your DFO Address goes here>');

    console.log(myDFO.name + ' DFO Successfully loaded!');
    console.log('ENS is: ' + myDFO.ens);
    console.log('Every survey of this DFO will last ' + await myDFO.getMinimumBlockNumberForSurvey() + ' blocks');
};

main().catch(console.error);
```