module.exports = function BlockchainProvider(engine) {
    var name = engine.__proto__.constructor.name.toLowerCase();
    var Provider;
    if (name.indexOf('web3') !== -1) {
        Provider = require('./blockchain.provider.web3');
    }
    return new Provider(engine);
};