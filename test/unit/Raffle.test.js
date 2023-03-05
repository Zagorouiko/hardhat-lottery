const { deployments, ethers, getNamedAccounts } = require("hardhat")
const { developmentChains, networkConfig } = require("../../helper-hardhat-config")
const { assert, expect } = require("chai")

//Only runs locally
!developmentChains.includes(network.name) ? describe.skip : 
describe("Raffle Unit Tests", () => {
    let raffle, VRFCoordinatorV2Mock, raffleEntranceFee, deployer, interval
    const chainId = network.config.chainId

    beforeEach(async () => {
        deployer = (await getNamedAccounts()).deployer
        await deployments.fixture(["all"])
        raffle = await ethers.getContract("Raffle", deployer)
        VRFCoordinatorV2Mock = await ethers.getContract("VRFCoordinatorV2Mock", deployer)
        raffleEntranceFee = await raffle.getEntranceFee()
        interval = await raffle.getInterval()
    })

    describe("constructor", () => {
        it("initializes the raffle correctly", async () => {
            const raffleState = await raffle.getRaffleState()
            
            assert.equal(raffleState.toString(), "0")
            assert.equal(interval.toString(), networkConfig[chainId]["interval"])
        })
    })

    describe("enter Raffle", () => {
        it("reverts when you don't pay enough", async () => {
            await expect(raffle.enterRaffle()).to.be.revertedWith("Raffle_NotEnoughEthEntered")
        })

        it("Records players when they enter", async () => {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            const playerFromContract = await raffle.getPlayer(0)
            assert.equal(playerFromContract, deployer)
        })

        it("Emits event on enter", async () => {
            await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.emit(raffle, "RaffleEnter")
        })

        it("Doesn't allow entrance when raffle is calculating", async () => {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            
            // Forces blockchain to do our bidding (increases time and mines a block, built into hardhat)
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.send("evm_mine", [])

            await raffle.performUpkeep([])
         
            await expect(raffle.enterRaffle({ value: raffleEntranceFee })).to.be.revertedWith("Raffle__NotOpen")
        })
    })

    describe("checkUpkeep", () => {
        it("returns false if people haven't sent any ETH", async () => {
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.send("evm_mine", [])

            // callStatic is used to get the actual return type of performUpkeep instead of running the function, in this case false
            const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
            assert(!upkeepNeeded)
        })

        it("returns false if raffle isn't open", async () => {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.send("evm_mine", [])
            await raffle.performUpkeep([])

            const raffleState = await raffle.getRaffleState()
            const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([])
            assert.equal(raffleState.toString(), "1")
            assert.equal(upkeepNeeded, false)
        })

        it("returns false if enough time hasn't passed", async () => {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            await network.provider.send("evm_increaseTime", [interval.toNumber() - 5]) // use a higher number here if this test fails
            await network.provider.request({ method: "evm_mine", params: [] })
            const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]) // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
            assert(!upkeepNeeded)
        })
        it("returns true if enough time has passed, has players, eth, and is open", async () => {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.request({ method: "evm_mine", params: [] })
            const { upkeepNeeded } = await raffle.callStatic.checkUpkeep([]) // upkeepNeeded = (timePassed && isOpen && hasBalance && hasPlayers)
            assert(upkeepNeeded)
        })
    })

    describe("performUpkeep", () => {
        it("it can only run if checkupkeep is true", async () => {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.send("evm_mine", [])
            const tx = await raffle.performUpkeep([])
            assert(tx)
        })
        it("reverts when checkupkeep is false", async () => {
            await expect(raffle.performUpkeep([])).to.be.revertedWith("Raffle__UpkeepNotNeeded")
        })
        it("updates the raffle state, emits an event, and calls the vrf coordinator", async () => {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.send("evm_mine", [])
            const txResponse = await raffle.performUpkeep([])
            const txReceipt = await txResponse.wait(1)

            // VRFCoordinatorV2Mock also emits an event when the requestRandomWords() function runs, but were grabbing the emit event from raffle, hence index "1" event instead of 0
            const requestId = txReceipt.events[1].args.requestId
            const raffleState = await raffle.getRaffleState()
            
            assert(requestId.toNumber() > 0)
            assert(raffleState.toString() == "1")
        })
    })

    describe("fulfillRandomWords", () => {
        beforeEach(async () => {
            await raffle.enterRaffle({ value: raffleEntranceFee })
            await network.provider.send("evm_increaseTime", [interval.toNumber() + 1])
            await network.provider.send("evm_mine", [])
        })

        it("can only be called after performUpkeep", async () => {
            await expect(VRFCoordinatorV2Mock.fulfillRandomWords(0, raffle.address)).to.be.revertedWith("nonexistent request")
            await expect(VRFCoordinatorV2Mock.fulfillRandomWords(1, raffle.address)).to.be.revertedWith("nonexistent request")
        })

        it("picks a winner, resets the lottery, and sends money", async () => {
            const additionalEntrants = 3
            const startingAccountIndex = 1 // deployer = 0
            const accounts = await ethers.getSigners()

            for (let i = startingAccountIndex; i < startingAccountIndex + additionalEntrants; i++) {
                const accountConnectedRaffle = raffle.connect(accounts[i])
                await accountConnectedRaffle.enterRaffle({ value: raffleEntranceFee })
            }
            const startingTimeStamp = await raffle.getLatestTimeStamp()

            // performUpkeep (mock being chainlink keepers)
            // fulfillRandomWords (mock being the chainlink VRF)
            // We will have to wait for the fulfillRandomWords to be called
            await new Promise (async (resolve, reject) => {
                raffle.once("WinnerPicked", async () => {
                    //The listener is inside this callback. It runs once the code below that's inside the promise finishes running since WinnerPicked event emits at the end of fulfillrandomWords()
                    console.log("Found the event!")
                    try {
                        const recentWinner = await raffle.getRecentWinner()
                        const raffleState = await raffle.getRaffleState()
                        const endingTimeStamp = await raffle.getLatestTimeStamp()
                        const numPlayers = await raffle.getNumberOfPlayers()

                        const winnerEndingBalance = await accounts[1].getBalance()

                        assert.equal(numPlayers.toString(), "0")
                        assert.equal(raffleState.toString(), "0")
                        assert(endingTimeStamp > startingTimeStamp)

                        assert.equal(winnerEndingBalance.toString(), winnerStartingBalance.add(raffleEntranceFee.mul(additionalEntrants).add(raffleEntranceFee).toString()))
                    } catch(err) {
                        reject(err)
                    }
                    resolve()
                })

                // Draws random number which triggers the listener above
                const tx = await raffle.performUpkeep([])
                const txReceipt = await tx.wait(1)
                const winnerStartingBalance = await accounts[1].getBalance()
                await VRFCoordinatorV2Mock.fulfillRandomWords(txReceipt.events[1].args.requestId, raffle.address)
            })

        })
    })
})