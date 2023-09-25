const { deployContract, contractAt, getContractAddress, sendTxn, getSigner } = require('./lib/deploy')
const { config } = require('../config')

let digital10kToken

async function main() {
  const deployer = await getSigner()
  const mintAmount = config.mintAmount
  const premintAccounts = config.premintAccounts

  // deploy token
  digital10kToken = await deployContract('Digital10kToken', [], 'Digital10kToken', deployer)

  // premint
  const amount = await parseTokenUnit(mintAmount)
  for (account of premintAccounts) {
    await sendTxn(digital10kToken.mint(account, amount), `digital10kToken.mint(${account}, ${amount})`)
  }
}

async function parseTokenUnit(amount) {
  const decimals = await digital10kToken.decimals()
  return ethers.BigNumber.from(amount).mul(ethers.BigNumber.from(10).pow(decimals))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
