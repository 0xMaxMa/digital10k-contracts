require("dotenv").config();
require("@nomiclabs/hardhat-etherscan");
require("@nomiclabs/hardhat-waffle");
require("solidity-coverage");
require("@nomiclabs/hardhat-web3");

// This is a sample Hardhat task. To learn how to create your own go to
// https://hardhat.org/guides/create-task.html
task("accounts", "Prints the list of accounts", async (taskArgs, hre) => {
  const accounts = await hre.ethers.getSigners();

  for (const account of accounts) {
    console.log(account.address);
  }
});

// You need to export an object to set up your config
// Go to https://hardhat.org/config/ to learn more

/**
 * @type import('hardhat/config').HardhatUserConfig
 */
module.exports = {
  solidity: {
    compilers: [
      {
        version: "0.8.20",
        settings: {
          optimizer: {
            enabled: true,
          },
        },
      },
    ],
  },
  networks: {
    hardhat: {
      
    },
    sepolia: {
      url: "https://ethereum-sepolia.blockpi.network/v1/rpc/public",
      chainId: 11155111,
      gasPrice: 1 * 10**9,
      accounts: [`0x${process.env.PRIVATE_KEY}`],
    },
    relayer: {
      url: "http://localhost:8545", // permit relayer to sepolia network
      chainId: 11155111,
      gasPrice: 1 * 10**9,
      accounts: [`0x${process.env.PRIVATE_KEY}`],
    },
  },
  etherscan: {
    apiKey: {
      sepolia: "",
    },
    customChains: [{
        network: "sepolia",
        chainId: 11155111,
        urls: {
          apiURL: "https://host/api",
          browserURL: "https://sepolia.etherscan.io/"
        }
      },
    ], 
  }, 
};
