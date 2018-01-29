# Time Locked Wallet



## Setup Environment
Firstly, install [Node](https://nodejs.org/en/) and [Git](https://git-scm.com/) on your machine.
Once it's done install Truffle with:
```
npm install -g truffle
```

Now, get the code:
```
git clone https://github.com/radek1st/time-locked-wallets 
cd time-locked-wallet-contract
```

## Contract Development

Start Truffle Console and Compile/Deploy/Test

To get started quickly run Truffle with inbuilt blockchain:
```
truffle develop
```
Alternatively, install and start [Ganache](http://truffleframework.com/ganache/) 
which comes with a nice UI to the local blockchain and then connect to it with:
```
truffle --network ganache console
```

To compile the contracts run:
```
> compile
```
To deploy the contracts run:
```
> migrate
```
To run the tests:
```
> test
```

## Contract Interaction with ÐApp 

### Install and Configure MetaMask extension

Install [MetaMask](https://metamask.io/) in your Chrome browser.


Import the wallet seed from the testnet (should be something like):
```
candy maple cake sugar pudding cream honey rich smooth crumble sweet treat
```

Select Network: 
* for default use `http://localhost:9545`
* for Ganache use `http://localhost:7545`

### Run ÐApp
To see the Time Locked Wallet in action, start the web server locally:
```
npm run dev
```
It should automatically open the browser at `http://localhost:XXXX`


You can then interact with the contract form the web UI and switch the accounts in MetaMask.



### Other ideas

* multisig wallet/will -- children&partner must agree,
* give a signed message to withdraw the money, doesn't have to be address, could be just the signed message
