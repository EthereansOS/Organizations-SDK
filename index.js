var configuration = require('./configuration.json');

var BlockchainProvider = require('./blockchainProvider');

var globalScope = typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {};

globalScope.voidEthereumAddress = globalScope.voidEthereumAddress || '0x0000000000000000000000000000000000000000';

function getNetworkElement(element, networkId) {
    var network = configuration.ethereumNetwork[networkId];
    if (network === undefined || network === null) {
        return;
    }
    return configuration[element + network];
};

function newContract(blockchainProvider, abi, address) {
    globalScope.contracts = globalScope.contracts || {};
    var key = blockchainProvider.sha3(JSON.stringify(abi)).toLowerCase();
    var contracts = (globalScope.contracts[key] = globalScope.contracts[key] || {});
    address = address || globalScope.voidEthereumAddress;
    key = address.toLowerCase();
    contracts[key] = contracts[key] || blockchainProvider.newContract(abi, address === globalScope.voidEthereumAddress ? undefined : address);
    return contracts[key];
}

async function loadProxy(blockchainProvider, address, allAddresses) {
    allAddresses = allAddresses || [];
    allAddresses.push(address);
    var proxy = newContract(blockchainProvider, configuration.proxyAbi, address);
    try {
        await blockchainProvider.blockchainCall(proxy.methods.getToken);
    } catch (e) {
        var logs = await blockchainProvider.getPastLogs({
            address,
            topics: [
                globalScope.proxyChangedTopic = globalScope.proxyChangedTopic || blockchainProvider.sha3('ProxyChanged(address)')
            ],
            fromBlock: '0'
        });
        return await loadProxy(blockchainProvider, blockchainProvider.decodeAbi('address', logs[0].topics[1]), allAddresses);
    }
    proxy.options = proxy.options || { address };
    proxy.options.originalAddress = allAddresses[0];
    proxy.options.allAddresses = allAddresses;
    return proxy;
}

async function loadVotingToken(blockchainProvider, dfo) {
    dfo.votingToken = newContract(blockchainProvider, configuration.votingTokenAbi, await blockchainProvider.blockchainCall(dfo.proxy.methods.getToken));
    dfo.name = await blockchainProvider.blockchainCall(dfo.votingToken.methods.name);
    dfo.symbol = await blockchainProvider.blockchainCall(dfo.votingToken.methods.symbol);
    dfo.totalSupply = await blockchainProvider.blockchainCall(dfo.votingToken.methods.totalSupply);
    dfo.decimals = await blockchainProvider.blockchainCall(dfo.votingToken.methods.decimals);
}

async function loadStateHolder(blockchainProvider, dfo) {
    dfo.stateHolder = newContract(blockchainProvider, configuration.stateHolderAbi, await blockchainProvider.blockchainCall(dfo.proxy.methods.getStateHolderAddress));
    dfo.getState = dfo.getState || async function() {
        var json = JSON.parse(await blockchainProvider.blockchainCall(dfo.stateHolder.methods.toJSON));
        var state = {};
        for(var i in json) {
            var element = json[i];
            var methodName = 'get' + element.type.substring(0, 1).toUpperCase() + element.type.substring(1);
            state[element.name] = await blockchainProvider.blockchainCall(dfo.stateHolder.methods[methodName], element.name);
        }
        return state;
    }
}

async function loadFunctionalities(blockchainProvider, dfo) {
    dfo.functionalities && Object.keys(dfo.functionalities).forEach(functionality => delete dfo[functionality]);
    dfo.functionalities = parseFunctionalities(await blockchainProvider.blockchainCall(dfo.proxy.methods.functionalitiesToJSON));
    Object.keys(dfo.functionalities).forEach(key => {
        var functionality = dfo.functionalities[key];
        functionality.inputParameters = [];
        try {
            functionality.inputParameters = functionality.methodSignature.split(functionality.methodSignature.substring(0, functionality.methodSignature.indexOf('(') + 1)).join('').split(')').join('');
            functionality.inputParameters = functionality.inputParameters ? functionality.inputParameters.split(',') : [];
        } catch (e) {}
        if(functionality.isInternal) {
            return;
        }
        dfo[key] = async function() {
            var argument = '0x';
            if(functionality.inputParameters && functionality.inputParameters.length > 0) {
                var args = [];
                functionality.needsSender && args.push(globalScope.voidEthereumAddress);
                functionality.needsSender && functionality.isSubmitable && args.push(0);
                for(var i in arguments) {
                    args.push(arguments[i]);
                }
                argument = blockchainProvider.encodeAbi(functionality.inputParameters, args);
            }
            var methodName = functionality.isSubmitable ? 'submit' : 'read';
            var result = await blockchainProvider.blockchainCall(dfo.proxy.methods[methodName], functionality.codeName, argument);
            try {
                result = blockchainProvider.decodeAbi(functionality.returnAbiParametersArray, result);
            } catch(e) {
            }
            try {
                var resultArray = [];
                Object.keys(result).sort().forEach(key => !isNaN(parseInt(key)) && resultArray.push(result[key]));
                result = resultArray;
            } catch(e) {
            }
            try {
                result instanceof Array && result.length === 1 && (result = result[0]);
            } catch(e) {
            }
            return result;
        };
    });
    dfo.refreshFunctionalities = dfo.refreshFunctionalities || function() {
        return loadFunctionalities(blockchainProvider, dfo);
    };
    return dfo;
}

function parseFunctionalities(functionalitiesJSON) {
    try {
        functionalitiesJSON = functionalitiesJSON.trim();
        var functs = JSON.parse(!functionalitiesJSON.endsWith(',') ? functionalitiesJSON : functionalitiesJSON.substring(0, functionalitiesJSON.length - 1) + ']');
        var functionalities = {};
        functs.forEach(it => functionalities[it.codeName] = it);
        return functionalities;
    } catch (e) {
    }
    return null;
}

async function refreshWellKnownData(blockchainProvider, dfo) {

    dfo.minimumBlockNumberForSurvey = await dfo.getMinimumBlockNumberForSurvey();
    dfo.minimumBlockNumberForEmergencySurvey = await dfo.getMinimumBlockNumberForEmergencySurvey();
    dfo.emergencySurveyStaking = await dfo.getEmergencySurveyStaking();

    try {
        dfo.quorum = await dfo.getQuorum();
    } catch(e) {
        dfo.quorum = "0";
    }
    try {
        dfo.surveySingleReward = await dfo.getSurveySingleReward();
    } catch(e) {
        dfo.surveySingleReward = "0";
    }
    try {
        dfo.minimumStaking = await dfo.getMinimumStaking();
    } catch(e) {
        dfo.minimumStaking = "0";
    }
    try {
        dfo.link = await dfo.getLink();
    } catch(e) {
        delete dfo.link;
    }
    try {
        dfo.index = await dfo.getIndex();
    } catch(e) {
        delete dfo.index;
    }
    try {
        dfo.subdomain = await blockchainProvider.blockchainCall(newContract(blockchainProvider, configuration.ENSAbi, configuration.ensAddress).methods.subdomain, dfo.originalAddress);
        dfo.ens = 'https://' + subdomain + '.dfohub.eth';
    } catch(e) {
        delete dfo.subdomain;
        delete dfo.ens;
    }
}

function attachGetLogs(blockchainProvider, dfo) {
    dfo.getPastLogs = dfo.getPastLogs || async function getPastLogs(args) {
        globalScope.dfoEvent = globalScope.dfoEvent || blockchainProvider.sha3('Event(string,bytes32,bytes32,bytes)');
        var logArgs = {
            address: dfo.proxy.options.allAddresses,
            topics: [
                globalScope.dfoEvent
            ],
            fromBlock: '0',
            toBlock: 'latest'
        };
        args.event && logArgs.topics.push(args.event.indexOf('0x') === 0 ? args.event : blockchainProvider.sha3(args.event));
        args.topics && logArgs.topics.push(...args.topics);
        args.fromBlock && (logArgs.fromBlock = args.fromBlock);
        args.toBlock && (logArgs.toBlock = args.toBlock);
        return formatDFOLogs(blockchainProvider, await blockchainProvider.getPastLogs(logArgs), args.event && args.event.indexOf('0x') === -1 ? args.event : undefined);
    };
}

function formatDFOLogs(blockchainProvider, logVar, event) {
    if (!logVar || (!this.isNaN(logVar.length) && logVar.length === 0)) {
        return logVar;
    }
    var logs = [];
    if (logVar.length) {
        logs.push(...logVar);
    } else {
        event = event || logVar.event;
        logs.push(logVar);
    }
    var deployArgs = [];
    if (event) {
        var rebuiltArgs = event.substring(event.indexOf('(') + 1);
        rebuiltArgs = JSON.parse('["' + rebuiltArgs.substring(0, rebuiltArgs.indexOf(')')).split(',').join('","') + '"]');
        for (var i in rebuiltArgs) {
            if (!rebuiltArgs[i].endsWith('_indexed')) {
                deployArgs.push(rebuiltArgs[i]);
            }
        }
    }
    for (var i in logs) {
        var log = logs[i];
        log.topics && log.topics.splice(0, 1);
        log.raw && log.raw.topics && log.raw.topics.splice(0, 1);
        try {
            log.data && (log.data = blockchainProvider.decodeAbi("bytes", log.data));
            log.raw && log.raw.data && (log.raw.data = blockchainProvider.decodeAbi("bytes", log.raw.data));
        } catch (e) {}
        if (deployArgs.length > 0 && (deployArgs.length > 1 || deployArgs[0] !== "")) {
            var data = blockchainProvider.decodeAbi(deployArgs, log.data || (log.raw && log.raw.data));
            log.data && (log.data = []);
            log.raw && log.raw.data && (log.raw.data = []);
            Object.keys(data).map(key => {
                if (isNaN(parseInt(key))) {
                    return;
                }
                log.data && log.data.push(data[key]);
                log.raw && log.raw.data && log.raw.data.push(data[key]);
            });
        }
    }
    return logVar.length ? logs : logVar;
}

globalScope.DFOHub = {
    async load(originalOptions) {
        var options = originalOptions || {};

        var blockchainProvider = options.blockchainProvider || BlockchainProvider.init(options.engine);

        options.address = options.address || getNetworkElement('dfoHubAddress', await blockchainProvider.getNetworkId());

        var dfo = {
            refresh() {
                return load(originalOptions).then(result => dfo = result);
            },
            originalAddress : options.address,
            proxy : await loadProxy(blockchainProvider, options.address)
        };
        dfo.address = dfo.proxy.options.address;
        await loadVotingToken(blockchainProvider, dfo);
        await loadStateHolder(blockchainProvider, dfo);
        await loadFunctionalities(blockchainProvider, dfo);
        await refreshWellKnownData(blockchainProvider, dfo);
        attachGetLogs(blockchainProvider, dfo);
        return dfo;
    }
};

module.exports = globalScope.DFOHub;