var TimeLockedWalletFactory = artifacts.require("TimeLockedWalletFactory");
var ToptalToken = artifacts.require("ToptalToken");

module.exports = function(deployer) {
  deployer.deploy(TimeLockedWalletFactory);
  deployer.deploy(ToptalToken);
};
