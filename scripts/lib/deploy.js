const { networkId, config } = require('../../config')
const fs = require('fs')
const path = require('path')
const network = process.env.HARDHAT_NETWORK
const filePath = path.join(__dirname, '..', '..', `.addresses-${network}.json`)
const deployedAddress = readTmpAddresses()

const contactAddress = {
  Digital10kToken: deployedAddress['Digital10kToken'],
}

function getContractAddress(name) {
  const addr = contactAddress[name]
  if (!addr) {
    throw new Error('not found ' + name + ' address')
  }

  return addr
}

async function deployContract(name, args, label, provider, options) {
  if (!label) {
    label = name
  }
  let contractFactory = await ethers.getContractFactory(name)
  if (provider) {
    contractFactory = contractFactory.connect(provider)
  }

  let contract
  if (options) {
    contract = await contractFactory.deploy(...args, options)
  } else {
    contract = await contractFactory.deploy(...args)
  }
  const argStr = args.map((i) => `"${i}"`).join(' ')
  console.info(`\n[Deploy ${name}] ${label}: ${contract.address} ${argStr}`)
  await contract.deployTransaction.wait()
  console.info('... Completed!')

  writeTmpAddresses({
    [label]: contract.address,
  })

  return contract
}

async function contractAt(name, address, provider) {
  let contractFactory = await ethers.getContractFactory(name)
  if (provider) {
    contractFactory = contractFactory.connect(provider)
  }
  return await contractFactory.attach(address)
}

function getChainId(network) {
  const chainId = networkId[network]
  if (!chainId) {
    throw new Error('Unsupported network')
  }
  return chainId
}

async function getSigner() {
  if (process.env.USE_FRAME_SIGNER == 'true') {
    try {
      const frame = new ethers.providers.JsonRpcProvider('http://127.0.0.1:1248')
      const signer = frame.getSigner()

      if (getChainId(network) !== (await signer.getChainId())) {
        throw new Error('Incorrect frame network')
      }

      console.log('🖼️ FrameSigner ChainId:', await signer.getChainId())
      console.log(`signer: ${signer.address}`)

      return signer
    } catch (e) {
      throw new Error(`getFrameSigner error: ${e.toString()}`)
    }
  } else {
    const [signer] = await hre.ethers.getSigners()
    console.log(`📝 use deployer from PRIVATE_KEY in .env`)
    console.log(`signer: ${signer.address}`)
    return signer
  }
}

function readTmpAddresses() {
  if (fs.existsSync(filePath)) {
    return JSON.parse(fs.readFileSync(filePath))
  }
  return {}
}

function writeTmpAddresses(json) {
  const tmpAddresses = Object.assign(readTmpAddresses(), json)
  fs.writeFileSync(filePath, JSON.stringify(tmpAddresses))
}

async function sendTxn(txnPromise, label) {
  const txn = await txnPromise
  console.info(`Sending ${label}...`)
  await txn.wait()
  console.info(`... Sent! ${txn.hash}`)
  return txn
}

module.exports = {
  deployedAddress,
  getContractAddress,
  deployContract,
  contractAt,
  getSigner,
  writeTmpAddresses,
  readTmpAddresses,
  sendTxn,
}
