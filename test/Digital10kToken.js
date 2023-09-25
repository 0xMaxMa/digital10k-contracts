const { expect } = require('chai')
const { ethers, BigNumber = ethers.BigNumber } = require('hardhat')
const helpers = require('@nomicfoundation/hardhat-network-helpers')

let Digital10kToken
let digital10kToken
let deployer
let executor
let user1
let user2

describe('Digital10kToken', function () {
  beforeEach(async function () {
    ;[deployer, executor, user1, user2] = await ethers.getSigners()

    Digital10kToken = await ethers.getContractFactory('Digital10kToken')
    digital10kToken = await Digital10kToken.deploy()
    await digital10kToken.deployed()
  })

  it('Should have the correct name and symbol', async function () {
    expect(await digital10kToken.name()).to.equal('Digital10kToken')
    expect(await digital10kToken.symbol()).to.equal('DIGI')
  })

  it('Should onlyOwner to call function', async function () {
    const revert = 'Ownable: caller is not the owner'
    await expect(digital10kToken.connect(user1).mint(user1.address, 1)).to.be.revertedWith(revert)
    await expect(digital10kToken.connect(user1).burn(user1.address, 1)).to.be.revertedWith(revert)
  })

  it('Should transfer', async function () {
    // mint
    const amount = await parseTokenUnit(10000)
    await digital10kToken.connect(deployer).mint(user1.address, amount)

    const user1Balance = await digital10kToken.balanceOf(user1.address)
    const user2Balance = await digital10kToken.balanceOf(user2.address)
    expect(user1Balance).to.equal(amount)
    expect(user2Balance).to.equal(0)

    // transfer
    await digital10kToken.connect(user1).transfer(user2.address, amount)

    // check transfered
    const user1BalanceAfter = await digital10kToken.balanceOf(user1.address)
    const user2BalanceAfter = await digital10kToken.balanceOf(user2.address)
    expect(user1BalanceAfter).to.equal(0)
    expect(user2BalanceAfter).to.equal(amount)
  })

  it('Should transferFrom', async function () {
    // mint
    const amount = await parseTokenUnit(10000)
    await digital10kToken.connect(deployer).mint(user1.address, amount)

    const user1Balance = await digital10kToken.balanceOf(user1.address)
    const user2Balance = await digital10kToken.balanceOf(user2.address)
    expect(user1Balance).to.equal(amount)
    expect(user2Balance).to.equal(0)

    // approve
    await digital10kToken.connect(user1).approve(user2.address, amount)

    // check allowance
    const user1AllowanceUser2 = await digital10kToken.allowance(user1.address, user2.address)
    expect(user1AllowanceUser2).to.equal(amount)

    // transferFrom
    await digital10kToken.connect(user2).transferFrom(user1.address, user2.address, amount)

    // check transfered
    const user1BalanceAfter = await digital10kToken.balanceOf(user1.address)
    const user2BalanceAfter = await digital10kToken.balanceOf(user2.address)
    expect(user1BalanceAfter).to.equal(0)
    expect(user2BalanceAfter).to.equal(amount)

    // check allowance
    const user1AllowanceUser2After = await digital10kToken.allowance(user1.address, user2.address)
    expect(user1AllowanceUser2After).to.equal(0)
  })

  it('Should 🔑 transferWithPermit', async function () {
    // mint
    const amount = await parseTokenUnit(10000)
    await digital10kToken.connect(deployer).mint(user1.address, amount)

    const user1Balance = await digital10kToken.balanceOf(user1.address)
    const user2Balance = await digital10kToken.balanceOf(user2.address)
    expect(user1Balance).to.equal(amount)
    expect(user2Balance).to.equal(0)

    const user1GasBalance = await ethers.provider.getBalance(user1.address)
    const executorGasBalance = await ethers.provider.getBalance(executor.address)
    const user1Nonces = await digital10kToken.nonces(user1.address)
    const user2Nonces = await digital10kToken.nonces(user2.address)
    const executor2Nonces = await digital10kToken.nonces(executor.address)

    // make parameters
    const deadline = getTimestampInSeconds() + 365 * 24 * 60 * 60 // 365 days expired
    const [domain, types, values] = await makePermitParams(user1.address, user2.address, amount, deadline)

    // sign the Permit type data with the user1's private key
    const signature = await user1._signTypedData(domain, types, values)
    
    // split the signature into its components
    const sig = ethers.utils.splitSignature(signature)

    // verify the Permit type data with the signature
    const recovered = ethers.utils.verifyTypedData(domain, types, values, sig)
    expect(recovered).to.equal(user1.address)

    // transferWithPermit from user1 to user2, send tx by executor
    const tx = await digital10kToken.connect(executor).transferWithPermit(user1.address, user2.address, amount, deadline, sig.v, sig.r, sig.s)
    const receipt = await tx.wait()
    const gasSpent = receipt.gasUsed * receipt.effectiveGasPrice

    // check transfered
    const user1BalanceAfter = await digital10kToken.balanceOf(user1.address)
    const user2BalanceAfter = await digital10kToken.balanceOf(user2.address)
    expect(user1BalanceAfter).to.equal(0)
    expect(user2BalanceAfter).to.equal(amount)

    // check user1 gas fee
    const user1GasBalanceAfter = await ethers.provider.getBalance(user1.address)
    const executorGasBalanceAfter = await ethers.provider.getBalance(executor.address)
    expect(user1GasBalanceAfter).to.equal(user1GasBalance)
    expect(executorGasBalanceAfter).to.equal(executorGasBalance.sub(gasSpent))

    // check nonces
    const user1NoncesAfter = await digital10kToken.nonces(user1.address)
    const user2NoncesAfter = await digital10kToken.nonces(user2.address)
    const executor2NoncesAfter = await digital10kToken.nonces(executor.address)
    expect(user1NoncesAfter).to.equal(user1Nonces.add(1))
    expect(user2NoncesAfter).to.equal(user2Nonces)
    expect(executor2NoncesAfter).to.equal(executor2Nonces)

    // check allowance
    const user1AllowanceUser2 = await digital10kToken.allowance(user1.address, user2.address)
    const user2AllowanceUser1 = await digital10kToken.allowance(user2.address, user1.address)
    expect(user1AllowanceUser2).to.equal(0)
    expect(user2AllowanceUser1).to.equal(0)
  })

  it('Should 🔑 transferWithPermit with ⏰ expired', async function () {
    // mint
    const amount = await parseTokenUnit(10000)
    await digital10kToken.connect(deployer).mint(user1.address, amount)

    // make parameters
    const deadline = getTimestampInSeconds() + 60 // 60 secs expired
    const [domain, types, values] = await makePermitParams(user1.address, user2.address, amount, deadline)

    // sign the Permit type data with the user1's private key
    const signature = await user1._signTypedData(domain, types, values)

    // split the signature into its components
    const sig = ethers.utils.splitSignature(signature)

    // verify the Permit type data with the signature
    const recovered = ethers.utils.verifyTypedData(domain, types, values, sig)
    expect(recovered).to.equal(user1.address)

    // simulate: next block time 120 sec
    await helpers.time.increase(120)

    const revert = `ERC2612ExpiredSignature(${deadline})`
    await expect(digital10kToken.connect(executor).transferWithPermit(user1.address, user2.address, amount, deadline, sig.v, sig.r, sig.s)).to.be.revertedWith(revert)
  })
})

async function makePermitParams(ownerAddress, receiverAddress, amount, deadline) {
  // get the current nonce for owner
  const nonces = await digital10kToken.nonces(ownerAddress)

  // set the domain parameters
  const domain = {
    name: await digital10kToken.name(),
    version: '1',
    chainId: (await ethers.provider.getNetwork()).chainId,
    verifyingContract: digital10kToken.address,
  }

  // set the Permit type parameters
  const types = {
    Permit: [
      {
        name: 'owner',
        type: 'address',
      },
      {
        name: 'receiver',
        type: 'address',
      },
      {
        name: 'value',
        type: 'uint256',
      },
      {
        name: 'nonce',
        type: 'uint256',
      },
      {
        name: 'deadline',
        type: 'uint256',
      },
    ],
  }

  // set the Permit type values
  const values = {
    owner: ownerAddress,
    receiver: receiverAddress,
    value: amount,
    nonce: nonces,
    deadline: deadline,
  }

  return [domain, types, values]
}

async function parseTokenUnit(amount) {
  const decimals = await digital10kToken.decimals()
  return BigNumber.from(amount).mul(BigNumber.from(10).pow(decimals))
}

function getTimestampInSeconds() {
  return Math.floor(Date.now() / 1000)
}
