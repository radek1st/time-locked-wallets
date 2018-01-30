DApp = {
    web3Provider: null,
    factoryContract: null,
    walletContract: null,
    toptalTokenContract: null,
    currentAccount: null,
    table: null,
    wallets: {},

    // set to true to use with local blockchain
    development: false,
    //Rinkeby:
    factoryAddress: "0xe47684d658872fbde11c82036099a12c066c4fa3",
    tokenAddress: "0x86b32525e687500ed4a665d1b16fef526cdd6f10",

    init: function() {
        console.log("[x] Initializing DApp.");
        this.initWeb3();
        this.initContract();
    },

    /**************************************************************************
     * Smart Contracts interaction methods.
     *************************************************************************/

    initWeb3: function() {
        // Is there is an injected web3 instance?
        if (typeof web3 !== 'undefined') {
          DApp.web3Provider = web3.currentProvider;
        } else {
          // If no injected web3 instance is detected, fallback to the TestRPC
          DApp.web3Provider = new Web3.providers.HttpProvider('http://localhost:9545');
        }
        web3 = new Web3(DApp.web3Provider);
        console.log("[x] web3 object initialized.");
    },

    getFactoryContract: function(){
        if(DApp.development)
            return DApp.factoryContract.deployed();
        else
            return DApp.factoryContract.at(DApp.factoryAddress);
    },

    getToptalTokenContract: function(){
        if(DApp.development)
            return DApp.toptalTokenContract.deployed();
        else
            return DApp.toptalTokenContract.at(DApp.tokenAddress);
    },

    /**
     *  TODO: Rewrite to use promises.
     */
    initContract: function(){
        $.getJSON('contracts/TimeLockedWalletFactory.json', function(factoryContract){
            DApp.factoryContract = TruffleContract(factoryContract);
            DApp.factoryContract.setProvider(DApp.web3Provider);
            console.log("[x] TimeLockedWalletFactory contract initialized.");

            //hardcoding ToptalToken for simplicity
            $.getJSON('contracts/ToptalToken.json', function(toptalTokenContract){
                DApp.toptalTokenContract = TruffleContract(toptalTokenContract);
                DApp.toptalTokenContract.setProvider(DApp.web3Provider);
                console.log("[x] ToptalToken contract initialized.");

                $.getJSON('contracts/TimeLockedWallet.json', function(walletContract){
                    DApp.walletContract = TruffleContract(walletContract)
                    DApp.walletContract.setProvider(DApp.web3Provider);
                    console.log("[x] TimeLockedWallet contract initialized.");

                    web3.eth.getAccounts(function(error, accounts) {
                        if (error) {
                            console.error(error);
                        } else {
                            DApp.currentAccount = accounts[0];
                            console.log("[x] Using account", DApp.currentAccount);
                            DApp.initCreateWalletForm();
                            DApp.prefillCreateWalletForm();
                            DApp.initTable();
                            DApp.loadWallets();
                            DApp.initTopupWalletForm();
                            DApp.initClaimForm();
                        }
                    });
                });
            });
        });
    },



    loadWallets: function(){
        if(DApp.development) {
            DApp.factoryContract.deployed()
                .then(function(factoryInstance){
                    return factoryInstance.getWallets(DApp.currentAccount);
                })
                .then(function(walletAddresses){
                    console.log("[x] Number of existing wallets:", walletAddresses.length);
                    walletAddresses.forEach(DApp.loadSingleWallet);
                });
        } else {
            DApp.factoryContract.at(DApp.factoryAddress)
                .then(function(factoryInstance){
                    return factoryInstance.getWallets(DApp.currentAccount);
                })
                .then(function(walletAddresses){
                    console.log("[x] Number of existing wallets:", walletAddresses.length);
                    walletAddresses.forEach(DApp.loadSingleWallet);
                });
        }
    },

    loadSingleWallet: function(walletAddress){
        DApp.walletContract.at(walletAddress)
            .then(function(walletInstance){
                return walletInstance.info();
            })
            .then(function(info){
                var from        = info[0];
                var to          = info[1];
                var unlockDate  = info[2].toNumber();
                var createdAt   = info[3].toNumber();
                var ether       = info[4].toNumber();
                //
                DApp.addWalletToTable(from, to, walletAddress, createdAt, unlockDate);
                DApp.addFundsToWallet(walletAddress, 'wei', ether);
            });

        // Load Toptal wallets.
        DApp.getToptalTokenContract()
            .then(function(tokenInstance){
                return tokenInstance.balanceOf(walletAddress);
            })
            .then(function(info){
                var amount = info.toNumber();
                DApp.addFundsToWallet(walletAddress, 'toptaltoken', amount);
            });
    },


    createNewWallet: function(receiverAddress, ethAmount, unlockDate){
        if(DApp.development) {
            DApp.factoryContract.deployed()
                .then(function(factoryInstance){
                    var tx = {
                        from: DApp.currentAccount,
                        value: web3.toWei(ethAmount, "ether")
                    };
                    return factoryInstance.newTimeLockedWallet(receiverAddress, unlockDate, tx);
                })
                .then(function(tx){
                    var createdEvent = tx.logs[0].args;
                    var from        = createdEvent.from;
                    var to          = createdEvent.to;
                    var wallet      = createdEvent.wallet;
                    var unlockDate  = createdEvent.unlockDate.toNumber();
                    var createdAt   = createdEvent.createdAt.toNumber();
                    var ether       = createdEvent.amount.toNumber();

                    DApp.addFundsToWallet(wallet, 'wei', ether);
                    DApp.addWalletToTable(from, to, wallet, createdAt, unlockDate);
                });
        } else {
                DApp.factoryContract.at(DApp.factoryAddress)
                    .then(function(factoryInstance){
                        var tx = {
                            from: DApp.currentAccount,
                            value: web3.toWei(ethAmount, "ether")
                        };
                        return factoryInstance.newTimeLockedWallet(receiverAddress, unlockDate, tx);
                    })
                    .then(function(tx){
                        var createdEvent = tx.logs[0].args;
                        var from        = createdEvent.from;
                        var to          = createdEvent.to;
                        var wallet      = createdEvent.wallet;
                        var unlockDate  = createdEvent.unlockDate.toNumber();
                        var createdAt   = createdEvent.createdAt.toNumber();
                        var ether       = createdEvent.amount.toNumber();

                        DApp.addFundsToWallet(walletAddress, 'wei', ether);
                        DApp.addWalletToTable(from, to, wallet, createdAt, unlockDate);
                    });
        }
    },

    claimFunds: function(walletAddress, currency){
        if(currency === "ether") {
            DApp.walletContract.at(walletAddress)
                .then(function(walletInstance){
                    return walletInstance.withdraw({from: DApp.currentAccount});
                })
                .then(function(tx){
                    var withdrawEvent = tx.logs[0].args;
                    var amount = withdrawEvent["amount"].toNumber();
                    DApp.addFundsToWallet(walletAddress, 'wei', (-1)*amount);
                });
        } else if (currency == "toptaltoken") {
        DApp.getToptalTokenContract()
            .then(function(tokenInstance) {
                console.log("ADDRESS", tokenInstance.address);
                DApp.walletContract.at(walletAddress)
                    .then(function(walletInstance){
                        //gas given by walletInstance.withdrawTokens.estimateGas(1); 33322
                        var gas = 80000;
                        return walletInstance.withdrawTokens(tokenInstance.address, {from: DApp.currentAccount, gas: gas});
                    })
                    .then(function(tx){
                        console.log("11111", tx);
                        var withdrawEvent = tx.logs[0].args;
                        console.log("****", withdrawEvent["amount"].toNumber());
                        var amount = withdrawEvent["amount"].toNumber();
                        DApp.addFundsToWallet(walletAddress, 'toptaltoken', (-1)*amount);
                    })
                    ;
            })
        }
    },

    topupWallet: function(walletAddress, amount, currency){
        if(currency === "ether") {
            console.log("Topup with plain old Ether");
            DApp.walletContract.at(walletAddress)
                .then(function(walletInstance){
                    return walletInstance.send(web3.toWei(amount, "ether"), {from: DApp.currentAccount});
                })
                .then(function(tx){
                    console.log(tx);
                    createdEvent = tx.logs[0].args;
                    var from   = createdEvent.from;
                    var amount = createdEvent.amount.toNumber();

                    DApp.addFundsToWallet(walletAddress, 'wei', amount);
                });
        } else if(currency === "toptaltoken") {
            console.log("Topup Toptal Token");
            DApp.getToptalTokenContract()
                .then(function(tokenInstance){
                    return tokenInstance.transfer(walletAddress, amount, {from: DApp.currentAccount});
                })
                .then(function(tx){
                    console.log(tx);
                    transferEvent = tx.logs[0].args;
                    var from = transferEvent.from;
                    var amount = transferEvent.value.toNumber()

                    DApp.addFundsToWallet(walletAddress, 'toptaltoken', amount);
                });
        } else {
            throw new Error("Unknown currency!");
        }
    },

    /**************************************************************************
     * Wallet amounts tracking methods.
     *************************************************************************/    
    addFundsToWallet: function(walletAddress, token, amount){
        if(typeof DApp.wallets[walletAddress] == "undefined"){
            DApp.wallets[walletAddress] = {};
        }
        if(typeof DApp.wallets[walletAddress][token] == "undefined"){
            DApp.wallets[walletAddress][token] = 0;
        }
        console.log("addFundsToWallet", walletAddress, token, amount)
        DApp.wallets[walletAddress][token] += amount;

        //refresh doesn't work so using a workaround
        //DApp.table.bootstrapTable('refresh');
        DApp.table.bootstrapTable('updateRow', {index: 1000, row: null})
    },

    getKnownWalletBallance: function(walletAddress, token){
        if(typeof DApp.wallets[walletAddress] == "undefined") return 0;
        if(typeof DApp.wallets[walletAddress][token] == "undefined") return 0;
        var value = DApp.wallets[walletAddress][token];
        console.log(walletAddress, token, value);
        return value
    },

    /**************************************************************************
     * Form methods.
     *************************************************************************/
    initCreateWalletForm: function(){
        $("#create-wallet-form").submit(function(event) {
            event.preventDefault();
            var form = $(this);
            var ethAddress = form.find("#ethereumAddress").val();
            var ethAmount = form.find("#etherAmount").val();
            var unlockDate = new Date(form.find("#unlockDate").val()).getTime() / 1000;
            DApp.createNewWallet(ethAddress, ethAmount, unlockDate);
        });
    },

    prefillCreateWalletForm: function(){
        $("#create-wallet-form #ethereumAddress").val(DApp.currentAccount);
        $("#create-wallet-form #etherAmount").val(0.0);
        var date = new Date();
        date.setMinutes(date.getMinutes() + 10);
        date = date.toISOString();
        date = date.slice(0, -8)
        $("#create-wallet-form #unlockDate").val(date);
    },

    initTopupWalletForm: function(){
        console.log("initTopupWalletForm");
        $("#topup-wallet-form").submit(function(event) {
            event.preventDefault();
            var form = $(this);
            var targetWalletAddress = form.find('#knownWalletAddresses option').filter(":selected").val();
            var amount = form.find("#amount").val();
            var currency = form.find("#currency").val();
            console.log("[r] " + targetWalletAddress + "; " + amount + "; " + currency)
            DApp.topupWallet(targetWalletAddress, amount, currency);
        });
    },

    updateKnownWalletAddresses: function(walletAddress){
        // Add new address option to dropdown.
        $("#knownWalletAddresses").append("<option value='" + walletAddress + "'>" + walletAddress + "</option>");

        // Get rid of duplicate addresses
        var usedNames = {};
        $("select[id='knownWalletAddresses'] > option").each(function () {
            if(usedNames[this.text]) {
                $(this).remove();
            } else {
                usedNames[this.text] = this.value;
            }
        });
    },

    updateClaimWalletAddresses: function(walletAddress, to){
        //Only pick owned accounts
        if(DApp.currentAccount === to){
            // Add new address option to dropdown.
            $("#claimWalletAddresses").append("<option value='" + walletAddress + "'>" + walletAddress + "</option>");

            // Get rid of duplicate addresses
            var usedNames = {};
            $("select[id='claimWalletAddresses'] > option").each(function () {
                if(usedNames[this.text]) {
                    $(this).remove();
                } else {
                    usedNames[this.text] = this.value;
                }
            });
        }
    },

    updateClaimForm: function(){
        var form = $('#claim-funds-form');
        var wallet = $('#claimWalletAddresses').val();
        var currency = form.find("#claimableCurrency").val();
        if(currency == "ether"){
            var weiValue = DApp.getKnownWalletBallance(wallet, 'wei');
            var ethValue = web3.fromWei(weiValue, 'ether');
            form.find("#claimableAmount").val(ethValue);
        } else if(currency == "toptaltoken") {
            var toptalValue = DApp.getKnownWalletBallance(wallet, 'toptaltoken')
            form.find("#claimableAmount").val(toptalValue);
        } else {
            console.log("Unknown currency set: " + currency);
        }

        //Update Unlock In
        DApp.table.bootstrapTable('getData').forEach(function(row) {
            if(row["wallet"] == wallet) {
                var unlockDate = row["unlockDate"];
                var now = Math.floor(Date.now() / 1000);
                if(now >= unlockDate) {
                    $("#unlockIn").val('OPEN');
                    $("#claim-submit-button").prop('disabled', false);
                } else {
                    $("#unlockIn").val(DApp.dateFormatter(unlockDate));
                    $("#claim-submit-button").prop('disabled', true);
                }
            }
        });
    },

    initClaimForm: function(){
        console.log("initClaimForm");

        $('#claim-funds-form #claimWalletAddresses').change(DApp.updateClaimForm);
        $('#claim-funds-form #claimableCurrency').change(DApp.updateClaimForm);
        $('a[data-toggle="tab"]').on('shown.bs.tab', DApp.updateClaimForm);

        $("#claim-funds-form").submit(function(event) {
            event.preventDefault();
            var form = $(this);
            var walletAddress = form.find('#claimWalletAddresses option').filter(":selected").val();
            var currency = form.find("#claimableCurrency").val();

            DApp.claimFunds(walletAddress, currency);
        });
    },


    /**************************************************************************
     * Table methods
     *************************************************************************/
    initTable: function(){
        DApp.table = $("#wallets-table");
        DApp.table.bootstrapTable({
            iconsPrefix: 'fa',
            icons: {
                // paginationSwitchDown: 'glyphicon-collapse-down icon-chevron-down',
                // paginationSwitchUp: 'glyphicon-collapse-up icon-chevron-up',
                // refresh: 'glyphicon-refresh icon-refresh',
                // toggle: 'glyphicon-list-alt icon-list-alt',
                // columns: 'glyphicon-th icon-th',
                detailOpen: 'fa-plus',
                detailClose: 'fa-minus'
            },
            detailView: true,
            detailFormatter: DApp.detailFormatter,
            sortName: 'createdAt',
            sortOrder: 'desc',
            columns: [
                { 
                    field: 'from', 
                    title: 'From',
                    formatter: DApp.hashFormatter,
                    searchable: true
                }, { 
                    field: 'type',        
                    title: 'Type',
                    formatter: DApp.typeFormatter       
                },{ 
                    field: 'to',
                    title: 'To',
                    formatter: DApp.hashFormatter
                },{ 
                    field: 'wallet',      
                    title: 'Wallet',
                    formatter: DApp.hashFormatter     
                },{ 
                    field: 'createdAt',
                    title: 'Age',
                    formatter: DApp.dateFormatter,
                    sortable: true
                },{ 
                    field: 'unlockDate',
                    title: 'Unlock In',
                    formatter: DApp.dateFormatter,
                    sortable: true
                },{ 
                    field: 'value',
                    title: "Value",
                    formatter: DApp.valueFormatter,
                    sortable: false
                },{ 
                    field: 'actions',
                    title: "Actions",
                    formatter: DApp.actionFormatter
                }
            ],
        });
    },

    addWalletToTable: function(from, to, wallet, createdAt, unlockDate, value, currency = "Ether"){
        newRow = {
            type: DApp.discoverType(from, to),
            from: from,
            to: to,
            wallet, wallet,
            createdAt: createdAt,
            unlockDate: unlockDate,
        }
        DApp.table.bootstrapTable('append', newRow);

        DApp.updateKnownWalletAddresses(wallet);
        DApp.updateClaimWalletAddresses(wallet, to);
    },

    discoverType: function(from, to){
        if(from == to && from == DApp.currentAccount){
            return "self";
        } else if(from == DApp.currentAccount){
            return "out";
        } else if(to == DApp.currentAccount){
            return "in";
        } else {
            throw new Error("Unknown type!");
        }
    },

    typeFormatter: function(type){
        var badgeClass = {
            "self": "badge-info",
            "in":   "badge-success",
            "out":  "badge-warning"
        };

        return `<span class="badge ${badgeClass[type]}">${type}</span>`;
    },

    hashFormatter: function(hash, row, index){
        shortHash = hash.slice(0, 10);
        return `<a href="https://rinkeby.etherscan.io/address/${hash}">${shortHash}...</a>`;
    },

    dateFormatter: function(timestamp, row, index){
        return moment(timestamp*1000).fromNow();
    },

    valueFormatter: function(cell, row){
        var weiValue = DApp.getKnownWalletBallance(row['wallet'], 'wei');
        var ethValue = web3.fromWei(weiValue, 'ether');
        var toptalValue = DApp.getKnownWalletBallance(row['wallet'], 'toptaltoken')

        console.log("xxxx", row['wallet'], ethValue, toptalValue);

        if(ethValue == 0 && toptalValue == 0){
            return 'Wallet empty';
        } 
        var html = '';
        if(ethValue > 0) { html += `${ethValue} Ether</br>`}
        if(toptalValue > 0) { html += `${toptalValue} ToptalToken`}

        return html;
    },

    detailFormatter: function(index, row){
        console.log("asd")
        var table = $("<table></table");
        return table.bootstrapTable({
            showHeader: false,
            columns: [
                { 
                    field: 'key', 
                    title: 'Key',
                    cellStyle: DApp.detailViewKeyColumnFormatter 
                }, { 
                    field: 'value',        
                    title: 'Value',
                }
            ],
            data: [
                {
                    key: "From",
                    value: row['from']
                }, {
                    key: "Type",
                    value: DApp.typeFormatter(row['type'])
                },{
                    key: "To",
                    value: row['to']
                },{
                    key: "Wallet Address",
                    value: row['wallet']
                },{
                    key: "Age",
                    value: DApp.dateFormatter(row['createdAt'])
                },{
                    key: "Unlock In",
                    value: DApp.dateFormatter(row['unlockDate'])
                },{
                    key: "Value",
                    value: DApp.valueFormatter(false, row)
                }
            ],
        });
    },

    detailViewKeyColumnFormatter: function(value, row, index, field){
        return {
            classes: 'font-weight-bold',
        };
    },

    actionFormatter: function(value, row, index, field){
        var unlockDate = row["unlockDate"];
        var now = Math.floor(Date.now() / 1000);
        if(now >= unlockDate && row["to"] == DApp.currentAccount) {
            var html = `<button class="btn btn-danger" onClick="DApp.handleTopupButtonClick('${row['wallet']}')">Topup</button>` +
                    `<button class="btn btn-warning text-white" onClick="DApp.handleClaimButtonClick('${row['wallet']}')">Claim</button>`;
        } else {
            var html = `<button class="btn btn-danger" onClick="DApp.handleTopupButtonClick('${row['wallet']}')">Topup</button>`;
        }
        return html;
    },

    handleTopupButtonClick: function(walletAddress){
        $('#knownWalletAddresses').val(walletAddress).change();
        $('#topup-tab').tab('show');
    },

    handleClaimButtonClick: function(walletAddress){
        $('#claimWalletAddresses').val(walletAddress).change();
        DApp.updateClaimForm();
        $('#claim-tab').tab('show');
    }
}

$(function() {
    DApp.init();
});
