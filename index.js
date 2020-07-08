var BlockchainProvider = require('./blockchainProvider');
var DFO = require('./dfo');

module.exports = global.DFOHub = function DFOHub(engine) {

    var blockchainProvider = BlockchainProvider(engine);
    var dfoHub = DFO(blockchainProvider);
    blockchainProvider.attach(dfoHub);
    delete blockchainProvider.attach;

    dfoHub.refresh = function refresh(options) {
        var oldLigthweight = options && options.lightweight;
        options && options.lightweight && delete options.lightweight;
        dfoHub = DFO(blockchainProvider, undefined, options, dfoHub);
        oldLigthweight !== undefined && oldLigthweight !== null && (options.lightweight = oldLigthweight);
        return dfoHub.asPromise;
    };

    dfoHub.load = async function load(address, options) {
        /*if((await dfoHub.getPastLogs({event: 'DFODeployed(address_indexed,address)', topics: [blockchainProvider.sha3(address)]})).length === 0) {
            var found = false;
            for(var log of await dfoHub.getPastLogs({event: 'DFODeployed(address_indexed,address)'})) {
                if(log.data[0].toLowerCase() === address.toLowerCase()) {
                    found = true;
                    break;
                }
            }
            if(!found) {
                throw 'Given address is not created by dfoHub';
            }
        }*/
        return await DFO(blockchainProvider, address, options).asPromise;
    };

    return dfoHub;
};