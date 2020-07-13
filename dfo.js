var configuration = require('./configuration.json');

global.voidEthereumAddress = global.voidEthereumAddress || '0x0000000000000000000000000000000000000000';

function getNetworkElement(element, networkId) {
    var network = configuration.ethereumNetwork[(networkId + '').split('0x').join('')];
    if (network === undefined || network === null) {
        return;
    }
    return configuration[element + network];
};

function newContract(blockchainProvider, abi, address) {
    global.contracts = global.contracts || {};
    var key = blockchainProvider.sha3(JSON.stringify(abi)).toLowerCase();
    var contracts = (global.contracts[key] = global.contracts[key] || {});
    address = address || global.voidEthereumAddress;
    key = address.toLowerCase();
    contracts[key] = contracts[key] || blockchainProvider.newContract(abi, address === global.voidEthereumAddress ? undefined : address);
    return contracts[key];
}

function attachProxy(blockchainProvider, address, dfo) {
    return dfo.proxy = new Promise(async function(ok) {
        address = address || getNetworkElement('dfoHubAddress', await blockchainProvider.getNetworkId());
        dfo.address = address;
        dfo.originalAddress = address;
        loadProxy(blockchainProvider, address).then(proxy => (dfo.address = proxy.options.address) && ok(proxy));
    });
}

function attachFunctionalitiesManager(blockchainProvider, dfo) {
    return dfo.functionalitiesManager = new Promise(async function(ok) {
        var proxy = await dfo.proxy;
        return ok(newContract(blockchainProvider, configuration.functionalitiesManagerAbi, proxy.options.delegatesAddresses ? proxy.options.delegatesAddresses[4] : await blockchainProvider.callContract(proxy, "getMVDFunctionalitiesManagerAddress")));
    });
}

async function loadProxy(blockchainProvider, address, allAddresses) {
    allAddresses = allAddresses || [];
    allAddresses.push(address);
    var proxy = newContract(blockchainProvider, configuration.proxyAbi, address);
    proxy.options = proxy.options || { address };
    proxy.options.votingTokenAddress = global.voidEthereumAddress;

    try {
        proxy.options.delegatesAddresses = await blockchainProvider.simpleCall(proxy, 'getDelegates');
        try {
            proxy.options.delegatesAddresses = blockchainProvider.decodeAbi("address[]", proxy.options.delegatesAddresses);
        } catch(e) {
            proxy.options.delegatesAddresses = blockchainProvider.decodeAbi(["address","address","address","address","address","address"], proxy.options.delegatesAddresses);
        }
        proxy.options.votingTokenAddress = proxy.options.delegatesAddresses[0];
    } catch(e) {
    }

    if(proxy.options.votingTokenAddress === global.voidEthereumAddress) {
        try {
            proxy.options.votingTokenAddress = await blockchainProvider.callContract(proxy, 'getToken');
        } catch (e) {
        }
    }
    if(proxy.options.votingTokenAddress === global.voidEthereumAddress) {
        var logs = await blockchainProvider.getPastLogs({
            address,
            topics: [
                global.proxyChangedTopic = global.proxyChangedTopic || blockchainProvider.sha3('ProxyChanged(address)')
            ],
            fromBlock: '0'
        });
        return await loadProxy(blockchainProvider, blockchainProvider.decodeAbi('address', logs[0].topics[1]), allAddresses);
    }
    proxy.options.originalAddress = allAddresses[0];
    proxy.options.allAddresses = allAddresses;
    return proxy;
}

function attachVotingToken(blockchainProvider, dfo) {
    return dfo.votingToken = new Promise(async function(ok) {
        var votingToken = newContract(blockchainProvider, configuration.votingTokenAbi, (await dfo.proxy).options.votingTokenAddress);
        ok(votingToken);
        dfo.name = await blockchainProvider.callContract(votingToken, 'name');
        dfo.symbol = await blockchainProvider.callContract(votingToken, 'symbol');
        dfo.totalSupply = await blockchainProvider.callContract(votingToken, 'totalSupply');
        dfo.decimals = await blockchainProvider.callContract(votingToken, 'decimals');
    });
}

function attachStateHolder(blockchainProvider, dfo) {
    dfo.stateHolder = dfo.proxy.then(async proxy => proxy.options.delegatesAddresses ? proxy.options.delegatesAddresses[2] : await blockchainProvider.callContract(proxy, 'getStateHolderAddress')).then(stateHolderAddress => newContract(blockchainProvider, configuration.stateHolderAbi, stateHolderAddress));
    dfo.getState = dfo.getState || async function() {
        var json = await blockchainProvider.callContract(await dfo.stateHolder, 'toJSON');
        json = JSON.parse(json.endsWith(',]') ? (json.substring(0, json.lastIndexOf(',]')) + ']') : json);
        var state = {};
        for(var i in json) {
            var element = json[i];
            var methodName = 'get' + element.type.substring(0, 1).toUpperCase() + element.type.substring(1);
            state[element.name] = await blockchainProvider.callContract(await dfo.stateHolder, methodName, element.name);
        }
        return state;
    }
    configuration.stateHolderAbi.forEach(it => {
        if(it.type !== 'function' || it.stateMutability !== 'view' || dfo[it.name] || it.name === 'getProxy' || it.name === 'toJSON') {
            return;
        }
        dfo[it.name] = function(name) {
            return dfo.stateHolder.then(stateHolder => blockchainProvider.callContract(stateHolder, it.name, name));
        }
    })
    return dfo.stateHolder;
}

function attachFunctionalities(blockchainProvider, dfo, lightweight) {
    dfo.refreshFunctionalities = dfo.refreshFunctionalities || function() {
        return attachFunctionalities(blockchainProvider, dfo);
    };
    if(lightweight) {
        dfo.functionalities && dfo.functionalities.then(functionalities => Object.keys(functionalities).forEach(functionality => delete dfo[functionality]));
        return delete dfo.functionalities;
    }
    var onFunctionality = function(dfo, key) {
        if(dfo[key]) {
            return;
        }
        dfo[key] = async function() {
            var functionality = (await dfo.functionalities)[key];
            var argument = '0x';
            var value = undefined;
            if(functionality.realInputParameters && functionality.realInputParameters.length > 0) {
                var args = [];
                for(var i in arguments) {
                    args.push(arguments[i]);
                }
                if(args.length > functionality.inputParameters.length) {
                    value = args.shift();
                }
                functionality.needsSender && functionality.submitable && args.unshift(0);
                functionality.needsSender && args.unshift(global.voidEthereumAddress);

                argument = blockchainProvider.encodeAbi(functionality.realInputParameters, args);
            }
            var methodName = functionality.submitable ? 'submit' : 'read';
            var result = await blockchainProvider.callContract(value, await dfo.proxy, methodName, functionality.codeName, argument);
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
    }
    setTimeout(async function() {
        try {
            JSON.parse(await blockchainProvider.callContract(await dfo.functionalitiesManager, 'functionalityNames')).forEach(key => onFunctionality(dfo, key));
        } catch(e) {
        }
    });
    return dfo.functionalities = new Promise(async function(ok) {
        dfo.functionalities && Object.keys(await dfo.functionalities).forEach(functionality => delete dfo[functionality]);
        var globalFunctionalities = {};
        var loop = async function(i, plus) {
            var functionalities = {};
            try {
                functionalities = parseFunctionalities(await blockchainProvider.callContract(await dfo.functionalitiesManager, 'functionalitiesToJSON', i, plus));
            } catch(e) {
            }
            var keys = Object.keys(functionalities);
            if(keys.length === 0) {
                return ok(globalFunctionalities);
            }
            keys.forEach(key => {
                globalFunctionalities[key] = functionalities[key];
                var functionality = globalFunctionalities[key];
                functionality.realInputParameters = [];
                functionality.inputParameters = [];
                try {
                    functionality.realInputParameters = functionality.methodSignature.split(functionality.methodSignature.substring(0, functionality.methodSignature.indexOf('(') + 1)).join('').split(')').join('');
                    functionality.realInputParameters = functionality.realInputParameters ? functionality.realInputParameters.split(',') : [];
                    functionality.inputParameters = JSON.parse(JSON.stringify(functionality.realInputParameters));
                    functionality.needsSender && functionality.inputParameters.shift();
                    functionality.needsSender && functionality.submitable && functionality.inputParameters.shift();
                } catch (e) {}
                if(functionality.isInternal) {
                    return;
                }
                onFunctionality(dfo, key);
            });
            loop(i + plus, plus);
        };
        loop(0, 30);
    });
}

function parseFunctionalities(functionalitiesJSON) {
    try {
        var functionalities = {};
        JSON.parse((functionalitiesJSON.endsWith(',]') ? (functionalitiesJSON.substring(0, functionalitiesJSON.lastIndexOf(',]')) + ']') : functionalitiesJSON).trim()).forEach(it => functionalities[it.codeName] = it);
        return functionalities;
    } catch (e) {
    }
    return null;
}

async function attachWellKnownData(blockchainProvider, dfo) {
    dfo.refreshWellKnownData = dfo.refreshWellKnownData || function() {
        return attachFunctionalities(blockchainProvider, dfo) && attachWellKnownData(blockchainProvider, dfo);
    }
    if(!dfo.functionalities) {
        return;
    }
    await dfo.functionalities;
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
        dfo.index = await dfo.getIndex();
    } catch(e) {
        delete dfo.index;
    }
    try {
        dfo.link = await dfo.getLink();
    } catch(e) {
        delete dfo.link;
    }
    try {
        dfo.subdomain = await blockchainProvider.callContract(newContract(blockchainProvider, configuration.ENSAbi, configuration.ensAddress), 'subdomain', dfo.originalAddress);
        dfo.ens = 'https://' + dfo.subdomain + '.dfohub.eth';
    } catch(e) {
        delete dfo.subdomain;
        delete dfo.ens;
    }
}

function attachGetPastLogs(blockchainProvider, dfo) {
    dfo.getPastLogs = dfo.getPastLogs || async function getPastLogs(args) {
        global.dfoEvent = global.dfoEvent || blockchainProvider.sha3('Event(string,bytes32,bytes32,bytes)');
        var logArgs = {
            address: (await dfo.proxy).options.allAddresses,
            topics: [
                global.dfoEvent
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

function deepCopy(data, extension) {
    data = data ? JSON.parse(JSON.stringify(data)) : {};
    extension = extension ? JSON.parse(JSON.stringify(extension)) : {};
    var keys = Object.keys(extension);
    for(var i in keys) {
        var key = keys[i];
        if(!data[key]) {
            data[key] = extension[key];
            continue;
        }
        try {
            if(Object.keys(data[key]).length > 0 && Object.keys(extension[key]).length > 0) {
                data[key] = deepCopy(data[key], extension[key]);
                continue;
            }
        } catch(e) {
        }
        data[key] = extension[key];
    }
    return data;
}

module.exports = function DFO(blockchainProvider, address, options, dfo) {
    dfo = dfo || {
        refresh(newOptions) {
            return module.exports(blockchainProvider, address, deepCopy(options, newOptions), dfo).asPromise;
        }
    };
    dfo.asPromise = Promise.all([
        attachProxy(blockchainProvider, address, dfo),
        attachFunctionalitiesManager(blockchainProvider, dfo),
        attachFunctionalities(blockchainProvider, dfo, options && options.lightweight),
        attachVotingToken(blockchainProvider, dfo),
        attachWellKnownData(blockchainProvider, dfo),
        attachStateHolder(blockchainProvider, dfo),
        attachGetPastLogs(blockchainProvider, dfo)
    ]).then(() => dfo);

    return dfo;
};