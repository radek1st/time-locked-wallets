const TimeLockedWallet = artifacts.require("./TimeLockedWallet.sol");
const TimeLockedWalletFactory = artifacts.require("./TimeLockedWalletFactory.sol");

let ethToSend = web3.toWei(1, "ether");
let someGas = web3.toWei(0.01, "ether");
let timeLockedWalletFactory;
let creator;
let owner;
let timeLockedWalletAbi;

contract('TimeLockedWalletFactory', (accounts) => {

    before(async () => {
        creator = accounts[0];
        owner = accounts[1];
        timeLockedWalletFactory = await TimeLockedWalletFactory.new({from: creator});

    });

    it("Factory created contract is working well", async () => {
        // Create the wallet contract.
        let now = Math.floor((new Date).getTime() / 1000);
        await timeLockedWalletFactory.newTimeLockedWallet(
            owner, now, {from: creator, value: ethToSend}
        );

        // Check if wallet can be found in creator's wallets.
        let creatorWallets = await timeLockedWalletFactory.getWallets.call(creator);
        assert(1 == creatorWallets.length);

        // Check if wallet can be found in owners's wallets.
        let ownerWallets = await timeLockedWalletFactory.getWallets.call(owner);
        assert(1 == ownerWallets.length);
        
        // Check if this is the same wallet for both of them.
        assert(creatorWallets[0] === ownerWallets[0]);
    });

});
