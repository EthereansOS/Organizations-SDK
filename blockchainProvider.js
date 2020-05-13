module.exports = {
    init(engine) {
        var name = engine.__proto__.constructor.name.toLowerCase();
        var Provider;
        if(name === 'web3') {
            Provider = require('./blockchain.provider.web3');
        }
        return new Provider(engine);
    }
};