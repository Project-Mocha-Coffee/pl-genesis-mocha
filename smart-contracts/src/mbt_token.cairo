use starknet::ContractAddress;

#[starknet::interface]
trait IMBTToken<TContractState> {
    fn owner(self: @TContractState) -> ContractAddress;
    fn is_minter(self: @TContractState, account: ContractAddress) -> bool;
    fn set_minter(ref self: TContractState, account: ContractAddress, is_minter: bool);
    fn mint(ref self: TContractState, recipient: ContractAddress, amount: u256);
}

#[starknet::contract]
mod MBTToken {
    use super::{ContractAddress, IMBTToken};
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess, StoragePointerWriteAccess};
    use openzeppelin_token::erc20::{ERC20Component, ERC20HooksEmptyImpl};

    component!(path: ERC20Component, storage: erc20, event: ERC20Event);

    #[abi(embed_v0)]
    impl ERC20MixinImpl = ERC20Component::ERC20MixinImpl<ContractState>;
    impl ERC20InternalImpl = ERC20Component::InternalImpl<ContractState>;

    #[storage]
    struct Storage {
        #[substorage(v0)]
        erc20: ERC20Component::Storage,
        owner: ContractAddress,
        minters: Map<ContractAddress, bool>,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        #[flat]
        ERC20Event: ERC20Component::Event,
        MinterUpdated: MinterUpdated,
    }

    #[derive(Drop, starknet::Event)]
    struct MinterUpdated {
        account: ContractAddress,
        is_minter: bool,
    }

    #[constructor]
    fn constructor(
        ref self: ContractState,
        name: ByteArray,
        symbol: ByteArray,
        initial_owner: ContractAddress,
    ) {
        self.erc20.initializer(name, symbol);
        self.owner.write(initial_owner);
        self.minters.write(initial_owner, true);
    }

    #[abi(embed_v0)]
    impl MBTImpl of IMBTToken<ContractState> {
        fn owner(self: @ContractState) -> ContractAddress {
            self.owner.read()
        }

        fn is_minter(self: @ContractState, account: ContractAddress) -> bool {
            self.minters.read(account)
        }

        fn set_minter(ref self: ContractState, account: ContractAddress, is_minter: bool) {
            let caller = starknet::get_caller_address();
            assert(caller == self.owner.read(), 'ONLY_OWNER');
            self.minters.write(account, is_minter);
            self.emit(Event::MinterUpdated(MinterUpdated { account, is_minter }));
        }

        fn mint(ref self: ContractState, recipient: ContractAddress, amount: u256) {
            let caller = starknet::get_caller_address();
            assert(self.minters.read(caller), 'NOT_MINTER');
            self.erc20.mint(recipient, amount);
        }
    }
}
