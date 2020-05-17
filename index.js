var BlockchainProvider = require('./blockchainProvider');
var dfo = require('./dfo');

var defaultReadCalls = {
    'getMinimumBlockNumberForSurvey': 'uint256',
    'getMinimumBlockNumberForEmergencySurvey': 'uint256',
    'getEmergencySurveyStaking': 'uint256',
    'getSurveySingleReward': 'uint256',
    'getQuorum': 'uint256',
    'getMinimumStaking': 'uint256',
    'getIndex': 'uint256',
    'getLink': 'string',
};

module.exports = global.DFOHub = {
    init(engine) {
        var blockchainProvider = BlockchainProvider(engine);

        var initialCall = async function initialCall(name, type) {
            return blockchainProvider.decodeAbi(type, await blockchainProvider.callContract(dfoHub.proxy, 'read', name, '0x'));
        };

        var dfoHub = {
            name : 'DFOHub',
            symbol : 'BUIDL',
            totalSupply : '42000000000000000000000000',
            decimals : '18'
        };
        Object.entries(defaultReadCalls).forEach(entry => dfoHub[entry[0]] = function() {
            return initialCall(entry[0], entry[1]);
        });
        dfoHub = dfo.init(blockchainProvider, undefined, undefined, dfoHub);
        delete dfoHub.collateralLoad;
        blockchainProvider.attach(dfoHub);
        delete blockchainProvider.attach;

        dfoHub.load = async function load(address, options) {
            options = options || {};
            options.loadAll = true;
            var dfoDeployedLogs = await dfoHub.getPastLogs({event: 'DFODeployed(address_indexed,address)', topics: [options.address]});
            if(dfoDeployedLogs.length === 0) {
                throw 'Given address is not created by dfoHub';
            }
            var loadedDFO = await dfo.init(blockchainProvider, address, options).collateralLoad;
            delete options.loadAll;
            return loadedDFO;
        };

        return dfoHub;
    }
};