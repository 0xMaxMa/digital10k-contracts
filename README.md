# 💸 Digital10K-Contract
The contract is simple and based on the EIP-712 standard which includes a customized transferWithPermit function. That enables users to perform gasless transfers by utilizing a signed permit signature. The transaction is then executed by a Relayer to transfer the token from the owner to the receiver.

Read more EIP-712: [https://eips.ethereum.org/EIPS/eip-712](https://eips.ethereum.org/EIPS/eip-712)

## Implements

Added `transferWithPermit` function.
```javascript
function transferWithPermit(
    address owner,
    address receiver,
    uint256 value,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
) external {
    permit(owner, receiver, value, deadline, v, r, s);
}
```

On abstract `ERC20Permit`, the `permit` function changes `_approve` to `_transfer` to reduce steps to directly transfer.

```javascript
function permit(
    address owner,
    address receiver,
    uint256 value,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
) public virtual {
    ...

    // change _approve to _transfer to direct transfer to receiver
    _transfer(owner, receiver, value);
}
```

Use PERMIT_TYPEHASH with:
```javascript
bytes32 private constant PERMIT_TYPEHASH = keccak256("Permit(address owner,address receiver,uint256 value,uint256 nonce,uint256 deadline)");
```

## Local Development
Require node version >= 16.20

Local Setup Steps:
1. git clone https://github.com/0xMaxMa/digital10k-contracts.git
1. Install dependencies: `yarn install` 
1. Compile Contracts: `yarn compile`
1. Run Tests: `yarn test`

## Deployed Contracts

### Sepolia Testnet
Digital10kToken: [0xFF2F0676e588bdCA786eBF25d55362d4488Fad64](https://sepolia.etherscan.io/address/0xFF2F0676e588bdCA786eBF25d55362d4488Fad64)
