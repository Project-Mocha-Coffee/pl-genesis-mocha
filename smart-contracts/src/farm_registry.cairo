use starknet::ContractAddress;

#[starknet::interface]
trait IFarmRegistry<TContractState> {
    fn owner(self: @TContractState) -> ContractAddress;
    fn farm_exists(self: @TContractState, id: u128) -> bool;
    fn get_farm_total_trees(self: @TContractState, id: u128) -> u128;
    fn get_farm_allocated_trees(self: @TContractState, id: u128) -> u128;
    fn get_farm_apy_bps(self: @TContractState, id: u128) -> u16;
    fn get_farm_maturity_years(self: @TContractState, id: u128) -> u8;
    fn get_farm_is_active(self: @TContractState, id: u128) -> bool;
    fn get_user_position(self: @TContractState, farm_id: u128, investor: ContractAddress) -> u256;
    fn total_investors(self: @TContractState) -> u64;
    fn register_farm(
        ref self: TContractState,
        id: u128,
        total_trees: u128,
        apy_bps: u16,
        maturity_years: u8,
    );
    fn set_farm_active(ref self: TContractState, id: u128, is_active: bool);
    fn record_investment(
        ref self: TContractState,
        farm_id: u128,
        investor: ContractAddress,
        tree_share_delta: u256,
        increase_allocated_trees_by: u128,
    );
}

#[starknet::contract]
mod FarmRegistry {
    use super::{ContractAddress, IFarmRegistry};
    use starknet::storage::{Map, StorageMapReadAccess, StorageMapWriteAccess, StoragePointerReadAccess, StoragePointerWriteAccess};

    #[storage]
    struct Storage {
        owner: ContractAddress,
        // Flattened farm fields — avoids complex struct Store requirements
        farm_exists: Map<u128, bool>,
        farm_total_trees: Map<u128, u128>,
        farm_allocated_trees: Map<u128, u128>,
        farm_apy_bps: Map<u128, u16>,
        farm_maturity_years: Map<u128, u8>,
        farm_is_active: Map<u128, bool>,
        // (investor, farm_id) → tree-share units (18-decimal scaled)
        user_positions: Map<(ContractAddress, u128), u256>,
        total_investors: u64,
    }

    #[event]
    #[derive(Drop, starknet::Event)]
    enum Event {
        FarmRegistered: FarmRegistered,
        FarmStatusUpdated: FarmStatusUpdated,
        PositionUpdated: PositionUpdated,
    }

    #[derive(Drop, starknet::Event)]
    struct FarmRegistered {
        id: u128,
        total_trees: u128,
        apy_bps: u16,
        maturity_years: u8,
    }

    #[derive(Drop, starknet::Event)]
    struct FarmStatusUpdated {
        id: u128,
        is_active: bool,
    }

    #[derive(Drop, starknet::Event)]
    struct PositionUpdated {
        farm_id: u128,
        investor: ContractAddress,
        tree_share: u256,
    }

    #[constructor]
    fn constructor(ref self: ContractState, owner: ContractAddress) {
        self.owner.write(owner);
    }

    #[abi(embed_v0)]
    impl FarmRegistryImpl of IFarmRegistry<ContractState> {
        fn owner(self: @ContractState) -> ContractAddress {
            self.owner.read()
        }

        fn farm_exists(self: @ContractState, id: u128) -> bool {
            self.farm_exists.read(id)
        }

        fn get_farm_total_trees(self: @ContractState, id: u128) -> u128 {
            self.farm_total_trees.read(id)
        }

        fn get_farm_allocated_trees(self: @ContractState, id: u128) -> u128 {
            self.farm_allocated_trees.read(id)
        }

        fn get_farm_apy_bps(self: @ContractState, id: u128) -> u16 {
            self.farm_apy_bps.read(id)
        }

        fn get_farm_maturity_years(self: @ContractState, id: u128) -> u8 {
            self.farm_maturity_years.read(id)
        }

        fn get_farm_is_active(self: @ContractState, id: u128) -> bool {
            self.farm_is_active.read(id)
        }

        fn get_user_position(
            self: @ContractState, farm_id: u128, investor: ContractAddress,
        ) -> u256 {
            self.user_positions.read((investor, farm_id))
        }

        fn total_investors(self: @ContractState) -> u64 {
            self.total_investors.read()
        }

        fn register_farm(
            ref self: ContractState,
            id: u128,
            total_trees: u128,
            apy_bps: u16,
            maturity_years: u8,
        ) {
            let caller = starknet::get_caller_address();
            assert(caller == self.owner.read(), 'ONLY_OWNER');
            assert(!self.farm_exists.read(id), 'FARM_EXISTS');

            self.farm_exists.write(id, true);
            self.farm_total_trees.write(id, total_trees);
            self.farm_allocated_trees.write(id, 0_u128);
            self.farm_apy_bps.write(id, apy_bps);
            self.farm_maturity_years.write(id, maturity_years);
            self.farm_is_active.write(id, true);

            self.emit(Event::FarmRegistered(FarmRegistered { id, total_trees, apy_bps, maturity_years }));
        }

        fn set_farm_active(ref self: ContractState, id: u128, is_active: bool) {
            let caller = starknet::get_caller_address();
            assert(caller == self.owner.read(), 'ONLY_OWNER');
            assert(self.farm_exists.read(id), 'FARM_NOT_FOUND');

            self.farm_is_active.write(id, is_active);
            self.emit(Event::FarmStatusUpdated(FarmStatusUpdated { id, is_active }));
        }

        fn record_investment(
            ref self: ContractState,
            farm_id: u128,
            investor: ContractAddress,
            tree_share_delta: u256,
            increase_allocated_trees_by: u128,
        ) {
            let caller = starknet::get_caller_address();
            assert(caller == self.owner.read(), 'ONLY_OWNER');
            assert(self.farm_exists.read(farm_id), 'FARM_NOT_FOUND');

            let allocated = self.farm_allocated_trees.read(farm_id);
            let total = self.farm_total_trees.read(farm_id);
            let new_allocated = allocated + increase_allocated_trees_by;
            assert(new_allocated <= total, 'OVER_ALLOCATED');
            self.farm_allocated_trees.write(farm_id, new_allocated);

            let current = self.user_positions.read((investor, farm_id));
            let new_value = current + tree_share_delta;
            self.user_positions.write((investor, farm_id), new_value);

            if current == 0_u256 && new_value > 0_u256 {
                let count = self.total_investors.read();
                self.total_investors.write(count + 1_u64);
            }

            self.emit(Event::PositionUpdated(PositionUpdated { farm_id, investor, tree_share: new_value }));
        }
    }
}
