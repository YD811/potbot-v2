use anchor_lang::prelude::*;

#[account]
#[derive(InitSpace)]
pub struct ProposalAccount {
    /// The POT this proposal belongs to
    pub pot: Pubkey,
    /// Proposal ID (sequential per POT)
    pub proposal_id: u64,
    /// Who created the proposal
    pub proposer: Pubkey,
    /// Type of proposal
    pub proposal_type: ProposalType,
    /// Description
    #[max_len(256)]
    pub description: String,
    /// Current status
    pub status: ProposalStatus,
    /// Total shares that voted YES
    pub yes_shares: u64,
    /// Total shares that voted NO
    pub no_shares: u64,
    /// Total shares at time of creation (snapshot for quorum)
    pub total_shares_snapshot: u64,
    /// Creation timestamp
    pub created_at: i64,
    /// Resolution timestamp
    pub resolved_at: i64,
    /// Bump seed
    pub bump: u8,
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace, PartialEq)]
pub enum ProposalType {
    /// Swap tokens via Jupiter
    Swap {
        from_mint: Pubkey,
        to_mint: Pubkey,
        amount_in: u64,
        min_amount_out: u64,
    },
    /// Withdraw from vault to a beneficiary (governance-controlled)
    Withdraw {
        beneficiary: Pubkey,
        amount: u64,
    },
    /// Change governance levels for trades and withdrawals
    ChangeSettings {
        new_trade_level: u8,
        new_withdraw_level: u8,
    },
    /// Change yield strategy
    ChangeYield {
        new_strategy: u8,
    },
    /// Invite a wallet to join a private pot
    AddMember {
        wallet: Pubkey,
    },
    /// Remove a member (they keep their shares but can\'t vote/propose)
    RemoveMember {
        wallet: Pubkey,
    },
    /// Set or update the AI agent wallet and its trade cap
    SetAgent {
        agent: Pubkey,
        max_trade_bps: u16,
    },
    /// Transfer funds from vault for operational purposes
    TransferFunds {
        to: Pubkey,
        amount: u64,
        #[max_len(64)]
        purpose: String,
    },
    /// Update max trade size risk limit
    UpdateRiskConfig {
        max_trade_size_bps: u16,
        max_members: u16,
    },
    /// Tokenize the pot into an SPL token (ETF-like, one-way)
    TokenizePot {
        max_supply: u64,
    },
    /// Deposit idle SOL to a yield protocol (Phase 2: Kamino/Drift CPI)
    DepositToYield {
        amount: u64,
        protocol: u8, // 0=Kamino, 1=Drift, 2=MarginFi
    },
    /// Withdraw from yield protocol back to vault (Phase 2)
    WithdrawFromYield {
        amount: u64,
        protocol: u8,
    },
}

#[derive(AnchorSerialize, AnchorDeserialize, Clone, InitSpace, PartialEq)]
pub enum ProposalStatus {
    Active,
    Passed,
    Rejected,
    Executed,
    Expired,
}

impl ProposalAccount {
    /// Check if the proposal has reached required approval
    pub fn check_resolution(
        &self,
        required_bps: u16,
        vote_timeout: i64,
        now: i64,
    ) -> Option<ProposalStatus> {
        if self.status != ProposalStatus::Active {
            return None;
        }

        // Guard: can\'t divide by zero
        if self.total_shares_snapshot == 0 {
            return Some(ProposalStatus::Expired);
        }

        let total_voted = self.yes_shares + self.no_shares;

        // Check if expired
        if now > self.created_at + vote_timeout {
            if total_voted > 0 {
                let yes_bps = (self.yes_shares as u128)
                    .checked_mul(10000)
                    .unwrap_or(0)
                    .checked_div(self.total_shares_snapshot as u128)
                    .unwrap_or(0) as u16;
                if yes_bps >= required_bps {
                    return Some(ProposalStatus::Passed);
                }
            }
            return Some(ProposalStatus::Expired);
        }

        // Check if everyone has voted
        if total_voted >= self.total_shares_snapshot {
            let yes_bps = (self.yes_shares as u128)
                .checked_mul(10000)
                .unwrap_or(0)
                .checked_div(self.total_shares_snapshot as u128)
                .unwrap_or(0) as u16;
            return Some(if yes_bps >= required_bps {
                ProposalStatus::Passed
            } else {
                ProposalStatus::Rejected
            });
        }

        // Check early YES resolution
        let yes_bps = (self.yes_shares as u128)
            .checked_mul(10000)
            .unwrap_or(0)
            .checked_div(self.total_shares_snapshot as u128)
            .unwrap_or(0) as u16;
        if yes_bps >= required_bps {
            return Some(ProposalStatus::Passed);
        }

        // Check mathematically impossible (even if all remaining votes are YES, still can\'t pass)
        let max_possible_yes = self.yes_shares.saturating_add(
            self.total_shares_snapshot.saturating_sub(total_voted)
        );
        let max_yes_bps = (max_possible_yes as u128)
            .checked_mul(10000)
            .unwrap_or(0)
            .checked_div(self.total_shares_snapshot as u128)
            .unwrap_or(0) as u16;
        if max_yes_bps < required_bps {
            return Some(ProposalStatus::Rejected);
        }

        None
    }
}
