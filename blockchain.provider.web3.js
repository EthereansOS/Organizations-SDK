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
        var value = undefined;
        var start = 2;
        if(contract === undefined || contract === null || (typeof contract).toLowerCase() === 'number' || (typeof contract).toLowerCase() === 'string') {
            start = 3;
            value = contract;
            contract = methodName;
            methodName = arguments[2];
        }
        var args = [value, contract.methods[methodName]];
        for(var i = start; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
        return blockchainCall.apply(context, args);
    }

    var blockchainCall = async function blockchainCall(value, call) {
        var args = [];
        for (var i = 2; i < arguments.length; i++) {
            args.push(arguments[i]);
        }
        var method = (call.implementation ? call.get : call.new ? call.new : call).apply(call, args);
        return await (method._method.stateMutability === 'view' || method._method.stateMutability === 'pure' || method._method.constant ? method.call(await getSendingOptions()) : sendBlockchainTransaction(value, method));
    };

    var sendBlockchainTransaction = function sendBlockchainTransaction(value, transaction) {
        return new Promise(async function(ok, ko) {
            var handleTransactionError = function handleTransactionError(e) {
                e !== undefined && e !== null && (e.message || e).indexOf('not mined within') === -1 && ko(e);
            }
            try {
                (transaction = transaction.send ? transaction.send(await getSendingOptions(transaction, value), handleTransactionError) : transaction).on('transactionHash', transactionHash => {
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

    var getSendingOptions = function getSendingOptions(transaction, value) {
        return new Promise(async function(ok, ko) {
            if (transaction) {
                var address = await getAddress();
                var txnData = {
                    from: address,
                    gasPrice: engine.utils.toWei("13", "gwei")
                };
                value && (txnData.value = value);
                return transaction.estimateGas(txnData,
                    function(error, gas) {
                        if (error) {
                            return ko(error.message || error);
                        }
                        var data = {
                            from: address,
                            gas: gas || configuration.gasLimit || '7900000'
                        };
                        value && (data.value = value);
                        return ok(data);
                    });
            }
            return ok({
                from: context.walletAddress || null,
                gas: configuration.gasLimit || '7900000'
            });
        });
    };
};