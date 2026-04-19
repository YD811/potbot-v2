pub mod create_pot;
pub mod deposit;
pub mod withdraw;
pub mod create_proposal;
pub mod vote;
pub mod execute_proposal;
pub mod update_tamagotchi;
pub mod execute_swap;
pub mod strategy_vault;
pub mod init_token_mint;

// New premium features
pub mod tokenize_shares;
pub mod create_sns_domain;
pub mod mint_tamagotchi_nft;
pub mod update_tamagotchi_metadata;
pub mod create_private_pot;
pub mod join_private_pot;

pub use create_pot::*;
pub use deposit::*;
pub use withdraw::*;
pub use create_proposal::*;
pub use vote::*;
pub use execute_proposal::*;
pub use update_tamagotchi::*;
pub use execute_swap::*;
pub use strategy_vault::*;
pub use init_token_mint::*;
pub use tokenize_shares::*;
pub use create_sns_domain::*;
pub use mint_tamagotchi_nft::*;
pub use update_tamagotchi_metadata::*;
pub use create_private_pot::*;
pub use join_private_pot::*;