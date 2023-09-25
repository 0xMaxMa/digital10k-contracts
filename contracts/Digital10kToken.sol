// SPDX-License-Identifier: MIT

pragma solidity ^0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "./ERC20PermitTransfer.sol";

contract Digital10kToken is ERC20, Ownable, ERC20Permit {
    constructor() ERC20("Digital10kToken", "DIGI") ERC20Permit("Digital10kToken") {
        _mint(msg.sender, 10000 * 10 ** decimals());
    }

    function mint(address to, uint256 amount) external onlyOwner {
        _mint(to, amount);
    }

    function burn(address from, uint256 amount) external onlyOwner {
        _burn(from, amount);
    }

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

    // Additional implement some logic
    // function _beforeTokenTransfer(address from, address to, uint256 amount) internal virtual {}
}