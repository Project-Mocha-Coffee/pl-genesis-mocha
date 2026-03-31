Project Mocha - TreeFarm Smart Contracts (Base-Only Wrapper)

This directory provides a Base-only wrapper around the main smart-contracts-erc4626 project.

Key points:
- All actual Solidity contracts, node_modules, and Hardhat plugins live one level up in ../
- This folder gives you a clean, Base-focused entrypoint so you don't see Scroll-related scripts.

Usage:
- cd smart-contracts-erc4626/smart-contracts-erc4626-scroll-base
- npm run compile:base
- npm run deploy:base
- npm run deploy:base:sepolia

