use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct ProposalAccount {
    pub pot: Pubkey,
    pub proposal_id: u64,
    pub proposer: Pubkey,
    pub proposal_type: ProposalType,
    #[max_len(256)]
    pub description: String,
    pub status: ProposalStatus,
    pub yes_shares: u64,
    pub no_shares: u64,
    pub total_shares_snapshot: u64,
    pub created_at: i64,
    pub resolved_at: i64,
    /// Timestamp when proposal transitioned to Passed — used for timelock enforcement.
    /// 0 if not yet passed.
    pub passed_at: i64,
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace, PartialEq)]
pub enum ProposalType {
    Swap {
        from_mint: Pubkey,
        to_mint: Pubkey,
        amount_in: u64,
        min_amount_out: u64,
    },
    Withdraw {
        beneficiary: Pubkey,
        amount: u64,
    },
    ChangeSettings {
        new_trade_level: u8,
        new_withdraw_level: u8,
    },
    ChangeYield {
        new_strategy: u8,
    },
    AddMember {
        wallet: Pubkey,
    },
    RemoveMember {
        wallet: Pubkey,
    },
    SetAgent {
        agent: Pubkey,
        max_trade_bps: u16,
    },
    TransferFunds {
        to: Pubkey,
        amount: u64,
        #[max_len(64)]
        purpose: String,
    },
    UpdateRiskConfig {
        max_trade_size_bps: u16,
        max_members: u16,
    },
    TokenizePot {
        max_supply: u64,
    },
    DepositToYield {
        amount: u64,
        protocol: u8,
    },
    WithdrawFromYield {
        amount: u64,
        protocol: u8,
    },
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace, PartialEq, Debug)]
pub enum ProposalStatus {
    Active,
    Passed,
    Rejected,
    Executed,
    Expired,
}

impl ProposalAccount {
    pub fn check_resolution(
        &self,
        required_bps: u16,
        vote_timeout: i64,
        now: i64,
    ) -> Option<ProposalStatus> {
        if self.status != ProposalStatus::Active {
            return None;
        }
        if self.total_shares_snapshot == 0 {
            return Some(ProposalStatus::Expired);
        }

        let total_voted = self.yes_shares + self.no_shares;

        if now > self.created_at + vote_timeout {
            if total_voted > 0 {
                let yes_bps = (self.yes_shares as u128)
                    .saturating_mul(10000)
                    .checked_div(self.total_shares_snapshot as u128)
                    .unwrap_or(0) as u16;
                if yes_bps >= required_bps {
                    return Some(ProposalStatus::Passed);
                }
            }
            return Some(ProposalStatus::Expired);
        }

        if total_voted >= self.total_shares_snapshot {
            let yes_bps = (self.yes_shares as u128)
                .saturating_mul(10000)
                .checked_div(self.total_shares_snapshot as u128)
                .unwrap_or(0) as u16;
            return Some(if yes_bps >= required_bps {
                ProposalStatus::Passed
            } else {
                ProposalStatus::Rejected
            });
        }

        let yes_bps = (self.yes_shares as u128)
            .saturating_mul(10000)
            .checked_div(self.total_shares_snapshot as u128)
            .unwrap_or(0) as u16;
        if yes_bps >= required_bps {
            return Some(ProposalStatus::Passed);
        }

        let max_possible_yes = self.yes_shares
            .saturating_add(self.total_shares_snapshot.saturating_sub(total_voted));
        let max_yes_bps = (max_possible_yes as u128)
            .saturating_mul(10000)
            .checked_div(self.total_shares_snapshot as u128)
            .unwrap_or(0) as u16;
        if max_yes_bps < required_bps {
            return Some(ProposalStatus::Rejected);
        }

        None
    }
}
