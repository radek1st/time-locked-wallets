module.exports = {
  networks: {
    ganache: {
      host: "localhost",
      port: 9545,
      network_id: "*" // Match any network id
    }
  },
  compilers: {
    solc: {
      version: "0.5.11"
    }    
  }
};
