const { ethers, network } = require('hardhat')
const { contractAt, getContractAddress } = require('./lib/deploy')
const axios = require('axios')

const relayerRpc = network.config.url
let digital10kToken

async function main() {
  // config
  const [owner] = await ethers.getSigners()
  const receiver = { address: '0xb823aC873CFe6533B04e025Db4e20FD11D13a473' }
  const amount = '2000'

  // contract
  const digital10kTokenAddress = getContractAddress('Digital10kToken')
  digital10kToken = await contractAt('Digital10kToken', digital10kTokenAddress, owner)

  console.log(`### 💸 transferWithPermit ###`)
  console.log(`use relayer rpc: ${relayerRpc}`)

  // get balance before
  const ownerBalance = await digital10kToken.balanceOf(owner.address)
  const receiverBalance = await digital10kToken.balanceOf(receiver.address)
  console.log(`\n✅ Before balance`)
  console.log(`\towner balance: ${await fromTokenUnit(ownerBalance)}`)
  console.log(`\treceiver balance: ${await fromTokenUnit(receiverBalance)}`)

  // make parameters
  const deadline = getTimestampInSeconds() + 91 * 24 * 60 * 60 // 91 days expired
  const [domain, types, values] = await makePermitParams(owner.address, receiver.address, await parseTokenUnit(amount), deadline)

  // sign the Permit type data with private key
  const signature = await owner._signTypedData(domain, types, values)

  console.log(`\n✅ Send transferWithPermit`)
  console.log(`\towner: ${owner.address}`)
  console.log(`\treceiver: ${receiver.address}`)
  console.log(`\tamount: ${amount}`)
  console.log(`\tsignature: ${signature}`)

  // send
  const tx = await sendTransferWithPermit(values, signature)
  console.log(`\tpending tx: ${tx}`)

  await sleep(1000)
  const ownerUnrealizeBalance = await digital10kToken.balanceOf(owner.address)
  const receiverUnrealizeBalance = await digital10kToken.balanceOf(receiver.address)
  console.log(`\n✅ Unrealize balance`)
  console.log(`\towner balance: ${await fromTokenUnit(ownerUnrealizeBalance)}`)
  console.log(`\treceiver balance: ${await fromTokenUnit(receiverUnrealizeBalance)}`)

  process.stdout.write('\n✅ Wait for tx confirmation\n\t')
  console.time('finalized time')
  while (true) {
    try {
      const receipt = await ethers.provider.getTransactionReceipt(tx)
      if (receipt) {
        console.timeEnd('finalized time')
        console.log('\ttransaction confirmation on block:', receipt.blockNumber)
        console.log('\ttransaction status:', receipt.status == 1 ? 'success' : 'fail')
        break
      }
    } catch (error) {
      console.error('\n\tError getting transaction receipt:', error)
    }

    process.stdout.write('.')
    await sleep(500)
  }

  // wait for balance on-chain finalized
  await sleep(3 * 1000)
  const ownerRealizeBalance = await digital10kToken.balanceOf(owner.address)
  const receiverRealizeBalance = await digital10kToken.balanceOf(receiver.address)
  console.log(`\n✅ Realize balance`)
  console.log(`\towner balance: ${await fromTokenUnit(ownerRealizeBalance)}`)
  console.log(`\treceiver balance: ${await fromTokenUnit(receiverRealizeBalance)}`)
}

async function sendTransferWithPermit(values, signature) {
  const data = {
    jsonrpc: '2.0',
    method: 'delegate_permit',
    params: [
      {
        owner: values.owner,
        receiver: values.receiver,
        value: values.value.toString(),
        nonce: values.nonce.toString(),
        deadline: values.deadline.toString(),
        signature: signature,
      },
      'latest',
    ],
    id: 1,
  }

  return new Promise((resolve) =>
    axios
      .post(relayerRpc, data, {
        headers: {
          'Content-Type': 'application/json',
        },
      })
      .then((response) => {
        if (response.data.error) {
          console.log('\nError:', response.data.error.message)
          // reject, return tx with null to try try send again
          resolve(null)
        }
        resolve(response.data.result)
      })
      .catch((error) => {
        console.error('\nError:', error)
      })
  )
}

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
  return ethers.BigNumber.from(amount).mul(ethers.BigNumber.from(10).pow(decimals))
}

async function fromTokenUnit(amount) {
  const decimals = await digital10kToken.decimals()
  return ethers.BigNumber.from(amount).div(ethers.BigNumber.from(10).pow(decimals))
}

function getTimestampInSeconds() {
  return Math.floor(Date.now() / 1000)
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
