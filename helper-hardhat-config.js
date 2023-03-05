const { ethers } = require("hardhat")

const networkConfig = {
    5: {
        name: "goerli",
        vrfCoordinatorV2: "0x2Ca8E0C643bDe4C2E08ab1fA0da3401AdAD7734D",
        entranceFee: ethers.utils.parseEther("0.01"),
        gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
        subscriptionId: "8313",
        callbackGasLimit: "500000",
        interval: "30"
    },
    31337: {
        name: "hardhat",
        entranceFee: ethers.utils.parseEther("0.01"),
        gasLane: "0x79d3d8832d904592c0bf9818b621522c988bb8b0c05cdc3b15aea1b6e8db0c15",
        subscriptionId: "8313",
        callbackGasLimit: "500000",
        interval: "30"
    },
}

const developmentChains = ["hardhat", "localhost"]
const BASE_FEE = ethers.utils.parseEther("0.25")
const GAS_PRICE_LINK = 1e9
const VRF_SUB_FUND_AMOUNT = ethers.utils.parseEther("2")

// Chainink nodes pay the gas fees to give randomness since they're the ones calling functions on the SC 
// So that's why we send the gas_price_link

module.exports = {
    networkConfig,
    developmentChains,
    BASE_FEE,
    GAS_PRICE_LINK,
    VRF_SUB_FUND_AMOUNT,
}