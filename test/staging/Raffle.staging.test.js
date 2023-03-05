const { deployments, ethers, getNamedAccounts } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")

// Only runs on a testnet
developmentChains.includes(network.name) ? describe.skip : 
describe("Raffle Unit Tests", () => {
    let raffle, raffleEntranceFee, deployer, gasCost

    beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer
        raffle = await ethers.getContract("Raffle", deployer)
        raffleEntranceFee = await raffle.getEntranceFee()
    })

    describe("fulfillRandomWords", () => {
        it("works with live Chainlink Keepers and Chainlink VRF, we get a random winner", async () => {
            const startingTimeStamp = await raffle.getLatestTimeStamp()
            const accounts = await ethers.getSigners()

            await new Promise (async (resolve, reject) => {
                raffle.once("WinnerPicked", async () => {
                    console.log("Winner picked event fired!")
                    try {
                        const recentWinner = await raffle.getRecentWinner()
                        const raffleState = await raffle.getRaffleState()
                        const winnerEndingBalance = await accounts[0].getBalance()
                        const endingTimeStamp = await raffle.getLatestTimeStamp()

                        

                        await expect(raffle.getPlayer(0)).to.be.reverted
                        assert.equal(recentWinner.toString(), accounts[0].address)
                        assert.equal((winnerEndingBalance.add(gasCost)).toString(), winnerStartingBalance.add(raffleEntranceFee).toString())

                        assert.equal(raffleState.toString(), "0")
                        assert(endingTimeStamp > startingTimeStamp)
                        resolve()
                    } catch(err) {
                        console.log(error)
                        reject(err)
                    }                  
                })
                // Then entering the raffle
                console.log("Entering Raffle...")
                const transactionResponse = await raffle.enterRaffle({ value: raffleEntranceFee })
                const transactionReceipt = await transactionResponse.wait(1)
                const { gasUsed, effectiveGasPrice } = transactionReceipt
                gasCost = gasUsed.mul(effectiveGasPrice)

                console.log("Ok, time to wait...")
                const winnerStartingBalance = await accounts[0].getBalance()
            })
        })
    })
})