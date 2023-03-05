const { network } = require("hardhat")
const { networkConfig, developmentChains, BASE_FEE, GAS_PRICE_LINK, } = require("../helper-hardhat-config")


module.exports = async function ({ getNamedAccounts, deployments }) {
    const { deploy, log } = deployments
    const { deployer } = await getNamedAccounts();

    if (developmentChains.includes(network.name)) {
        const raffle = await deploy("VRFCoordinatorV2Mock", {
            from: deployer,
            args: [BASE_FEE, GAS_PRICE_LINK],
            log: true,
            waitConfirmations: network.config.blockConfirmations || 1,
        })
        log("Mocks deployed!")
        log("______________________________________________")
    } 
}

module.exports.tags = ["all", "mocks"]