// Starknet ICO: swap ETH for MBT in one flow. Contract must be set as minter on MBT.

use starknet::ContractAddress;

#[starknet::interface]
trait IStarknetICO<TContractState> {
    fn get_eth_price_usd(self: @TContractState) -> u256;
    fn get_mbt_price_usd(self: @TContractState) -> u256;
    fn get_mbt_for_eth(self: @TContractState, amount_eth: u256) -> u256;
    fn get_min_purchase_eth(self: @TContractState) -> u256;
    fn get_treasury(self: @TContractState) -> ContractAddress;
    fn is_paused(self: @TContractState) -> bool;
    fn buy_with_eth(
        ref self: TContractState,
        beneficiary: ContractAddress,
        amount_eth: u256,
        min_mbt: u256,
    );
    fn set_eth_price_usd(ref self: TContractState, price_usd: u256);
    fn set_paused(ref self: TContractState, paused: bool);
    fn set_treasury(ref self: TContractState, treasury: ContractAddress);
}

#[starknet::contract]
mod StarknetICO {
    use super::{ContractAddress, IStarknetICO};
    use starknet::storage::{StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess, StoragePointerWriteAccess};
    use openzeppelin_token::erc20::interface::{IERC20DispatcherTrait, IERC20Dispatcher};
    use project_mocha_starknet::mbt_token::IMBTTokenDispatcherTrait;
    use project_mocha_starknet::mbt_token::IMBTTokenDispatcher;

    #[storage]
    struct Storage {
        owner: ContractAddress,
        eth_token: ContractAddress,
        mbt_token: ContractAddress,
        treasury: ContractAddress,
        eth_price_usd: u256,   // USD per 1 ETH, 8 decimals (e.g. 2500 * 10^8)
        mbt_price_usd: u256,  // USD per 1 MBT, 8 decimals (25 * 10^8)
        min_purchase_eth: u256,
        paused: bool,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        TokensPurchased: TokensPurchased,
        EthPriceUpdated: EthPriceUpdated,
        Paused: Paused,
        TreasuryUpdated: TreasuryUpdated,
    }

    #[derive(Drop, starknet::Event)]
    struct TokensPurchased {
        buyer: ContractAddress,
        beneficiary: ContractAddress,
        eth_amount: u256,
        mbt_amount: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct EthPriceUpdated {
        price_usd: u256,
    }

    #[derive(Drop, starknet::Event)]
    struct Paused {
        paused: bool,
    }

    #[derive(Drop, starknet::Event)]
    struct TreasuryUpdated {
        treasury: ContractAddress,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        owner: ContractAddress,
        eth_token: ContractAddress,
        mbt_token: ContractAddress,
        treasury: ContractAddress,
        initial_eth_price_usd: u256,
        min_purchase_eth: u256,
    ) {
        self.owner.write(owner);
        self.eth_token.write(eth_token);
        self.mbt_token.write(mbt_token);
        self.treasury.write(treasury);
        self.eth_price_usd.write(initial_eth_price_usd);
        // 25 * 10^8 = 2500000000
        self.mbt_price_usd.write(2500000000_u256);
        self.min_purchase_eth.write(min_purchase_eth);
        self.paused.write(false);
    }

    #[abi(embed_v0)]
    impl StarknetICOImpl of IStarknetICO<ContractState> {
        fn get_eth_price_usd(self: @ContractState) -> u256 {
            self.eth_price_usd.read()
        }

        fn get_mbt_price_usd(self: @ContractState) -> u256 {
            self.mbt_price_usd.read()
        }

        fn get_mbt_for_eth(self: @ContractState, amount_eth: u256) -> u256 {
            let eth_price = self.eth_price_usd.read();
            let mbt_price = self.mbt_price_usd.read();
            if mbt_price == 0_u256 {
                return 0_u256;
            }
            (amount_eth * eth_price) / mbt_price
        }

        fn get_min_purchase_eth(self: @ContractState) -> u256 {
            self.min_purchase_eth.read()
        }

        fn get_treasury(self: @ContractState) -> ContractAddress {
            self.treasury.read()
        }

        fn is_paused(self: @ContractState) -> bool {
            self.paused.read()
        }

        fn buy_with_eth(
            ref self: ContractState,
            beneficiary: ContractAddress,
            amount_eth: u256,
            min_mbt: u256,
        ) {
            assert(!self.paused.read(), 'PAUSED');
            assert(amount_eth >= self.min_purchase_eth.read(), 'MIN_PURCHASE');
            let caller = starknet::get_caller_address();
            let treasury = self.treasury.read();
            let eth_token_addr = self.eth_token.read();
            let mbt_token_addr = self.mbt_token.read();

            let mut eth = IERC20Dispatcher { contract_address: eth_token_addr };
            eth.transfer_from(caller, treasury, amount_eth);

            let mbt_amount = self.get_mbt_for_eth(amount_eth);
            assert(mbt_amount >= min_mbt, 'SLIPPAGE');

            let mut mbt = IMBTTokenDispatcher { contract_address: mbt_token_addr };
            mbt.mint(beneficiary, mbt_amount);

            self.emit(Event::TokensPurchased(TokensPurchased {
                buyer: caller,
                beneficiary,
                eth_amount: amount_eth,
                mbt_amount,
            }));
        }

        fn set_eth_price_usd(ref self: ContractState, price_usd: u256) {
            let caller = starknet::get_caller_address();
            assert(caller == self.owner.read(), 'ONLY_OWNER');
            self.eth_price_usd.write(price_usd);
            self.emit(Event::EthPriceUpdated(EthPriceUpdated { price_usd }));
        }

        fn set_paused(ref self: ContractState, paused: bool) {
            let caller = starknet::get_caller_address();
            assert(caller == self.owner.read(), 'ONLY_OWNER');
            self.paused.write(paused);
            self.emit(Event::Paused(Paused { paused }));
        }

        fn set_treasury(ref self: ContractState, treasury: ContractAddress) {
            let caller = starknet::get_caller_address();
            assert(caller == self.owner.read(), 'ONLY_OWNER');
            self.treasury.write(treasury);
            self.emit(Event::TreasuryUpdated(TreasuryUpdated { treasury }));
        }
    }
}
