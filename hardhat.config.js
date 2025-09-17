require("@nomicfoundation/hardhat-toolbox");

const PRIVATE_KEY = process.env.PRIVATE_KEY || "0x0000000000000000000000000000000000000000000000000000000000000001";
const MONAD_RPC_URL = process.env.MONAD_RPC_URL || "https://rpc.monad.com";

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.19",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200
      }
    }
  },
  networks: {
    hardhat: {
      chainId: 31337
    },
    monad: {
      url: MONAD_RPC_URL,
      accounts: [PRIVATE_KEY],
      chainId: 9000, // Monad chain ID
      gasPrice: "auto"
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 31337
    }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD"
  },
  etherscan: {
    // Add Monad explorer API key when available
    apiKey: process.env.ETHERSCAN_API_KEY
  }
};