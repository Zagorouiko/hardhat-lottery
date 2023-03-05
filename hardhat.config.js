require("@nomiclabs/hardhat-waffle")
require("@nomiclabs/hardhat-etherscan")
require("hardhat-deploy")
require("solidity-coverage")
require("hardhat-gas-reporter")
require("hardhat-contract-sizer")
require("dotenv").config()

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [{version: "0.8.17"}, {version: "0.6.6"}, {version: "0.8.0"}]
  },
  defaultNetwork: "hardhat",
  networks: {
    goerli: {
      url: process.env.GOERLI_URL,
      accounts: [process.env.PRIVATE_KEY],
      chainId: 5,
      blockConfirmations: 6,
    },
    hardhat: {
      chainId: 31337,
      blockConfirmations: 1,
    },
    localhost: { 
      chainId: 31337, 
      blockConfirmations: 1, 
    },
  },
  gasReporter: {
    enabled: false,
    outputFile: "gas-report.txt",
    noColors: true,
    currency: "USD",
    coinmarketcap: process.env.COINMARKETCAP_API_KEY,
    token: "ETH"
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
  namedAccounts: {
    deployer: {
      default: 0,
      5: 0
    },
    player: {
      default: 1
    },
  },
  mocha: {
    timeout: 500000
  }
};
