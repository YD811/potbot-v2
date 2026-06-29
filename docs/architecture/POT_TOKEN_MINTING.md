# PotBot — How a specific Pot's share token is minted

**Living doc · v0.1 · 2026-06-29 · owner: YD**
Отвечает: как именно минтится NAV/share-токен конкретного пота, кто mint authority,
какая математика долей, и точный Anchor-код для `create_pot` / `deposit` / `withdraw`.

---

## 1. Один пот = один SPL-минт

У каждого пота **свой собственный** SPL-минт, выведенный детерминированно:

```
Share Mint PDA   = PDA(["mint", pot_pubkey])          # уникален на пот
Pot PDA          = PDA(["pot", name, authority])       # объект-фонд
Vault PDA        = PDA(["vault", pot_pubkey])          # держит SOL казны
Member ATA       = ATA(member_wallet, share_mint)      # сюда падают токены
```

- **mint authority = Pot PDA.** Минтить/жечь может ТОЛЬКО программа, подписывая
  семенами пота. Приватного ключа у минт-authority нет.
- **freeze authority = None** в v1 (чтобы токен был обычным, совместимым с DEX/кошельками).
- **decimals = 9** — зеркалим SOL: первый депозит 1 SOL → ровно 1.000000000 токена.
- **Источник истины по total shares = `mint.supply`.** Не дублируем в отдельном поле
  (иначе дрейф). `PotAccount` может хранить кэш, но математика берёт `mint.supply`.

Тип токена: **классический SPL Token** (Token program) для максимальной совместимости.
Опционально позже — Token-2022 + Metaplex metadata, чтобы в кошельке красиво
показывалось имя «POT · <name>» и символ. Transfer-hook НЕ используем (ломает DEX).

---

## 2. Жизненный цикл минта

```
create_pot   → init Pot PDA + init Share Mint PDA (supply = 0, authority = Pot PDA)
deposit(L)   → SOL: depositor → Vault PDA
               shares = (supply==0) ? L : L * supply / vault_balance_before   (u128, floor)
               mint_to(shares) → depositor ATA            [программа подписывает как Pot PDA]
withdraw(S)  → payout = vault_balance * S / supply        (u128, floor)
               burn(S) ← depositor ATA                    [подписывает сам депозитор]
               SOL: Vault PDA → depositor                 [программа подписывает как Vault PDA]
```

Ключевой инвариант NAV: **доля цены = vault_balance / supply**, и он неманипулируем,
потому что и числитель (лампорты в Vault), и знаменатель (`mint.supply`) — on-chain.

---

## 3. Anchor-код (v1, native SOL)

### 3.1 `create_pot` — инициализация минта пота

```rust
use anchor_lang::prelude::*;
use anchor_spl::token::{Mint, Token};

#[derive(Accounts)]
#[instruction(params: CreatePotParams)]
pub struct CreatePot<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = 8 + PotAccount::INIT_SPACE,
        seeds = [b"pot", params.name.as_bytes(), creator.key().as_ref()],
        bump,
    )]
    pub pot: Account<'info, PotAccount>,

    /// Per-pot share mint. Authority = the pot PDA itself.
    #[account(
        init,
        payer = creator,
        seeds = [b"mint", pot.key().as_ref()],
        bump,
        mint::decimals = 9,
        mint::authority = pot,           // program-controlled (PDA), no private key
        // mint::freeze_authority intentionally omitted (None) for v1
    )]
    pub share_mint: Account<'info, Mint>,

    /// CHECK: native-SOL vault PDA (system-owned, holds lamports only).
    #[account(
        mut,
        seeds = [b"vault", pot.key().as_ref()],
        bump,
    )]
    pub vault: SystemAccount<'info>,

    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
    pub rent: Sysvar<'info, Rent>,
}

pub fn handler(ctx: Context<CreatePot>, params: CreatePotParams) -> Result<()> {
    let pot = &mut ctx.accounts.pot;
    pot.authority   = ctx.accounts.creator.key();
    pot.name        = params.name;
    pot.share_mint  = ctx.accounts.share_mint.key();
    pot.pot_bump    = ctx.bumps.pot;
    pot.vault_bump  = ctx.bumps.vault;
    pot.created_at  = Clock::get()?.unix_timestamp;
    // total_shares lives in share_mint.supply; no need to track here.
    Ok(())
}
```

### 3.2 `deposit` — минт долей депозитору

```rust
use anchor_spl::token::{self, MintTo, Token, TokenAccount, Mint};
use anchor_spl::associated_token::AssociatedToken;

#[derive(Accounts)]
pub struct Deposit<'info> {
    #[account(mut)]
    pub depositor: Signer<'info>,

    #[account(mut, seeds = [b"pot", pot.name.as_bytes(), pot.authority.as_ref()], bump = pot.pot_bump)]
    pub pot: Account<'info, PotAccount>,

    #[account(mut, address = pot.share_mint)]
    pub share_mint: Account<'info, Mint>,

    #[account(mut, seeds = [b"vault", pot.key().as_ref()], bump = pot.vault_bump)]
    pub vault: SystemAccount<'info>,

    /// Depositor's share-token account (created if needed).
    #[account(
        init_if_needed,
        payer = depositor,
        associated_token::mint = share_mint,
        associated_token::authority = depositor,
    )]
    pub depositor_shares: Account<'info, TokenAccount>,

    pub token_program: Program<'info, Token>,
    pub associated_token_program: Program<'info, AssociatedToken>,
    pub system_program: Program<'info, System>,
}

pub fn handler(ctx: Context<Deposit>, lamports: u64) -> Result<()> {
    require!(lamports >= MIN_DEPOSIT_LAMPORTS, PotError::DepositTooSmall); // anti-inflation

    let supply       = ctx.accounts.share_mint.supply;
    let vault_before = ctx.accounts.vault.lamports();   // BEFORE the transfer

    // 1) move SOL: depositor -> vault PDA (system transfer, depositor signs)
    anchor_lang::system_program::transfer(
        CpiContext::new(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.depositor.to_account_info(),
                to:   ctx.accounts.vault.to_account_info(),
            },
        ),
        lamports,
    )?;

    // 2) shares to mint
    let shares: u64 = if supply == 0 {
        lamports                                   // first deposit: 1:1 with lamports
    } else {
        // floor( lamports * supply / vault_before )  in u128 to avoid overflow
        u64::try_from((lamports as u128)
            .checked_mul(supply as u128).unwrap()
            .checked_div(vault_before as u128).unwrap()
        ).map_err(|_| PotError::MathOverflow)?
    };
    require!(shares > 0, PotError::ZeroShares);     // reject dust that rounds to 0

    // 3) mint shares -> depositor ATA, program signs as the Pot PDA (mint authority)
    let pot_key = ctx.accounts.pot.key();
    let seeds: &[&[u8]] = &[
        b"pot",
        ctx.accounts.pot.name.as_bytes(),
        ctx.accounts.pot.authority.as_ref(),
        &[ctx.accounts.pot.pot_bump],
    ];
    token::mint_to(
        CpiContext::new_with_signer(
            ctx.accounts.token_program.to_account_info(),
            MintTo {
                mint:      ctx.accounts.share_mint.to_account_info(),
                to:        ctx.accounts.depositor_shares.to_account_info(),
                authority: ctx.accounts.pot.to_account_info(),
            },
            &[seeds],
        ),
        shares,
    )?;
    let _ = pot_key;
    Ok(())
}
```

### 3.3 `withdraw` — сжечь доли, вернуть SOL

```rust
use anchor_spl::token::{self, Burn};

pub fn handler(ctx: Context<Withdraw>, shares: u64) -> Result<()> {
    let supply = ctx.accounts.share_mint.supply;
    require!(supply > 0 && shares > 0, PotError::ZeroShares);

    let vault_balance = ctx.accounts.vault.lamports();
    let payout: u64 = u64::try_from((vault_balance as u128)
        .checked_mul(shares as u128).unwrap()
        .checked_div(supply as u128).unwrap()
    ).map_err(|_| PotError::MathOverflow)?;

    // 1) burn shares from the withdrawer's ATA (the withdrawer is the token authority)
    token::burn(
        CpiContext::new(
            ctx.accounts.token_program.to_account_info(),
            Burn {
                mint:      ctx.accounts.share_mint.to_account_info(),
                from:      ctx.accounts.withdrawer_shares.to_account_info(),
                authority: ctx.accounts.withdrawer.to_account_info(),
            },
        ),
        shares,
    )?;

    // 2) move SOL: vault PDA -> withdrawer, program signs as the Vault PDA
    let pot_key = ctx.accounts.pot.key();
    let vseeds: &[&[u8]] = &[b"vault", pot_key.as_ref(), &[ctx.accounts.pot.vault_bump]];
    anchor_lang::system_program::transfer(
        CpiContext::new_with_signer(
            ctx.accounts.system_program.to_account_info(),
            anchor_lang::system_program::Transfer {
                from: ctx.accounts.vault.to_account_info(),
                to:   ctx.accounts.withdrawer.to_account_info(),
            },
            &[vseeds],
        ),
        payout,
    )?;
    Ok(())
}
```

---

## 4. Безопасность минта (обязательно к учёту)

- **mint authority = Pot PDA, не пользователь.** Никто извне не может напечатать доли.
- **First-depositor inflation.** Защита: `MIN_DEPOSIT_LAMPORTS` (напр. 0.01 SOL) + `require!(shares > 0)`. Опц. усиление — при `create_pot` сминтить крошечную «мёртвую» долю на сам пот, чтобы supply никогда не был ровно 0 при первом реальном депозите. Покрыть тестом.
- **vault_before — строго ДО трансфера.** Иначе депозитор «купит» долю по уже завышенному балансу.
- **Прямой донат SOL в Vault** поднимает NAV всем холдерам — безвреден, но именно поэтому считаем `vault_before` до депозита.
- **u128 в промежутке + checked_*** на всей финансовой математике; округление floor в пользу пула.
- **withdraw жжёт у `withdrawer`**, подпись — самого пользователя; вывести чужие доли нельзя.
- **SOL из Vault** двигает только программа подписью `["vault", pot]` — у создателя пота нет инструкции увести казну (обещание В2).

## 5. Что отдаём в SDK/клиент
- `NAV_per_share = vault_lamports / mint.supply` (read-only).
- Баланс долей пользователя = его ATA по `share_mint`.
- Имя/символ токена для кошелька — через опциональную Metaplex metadata (Phase 1.5).

## Open questions
1. Минтим ли «мёртвую» долю на пот при create (anti-inflation hard-mode) — да/нет?
2. `MIN_DEPOSIT_LAMPORTS` — какое значение (предлагаю 0.01 SOL)?
3. Metaplex-метадата токена в v1 или в 1.5?
