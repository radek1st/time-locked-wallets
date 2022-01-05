module.exports = {
  networks: {
    develop: {
      port: 7545,
      network_id: "5777" // Match any network id
    }
  },
  compilers: {
    solc: {
      version: "0.5.11"
    }    
  }
};
