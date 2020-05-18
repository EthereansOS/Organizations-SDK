(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
(function (global){
var configuration = require('./configuration.json');

module.exports = function Web3BlockchainProvider(engine) {
    var context = this;

    context.attach = function attach(dfoHub) {
        engine.eth.dfoHub = dfoHub;
    };

    context.getNetworkId = function getNetworkId() {
        return engine.eth.net.getId();
    };

    context.sha3 = function sha3(data) {
        return engine.utils.sha3(data);
    };

    context.newContract = function newContract(abi, address) {
        var contract = new engine.eth.Contract(abi, address);
        contract.transactionBlockTimeout = 999999999;
        contract.transactionPollingTimeout = new Date().getTime();
        return contract;
    };

    context.getPastLogs = function getPastLogs(params) {
        return engine.eth.getPastLogs(params);
    };

    context.encodeAbi = function encodeAbi(type, value) {
        return engine.eth.abi["encodeParameter" + ((typeof type).toLowerCase() === 'string' ? '' : 's')](type, value);
    };

    context.decodeAbi = function decodeAbi(type, value) {
        return engine.eth.abi["decodeParameter" + ((typeof type).toLowerCase() === 'string' ? '' : 's')](type, value);
    };

    context.callContract = function callContract(contract, methodName) {
        var args = [contract.methods[methodName]];
        for(var i = 2; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
        return blockchainCall.apply(context, args);
    }

    var blockchainCall = async function blockchainCall(call) {
        var args = [];
        if (arguments.length > 1) {
            for (var i = 1; i < arguments.length; i++) {
                args.push(arguments[i]);
            }
        }
        var method = (call.implementation ? call.get : call.new ? call.new : call).apply(call, args);
        return await (method._method.stateMutability === 'view' || method._method.stateMutability === 'pure' || method._method.constant ? method.call(await getSendingOptions()) : sendBlockchainTransaction(method));
    };

    var sendBlockchainTransaction = function sendBlockchainTransaction(transaction) {
        return new Promise(async function(ok, ko) {
            var handleTransactionError = function handleTransactionError(e) {
                e !== undefined && e !== null && (e.message || e).indexOf('not mined within') === -1 && ko(e);
            }
            try {
                (transaction = transaction.send ? transaction.send(await getSendingOptions(transaction), handleTransactionError) : transaction).on('transactionHash', transactionHash => {
                    var timeout = async function() {
                        var receipt = await engine.eth.getTransactionReceipt(transactionHash);
                        if (!receipt || !receipt.blockNumber || parseInt(await engine.eth.getBlockNumber()) < (parseInt(receipt.blockNumber) + (configuration.transactionConfirmations || 0))) {
                            return global.setTimeout(timeout, configuration.transactionConfirmationsTimeoutMillis);
                        }
                        return transaction.then(ok);
                    };
                    global.setTimeout(timeout);
                }).catch(handleTransactionError);
            } catch (e) {
                return handleTransactionError(e);
            }
        });
    };

    var getAddress = async function getAddress() {
        global.ethereum && global.ethereum.enable && await global.ethereum.enable();
        return (context.walletAddress = (await engine.eth.getAccounts())[0]);
    };

    var getSendingOptions = function getSendingOptions(transaction) {
        return new Promise(async function(ok, ko) {
            if (transaction) {
                var address = await getAddress();
                return transaction.estimateGas({
                        from: address,
                        gasPrice: engine.utils.toWei("13", "gwei")
                    },
                    function(error, gas) {
                        if (error) {
                            return ko(error.message || error);
                        }
                        return ok({
                            from: address,
                            gas: gas || configuration.gasLimit || '7900000'
                        });
                    });
            }
            return ok({
                from: context.walletAddress || null,
                gas: configuration.gasLimit || '7900000'
            });
        });
    };
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./configuration.json":3}],2:[function(require,module,exports){
module.exports = function BlockchainProvider(engine) {
    var name = engine.__proto__.constructor.name.toLowerCase();
    var Provider;
    if (name.indexOf('web3') !== -1) {
        Provider = require('./blockchain.provider.web3');
    }
    return new Provider(engine);
};
},{"./blockchain.provider.web3":1}],3:[function(require,module,exports){
module.exports={
    "ethereumNetwork": {
        "1": "",
        "3": "Ropsten"
    },
    "defaultOcelotTokenAddress": "0x9784b427ecb5275c9300ea34adef57923ab170af",
    "defaultOcelotTokenAddressRopsten": "0x6ae6cf934b2bd8c84d932aee75102ca2ef1bf2ce",
    "singleTokenLength" : 23000,
    "dfoHubAddress": "0xc3BE549499f1e504c793a6c89371Bd7A98229500",
    "dfoHubAddressRopsten": "0x9c0D25Df7cdB6A1D346047E745520F61E94c971F",
    "ensAddress": "0x00000000000C2E074eC69A0dFb2997BA6C7d2e1e",
    "deploySearchStart": 9779603,
    "deploySearchStartRopsten": 7465062,
    "transactionConfirmations": 0,
    "transactionConfirmationsTimeoutMillis": 7000,
    "OcelotAbi": [{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"finalize","outputs":[],"stateMutability":"nonpayable","type":"function"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"chainSize","type":"uint256"}],"name":"Finalized","type":"event"},{"inputs":[{"internalType":"bytes","name":"payload","type":"bytes"}],"name":"mint","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"bytes","name":"payload","type":"bytes"}],"name":"mint","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"bytes","name":"payload","type":"bytes"}],"name":"mintAndFinalize","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes","name":"payload","type":"bytes"}],"name":"mintAndFinalize","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"uint256","name":"tokenId","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"chunkPosition","type":"uint256"},{"indexed":false,"internalType":"uint256","name":"chunkSize","type":"uint256"}],"name":"Minted","type":"event"},{"stateMutability":"payable","type":"receive"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"},{"internalType":"uint256","name":"position","type":"uint256"}],"name":"content","outputs":[{"internalType":"bytes","name":"","type":"bytes"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"tokenId","type":"uint256"}],"name":"metadata","outputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"}],
    "propsalAbi": [{"inputs":[{"internalType":"string","name":"codeName","type":"string"},{"internalType":"address","name":"location","type":"address"},{"internalType":"string","name":"methodSignature","type":"string"},{"internalType":"string","name":"returnAbiParametersArray","type":"string"},{"internalType":"string","name":"replaces","type":"string"},{"internalType":"address","name":"proxy","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"voter","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Accept","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"voter","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"MoveToAccept","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"voter","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"MoveToRefuse","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"voter","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"Refuse","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"voter","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"RetireAccept","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"voter","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"RetireAll","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"voter","type":"address"},{"indexed":false,"internalType":"uint256","name":"amount","type":"uint256"}],"name":"RetireRefuse","type":"event"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"accept","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"a","type":"string"},{"internalType":"string","name":"b","type":"string"}],"name":"compareStrings","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"disable","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"m","type":"string"}],"name":"formatReturnAbiParametersArray","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"getCodeName","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"sourceLocation","type":"address"},{"internalType":"uint256","name":"sourceLocationId","type":"uint256"},{"internalType":"address","name":"location","type":"address"}],"name":"getFirstJSONPart","outputs":[{"internalType":"bytes","name":"","type":"bytes"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"getLocation","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getMethodSignature","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getProposer","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getProxy","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getReplaces","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getReturnAbiParametersArray","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getSourceLocation","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getSourceLocationId","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getSurveyDuration","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getSurveyEndBlock","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"addr","type":"address"}],"name":"getVote","outputs":[{"internalType":"uint256","name":"accept","type":"uint256"},{"internalType":"uint256","name":"refuse","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getVotes","outputs":[{"internalType":"uint256","name":"","type":"uint256"},{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"codeName","type":"string"},{"internalType":"address","name":"location","type":"address"},{"internalType":"string","name":"methodSignature","type":"string"},{"internalType":"string","name":"returnAbiParametersArray","type":"string"},{"internalType":"string","name":"replaces","type":"string"},{"internalType":"address","name":"proxy","type":"address"}],"name":"init","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"isDisabled","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"isEmergency","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"isInternal","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"isSubmitable","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"isTerminated","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"moveToAccept","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"moveToRefuse","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"needsSender","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"refuse","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"retireAccept","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"retireAll","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"retireRefuse","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"set","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bool","name":"emergency","type":"bool"},{"internalType":"address","name":"sourceLocation","type":"address"},{"internalType":"uint256","name":"sourceLocationId","type":"uint256"},{"internalType":"bool","name":"submitable","type":"bool"},{"internalType":"bool","name":"isInternal","type":"bool"},{"internalType":"bool","name":"needsSender","type":"bool"},{"internalType":"address","name":"proposer","type":"address"}],"name":"setCollateralData","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"start","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"terminate","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes","name":"b","type":"bytes"}],"name":"toAddress","outputs":[{"internalType":"address","name":"addr","type":"address"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"toJSON","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"str","type":"string"}],"name":"toLowerCase","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"_addr","type":"address"}],"name":"toString","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"uint256","name":"_i","type":"uint256"}],"name":"toString","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"bytes","name":"bs","type":"bytes"}],"name":"toUint256","outputs":[{"internalType":"uint256","name":"x","type":"uint256"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"withdraw","outputs":[],"stateMutability":"nonpayable","type":"function"}],
    "votingTokenAbi": [{"inputs":[{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"symbol","type":"string"},{"internalType":"uint256","name":"decimals","type":"uint256"},{"internalType":"uint256","name":"totalSupply","type":"uint256"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"spender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"from","type":"address"},{"indexed":true,"internalType":"address","name":"to","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"Transfer","type":"event"},{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"spender","type":"address"}],"name":"allowance","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"approve","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"account","type":"address"}],"name":"balanceOf","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"burn","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"decimals","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"subtractedValue","type":"uint256"}],"name":"decreaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"getProxy","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"spender","type":"address"},{"internalType":"uint256","name":"addedValue","type":"uint256"}],"name":"increaseAllowance","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"name","type":"string"},{"internalType":"string","name":"symbol","type":"string"},{"internalType":"uint256","name":"decimals","type":"uint256"},{"internalType":"uint256","name":"totalSupply","type":"uint256"}],"name":"init","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"mint","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"name","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"setProxy","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"symbol","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"totalSupply","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transfer","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"sender","type":"address"},{"internalType":"address","name":"recipient","type":"address"},{"internalType":"uint256","name":"amount","type":"uint256"}],"name":"transferFrom","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"stateMutability":"payable","type":"receive"}],
    "stateHolderAbi": [{"inputs":[{"internalType":"string","name":"varName","type":"string"}],"name":"clear","outputs":[{"internalType":"string","name":"oldDataType","type":"string"},{"internalType":"bytes","name":"oldVal","type":"bytes"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"init","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"varName","type":"string"},{"internalType":"address","name":"val","type":"address"}],"name":"setAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"varName","type":"string"},{"internalType":"bool","name":"val","type":"bool"}],"name":"setBool","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"varName","type":"string"},{"internalType":"bytes","name":"val","type":"bytes"}],"name":"setBytes","outputs":[{"internalType":"bytes","name":"","type":"bytes"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"setProxy","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"varName","type":"string"},{"internalType":"string","name":"val","type":"string"}],"name":"setString","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"varName","type":"string"},{"internalType":"uint256","name":"val","type":"uint256"}],"name":"setUint256","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"stateMutability":"nonpayable","type":"constructor"},{"inputs":[{"internalType":"string","name":"a","type":"string"},{"internalType":"string","name":"b","type":"string"}],"name":"compareStrings","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"string","name":"varName","type":"string"}],"name":"exists","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"m","type":"string"}],"name":"formatReturnAbiParametersArray","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"string","name":"varName","type":"string"}],"name":"getAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"varName","type":"string"}],"name":"getBool","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"varName","type":"string"}],"name":"getBytes","outputs":[{"internalType":"bytes","name":"","type":"bytes"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"varName","type":"string"}],"name":"getDataType","outputs":[{"internalType":"string","name":"dataType","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"sourceLocation","type":"address"},{"internalType":"uint256","name":"sourceLocationId","type":"uint256"},{"internalType":"address","name":"location","type":"address"}],"name":"getFirstJSONPart","outputs":[{"internalType":"bytes","name":"","type":"bytes"}],"stateMutability":"pure","type":"function"},{"inputs":[],"name":"getProxy","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getStateSize","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"varName","type":"string"}],"name":"getString","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"varName","type":"string"}],"name":"getUint256","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes","name":"b","type":"bytes"}],"name":"toAddress","outputs":[{"internalType":"address","name":"addr","type":"address"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"uint256","name":"start","type":"uint256"},{"internalType":"uint256","name":"l","type":"uint256"}],"name":"toJSON","outputs":[{"internalType":"string","name":"json","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"toJSON","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"str","type":"string"}],"name":"toLowerCase","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"address","name":"_addr","type":"address"}],"name":"toString","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"uint256","name":"_i","type":"uint256"}],"name":"toString","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"pure","type":"function"},{"inputs":[{"internalType":"bytes","name":"bs","type":"bytes"}],"name":"toUint256","outputs":[{"internalType":"uint256","name":"x","type":"uint256"}],"stateMutability":"pure","type":"function"}],
    "proxyAbi": [{"inputs":[{"internalType":"address","name":"votingTokenAddress","type":"address"},{"internalType":"address","name":"stateHolderAddress","type":"address"},{"internalType":"address","name":"functionalityModelsManagerAddress","type":"address"},{"internalType":"address","name":"functionalityProposalManagerAddress","type":"address"},{"internalType":"address","name":"functionalitiesManagerAddress","type":"address"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"string","name":"key","type":"string"},{"indexed":true,"internalType":"bytes32","name":"firstIndex","type":"bytes32"},{"indexed":true,"internalType":"bytes32","name":"secondIndex","type":"bytes32"},{"indexed":false,"internalType":"bytes","name":"data","type":"bytes"}],"name":"Event","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"string","name":"codeName","type":"string"},{"indexed":false,"internalType":"uint256","name":"position","type":"uint256"},{"indexed":false,"internalType":"address","name":"proposal","type":"address"},{"indexed":true,"internalType":"string","name":"replaced","type":"string"},{"indexed":false,"internalType":"address","name":"replacedLocation","type":"address"},{"indexed":false,"internalType":"bool","name":"replacedWasSubmitable","type":"bool"},{"indexed":false,"internalType":"string","name":"replacedMethodSignature","type":"string"},{"indexed":false,"internalType":"bool","name":"replacedWasInternal","type":"bool"},{"indexed":false,"internalType":"bool","name":"replacedNeededSender","type":"bool"},{"indexed":false,"internalType":"address","name":"replacedProposal","type":"address"},{"indexed":false,"internalType":"uint256","name":"replacedPosition","type":"uint256"}],"name":"FunctionalitySet","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"oldAddress","type":"address"},{"indexed":true,"internalType":"address","name":"newAddress","type":"address"}],"name":"MVDFunctionalitiesManagerChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"oldAddress","type":"address"},{"indexed":true,"internalType":"address","name":"newAddress","type":"address"}],"name":"MVDFunctionalityModelsManagerChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"oldAddress","type":"address"},{"indexed":true,"internalType":"address","name":"newAddress","type":"address"}],"name":"MVDFunctionalityProposalManagerChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"sender","type":"address"},{"indexed":false,"internalType":"uint256","name":"value","type":"uint256"}],"name":"PaymentReceived","type":"event"},{"anonymous":false,"inputs":[{"indexed":false,"internalType":"address","name":"proposal","type":"address"}],"name":"Proposal","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"proposal","type":"address"},{"indexed":false,"internalType":"bool","name":"success","type":"bool"}],"name":"ProposalSet","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"newAddress","type":"address"}],"name":"ProxyChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"oldAddress","type":"address"},{"indexed":true,"internalType":"address","name":"newAddress","type":"address"}],"name":"StateHolderChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"address","name":"oldAddress","type":"address"},{"indexed":true,"internalType":"address","name":"newAddress","type":"address"}],"name":"TokenChanged","type":"event"},{"inputs":[{"internalType":"address","name":"location","type":"address"},{"internalType":"bytes","name":"payload","type":"bytes"}],"name":"callFromManager","outputs":[{"internalType":"bool","name":"","type":"bool"},{"internalType":"bytes","name":"","type":"bytes"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address payable","name":"newAddress","type":"address"}],"name":"changeProxy","outputs":[],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"proposalAddress","type":"address"}],"name":"disableProposal","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"eventSignature","type":"string"},{"internalType":"bytes","name":"firstIndex","type":"bytes"},{"internalType":"bytes","name":"secondIndex","type":"bytes"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"emitEvent","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"codeName","type":"string"},{"internalType":"uint256","name":"position","type":"uint256"},{"internalType":"address","name":"proposal","type":"address"},{"internalType":"string","name":"replaced","type":"string"},{"internalType":"address","name":"location","type":"address"},{"internalType":"bool","name":"submitable","type":"bool"},{"internalType":"string","name":"methodSignature","type":"string"},{"internalType":"bool","name":"isInternal","type":"bool"},{"internalType":"bool","name":"needsSender","type":"bool"},{"internalType":"address","name":"proposalAddress","type":"address"},{"internalType":"uint256","name":"replacedPosition","type":"uint256"}],"name":"emitFromManager","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"functionalitiesToJSON","outputs":[{"internalType":"string","name":"functionsJSONArray","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"uint256","name":"start","type":"uint256"},{"internalType":"uint256","name":"l","type":"uint256"}],"name":"functionalitiesToJSON","outputs":[{"internalType":"string","name":"functionsJSONArray","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getFunctionalitiesAmount","outputs":[{"internalType":"uint256","name":"","type":"uint256"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"codeName","type":"string"}],"name":"getFunctionalityAddress","outputs":[{"internalType":"address","name":"location","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getMVDFunctionalitiesManagerAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getMVDFunctionalityModelsManagerAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getMVDFunctionalityProposalManagerAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"codeName","type":"string"}],"name":"getPendingProposal","outputs":[{"internalType":"address","name":"proposalAddress","type":"address"},{"internalType":"bool","name":"isReallyPending","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getStateHolderAddress","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[],"name":"getToken","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"codeName","type":"string"}],"name":"hasFunctionality","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"votingTokenAddress","type":"address"},{"internalType":"address","name":"stateHolderAddress","type":"address"},{"internalType":"address","name":"functionalityModelsManagerAddress","type":"address"},{"internalType":"address","name":"functionalityProposalManagerAddress","type":"address"},{"internalType":"address","name":"functionalitiesManagerAddress","type":"address"}],"name":"init","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"functionality","type":"address"}],"name":"isAuthorizedFunctionality","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"functionality","type":"address"}],"name":"isValidFunctionality","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"proposal","type":"address"}],"name":"isValidProposal","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"string","name":"codeName","type":"string"},{"internalType":"bool","name":"emergency","type":"bool"},{"internalType":"address","name":"sourceLocation","type":"address"},{"internalType":"uint256","name":"sourceLocationId","type":"uint256"},{"internalType":"address","name":"location","type":"address"},{"internalType":"bool","name":"submitable","type":"bool"},{"internalType":"string","name":"methodSignature","type":"string"},{"internalType":"string","name":"returnAbiParametersArray","type":"string"},{"internalType":"bool","name":"isInternal","type":"bool"},{"internalType":"bool","name":"needsSender","type":"bool"},{"internalType":"string","name":"replaces","type":"string"}],"name":"newProposal","outputs":[{"internalType":"address","name":"proposalAddress","type":"address"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"codeName","type":"string"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"read","outputs":[{"internalType":"bytes","name":"returnData","type":"bytes"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"newAddress","type":"address"}],"name":"setMVDFunctionalitiesManagerAddress","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newAddress","type":"address"}],"name":"setMVDFunctionalityModelsManagerAddress","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newAddress","type":"address"}],"name":"setMVDFunctionalityProposalManagerAddress","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[],"name":"setProposal","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newAddress","type":"address"}],"name":"setStateHolderAddress","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"newAddress","type":"address"}],"name":"setToken","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"address","name":"proposalAddress","type":"address"}],"name":"startProposal","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"codeName","type":"string"},{"internalType":"bytes","name":"data","type":"bytes"}],"name":"submit","outputs":[{"internalType":"bytes","name":"returnData","type":"bytes"}],"stateMutability":"payable","type":"function"},{"inputs":[{"internalType":"address","name":"receiver","type":"address"},{"internalType":"uint256","name":"value","type":"uint256"},{"internalType":"address","name":"token","type":"address"}],"name":"transfer","outputs":[],"stateMutability":"nonpayable","type":"function"},{"stateMutability":"payable","type":"receive"}],
    "ENSAbi": [{"inputs":[{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"operator","type":"address"}],"name":"isApprovedForAll","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"node","type":"bytes32"}],"name":"owner","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"node","type":"bytes32"}],"name":"recordExists","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"node","type":"bytes32"}],"name":"resolver","outputs":[{"internalType":"address","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"operator","type":"address"},{"internalType":"bool","name":"approved","type":"bool"}],"name":"setApprovalForAll","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"node","type":"bytes32"},{"internalType":"address","name":"owner","type":"address"}],"name":"setOwner","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"node","type":"bytes32"},{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"resolver","type":"address"},{"internalType":"uint64","name":"ttl","type":"uint64"}],"name":"setRecord","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"node","type":"bytes32"},{"internalType":"address","name":"resolver","type":"address"}],"name":"setResolver","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"node","type":"bytes32"},{"internalType":"bytes32","name":"label","type":"bytes32"},{"internalType":"address","name":"owner","type":"address"}],"name":"setSubnodeOwner","outputs":[{"internalType":"bytes32","name":"","type":"bytes32"}],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"node","type":"bytes32"},{"internalType":"bytes32","name":"label","type":"bytes32"},{"internalType":"address","name":"owner","type":"address"},{"internalType":"address","name":"resolver","type":"address"},{"internalType":"uint64","name":"ttl","type":"uint64"}],"name":"setSubnodeRecord","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"node","type":"bytes32"},{"internalType":"uint64","name":"ttl","type":"uint64"}],"name":"setTTL","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"node","type":"bytes32"}],"name":"ttl","outputs":[{"internalType":"uint64","name":"","type":"uint64"}],"stateMutability":"view","type":"function"}],
    "resolverAbi": [{"inputs":[{"internalType":"contract ENS","name":"ens","type":"address"},{"internalType":"address","name":"dfoHub","type":"address"},{"internalType":"bytes","name":"hashContent","type":"bytes"}],"stateMutability":"nonpayable","type":"constructor"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"node","type":"bytes32"},{"indexed":false,"internalType":"address","name":"a","type":"address"}],"name":"AddrChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"node","type":"bytes32"},{"indexed":false,"internalType":"uint256","name":"coinType","type":"uint256"},{"indexed":false,"internalType":"bytes","name":"newAddress","type":"bytes"}],"name":"AddressChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"node","type":"bytes32"},{"indexed":true,"internalType":"address","name":"owner","type":"address"},{"indexed":true,"internalType":"address","name":"target","type":"address"},{"indexed":false,"internalType":"bool","name":"isAuthorised","type":"bool"}],"name":"AuthorisationChanged","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"internalType":"bytes32","name":"node","type":"bytes32"},{"indexed":false,"internalType":"bytes","name":"hash","type":"bytes"}],"name":"ContenthashChanged","type":"event"},{"inputs":[{"internalType":"contract ENS","name":"ens","type":"address"},{"internalType":"address","name":"dfoHub","type":"address"},{"internalType":"bytes","name":"hashContent","type":"bytes"}],"name":"init","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"string","name":"ensDomain","type":"string"},{"internalType":"address","name":"a","type":"address"}],"name":"setAddr","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"node","type":"bytes32"},{"internalType":"uint256","name":"coinType","type":"uint256"},{"internalType":"bytes","name":"a","type":"bytes"}],"name":"setAddr","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"node","type":"bytes32"},{"internalType":"address","name":"a","type":"address"}],"name":"setAddr","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"node","type":"bytes32"},{"internalType":"address","name":"target","type":"address"},{"internalType":"bool","name":"isAuthorised","type":"bool"}],"name":"setAuthorisation","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"node","type":"bytes32"},{"internalType":"bytes","name":"hash","type":"bytes"}],"name":"setContenthash","outputs":[],"stateMutability":"nonpayable","type":"function"},{"inputs":[{"internalType":"bytes32","name":"node","type":"bytes32"}],"name":"addr","outputs":[{"internalType":"address payable","name":"","type":"address"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"node","type":"bytes32"},{"internalType":"uint256","name":"coinType","type":"uint256"}],"name":"addr","outputs":[{"internalType":"bytes","name":"","type":"bytes"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes32","name":"node","type":"bytes32"}],"name":"contenthash","outputs":[{"internalType":"bytes","name":"","type":"bytes"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"address","name":"a","type":"address"}],"name":"subdomain","outputs":[{"internalType":"string","name":"","type":"string"}],"stateMutability":"view","type":"function"},{"inputs":[{"internalType":"bytes4","name":"interfaceID","type":"bytes4"}],"name":"supportsInterface","outputs":[{"internalType":"bool","name":"","type":"bool"}],"stateMutability":"pure","type":"function"}],
}
},{}],4:[function(require,module,exports){
(function (global){
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

async function loadProxy(blockchainProvider, address, allAddresses) {
    allAddresses = allAddresses || [];
    allAddresses.push(address);
    var proxy = newContract(blockchainProvider, configuration.proxyAbi, address);
    try {
        await blockchainProvider.callContract(proxy, 'getToken');
    } catch (e) {
        var logs = await blockchainProvider.getPastLogs({
            address,
            topics: [
                global.proxyChangedTopic = global.proxyChangedTopic || blockchainProvider.sha3('ProxyChanged(address)')
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

function attachVotingToken(blockchainProvider, dfo) {
    return dfo.votingToken = new Promise(async function(ok) {
        var votingToken = newContract(blockchainProvider, configuration.votingTokenAbi, await blockchainProvider.callContract(await dfo.proxy, 'getToken'));
        ok(votingToken);
        dfo.name = await blockchainProvider.callContract(votingToken, 'name');
        dfo.symbol = await blockchainProvider.callContract(votingToken, 'symbol');
        dfo.totalSupply = await blockchainProvider.callContract(votingToken, 'totalSupply');
        dfo.decimals = await blockchainProvider.callContract(votingToken, 'decimals');
    });
}

function attachStateHolder(blockchainProvider, dfo) {
    dfo.stateHolder = dfo.proxy.then(proxy => blockchainProvider.callContract(proxy, 'getStateHolderAddress')).then(stateHolderAddress => newContract(blockchainProvider, configuration.stateHolderAbi, stateHolderAddress));
    dfo.getState = dfo.getState || async function() {
        var json = JSON.parse(await blockchainProvider.callContract(await dfo.stateHolder, 'toJSON'));
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
    return dfo.functionalities = new Promise(async function(ok) {
        dfo.functionalities && Object.keys(await dfo.functionalities).forEach(functionality => delete dfo[functionality]);
        var globalFunctionalities = {};
        var loop = async function(i, plus) {
            var functionalities = {};
            try {
                functionalities = parseFunctionalities(await blockchainProvider.callContract(await dfo.proxy, 'functionalitiesToJSON', i, plus));
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
                    functionality.needsSender && functionality.isSubmitable && functionality.inputParameters.shift();
                } catch (e) {}
                if(functionality.isInternal) {
                    return;
                }
                dfo[key] = async function() {
                    var argument = '0x';
                    if(functionality.realInputParameters && functionality.realInputParameters.length > 0) {
                        var args = [];
                        functionality.needsSender && args.push(global.voidEthereumAddress);
                        functionality.needsSender && functionality.isSubmitable && args.push(0);
                        for(var i in arguments) {
                            args.push(arguments[i]);
                        }
                        argument = blockchainProvider.encodeAbi(functionality.realInputParameters, args);
                    }
                    var methodName = functionality.isSubmitable ? 'submit' : 'read';
                    var result = await blockchainProvider.callContract(await dfo.proxy, methodName, functionality.codeName, argument);
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
            loop(i + plus, plus);
        };
        loop(0, 30);
    });
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
        attachFunctionalities(blockchainProvider, dfo, options && options.lightweight),
        attachVotingToken(blockchainProvider, dfo),
        attachWellKnownData(blockchainProvider, dfo),
        attachStateHolder(blockchainProvider, dfo),
        attachGetPastLogs(blockchainProvider, dfo)
    ]).then(() => dfo);

    return dfo;
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./configuration.json":3}],5:[function(require,module,exports){
(function (global){
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
        if((await dfoHub.getPastLogs({event: 'DFODeployed(address_indexed,address)', topics: [blockchainProvider.sha3(address)]})).length === 0) {
            throw 'Given address is not created by dfoHub';
        }
        return await DFO(blockchainProvider, address, options).asPromise;
    };

    return dfoHub;
};
}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})
},{"./blockchainProvider":2,"./dfo":4}]},{},[5]);
