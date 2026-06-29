# PotBot v1 — Wallet, Key & NAV-Token Architecture

**Living doc · v0.1 · 2026-06-29 · owner: YD**
Отвечает на: сколько и каких кошельков нужно, откуда деплоится программа, где казна, куда что течёт, какие «кошельки» создаёт сама программа, как минтятся NAV-токены и что с ними дальше.

---

## 0. Ключевая ментальная модель — есть ДВА вида «кошельков»

1. **Keypair'ы, которые держишь ты** (есть приватный ключ; контролирует человек или multisig). Живут off-chain, в файлах/Squads.
2. **PDA, которыми владеет программа** (приватного ключа НЕТ; средствами может двигать только программа, подписывая «семенами»/seeds). Деньги пользователей лежат именно здесь.

Главное следствие для доверия: **SOL пользователей лежит на PDA-казне пота, и в v1 в программе физически нет инструкции, которой создатель пота может её увести.** Вывод — только пропорционально своей доле, через `withdraw`.

---

## A. Keypair'ы, которые ты создаёшь и хранишь (off-chain)

Для v1 реально нужно **2 критичных ключа** (+ опционально зарезервировать treasury):

### 1. Program keypair — `target/deploy/pot_vault-keypair.json`
- **Роль:** задаёт адрес программы (то, что в `declare_id!`). Подписывает ТОЛЬКО первый деплой.
- **Кто держит:** ты. Холодный бэкап. После деплоя в работе не участвует (апгрейды идут через upgrade authority).
- **Сколько:** один, навсегда.

### 2. Deployer / Upgrade authority
- **Роль:** платит за деплой и **может апгрейдить программу**.
- **devnet / первый mainnet:** обычный CLI-кошелёк, который ты контролируешь.
- **mainnet hardening:** передать upgrade authority на **Squads v4 multisig** (например 2-of-3: ты + кофаундер + холодный ключ).
- ⚠️ **Это самый важный ключ во всей системе.** Кто держит upgrade authority — может заменить логику программы и тем самым опустошить любые vault'ы. Корона. Поэтому на mainnet — только multisig, не hot wallet.
- **Фандинг:** ~3.5 SOL на деплой + буфер на редеплои.

### 3. Protocol treasury / fee wallet (опционально в v1)
- **Роль:** получает протокольные комиссии, если будешь брать (entry/perf fee).
- **Рекомендация:** адрес **Squads multisig**, не hot wallet. В v1 без комиссий можно не подключать, но **зарезервируй адрес сейчас**, чтобы потом не мигрировать.
- Это **казна компании** — полностью отдельно от средств потов.

### 4. Keeper / executor wallet — в v1 НЕ нужен
- Нужен только когда появится автоматизация/трейдинг (Phase 2+): hot wallet, который шлёт keeper-транзакции и платит газ.
- «Блокер executor-кошелька» из грант-скилла относится именно сюда. В v1 (group pot) исполнять нечего → **это не блокер для v1**.

### 5. Test wallets
- devnet + пара на mainnet для smoke-теста (create/deposit/withdraw). Расходники.

**Итог раздела A для v1:** program keypair + upgrade authority (→ Squads на mainnet). Treasury multisig — зарезервировать. Keeper — отложить.

---

## B. PDA, которые ВЫВОДИТ программа (без приватных ключей)

Программа не создаёт keypair-кошельки. Она детерминированно выводит PDA. На каждый пот:

| PDA | Seeds | Что это |
|-----|-------|---------|
| **PotAccount** | `["pot", name, authority]` | объект-фонд: конфиг, total_shares, bumps, адрес минта |
| **Vault** | `["vault", pot]` | **казна пота — держит SOL.** SOL уходит ТОЛЬКО через `withdraw`, подпись seeds. Свипа создателем нет |
| **Share Mint** | `["mint", pot]` | SPL-минт NAV/share-токена этого пота. mint/freeze authority = PotAccount PDA |
| **MemberAccount** | `["member", pot, wallet]` | запись участника (deposit_total/withdraw_total/joined_at) для PnL/UX |
| **Member ATA** | ATA(wallet, share_mint) | обычный token account — здесь лежат NAV-токены пользователя |

**Изоляция:** у каждого пота **своя** Vault-PDA → средства изолированы, нет общего «honeypot» с деньгами всех пользователей; баг в одном поте не достаёт до другого.

---

## C. Поток средств (deposit → hold → withdraw)

```
DEPOSIT(lamports)
  user wallet --lamports--> Vault PDA (казна пота)
  program (как mint authority через PDA) --mint shares--> ATA пользователя
  shares = первый_депозит ? lamports : lamports * mint.supply / vault_balance_до   (u128, floor)

HOLD
  NAV на долю = vault_balance / mint.supply         (read-only, считается в SDK/клиенте)
  пользователь держит share-токены в своём кошельке — transferable, composable

WITHDRAW(share_amount)
  program --burn shares--> из ATA пользователя
  Vault PDA --lamports--> user wallet
  payout = vault_balance * share_amount / mint.supply   (u128, floor)
```

- **Откуда деплоится программа:** с твоего **deployer-кошелька** (реальный SOL); идентичность = **program keypair**; право апгрейда = **upgrade authority (→ Squads)**.
- **Где казна:** **Vault-PDA на каждый пот** держит SOL пользователей; **казна компании** (комиссии) — отдельный multisig.
- **Какие кошельки создаёт программа:** ни одного с приватным ключом — выводит PDA (pot/vault/mint/member) и создаёт ATA пользователю. PDA keyless, ими двигает только программа.

---

## D. NAV / share-токен: как минтить и что с ним делать

### Минт
- На `create_pot`: инициализируем Share Mint PDA, **decimals = 9** (зеркалим SOL: первый депозит 1 SOL → 1.0 токена, интуитивно). mint authority = PotAccount PDA, supply 0.
- На `deposit`: программа подписывает seeds и минтит `shares` на ATA депозитора. Опц. Metaplex/Token-метадата → имя «POT · <name>», символ напр. `pSOL-x`, чтобы красиво отображалось в кошельках.
- **Источник истины по total shares = `mint.supply`.** `PotAccount.total_shares` либо убрать, либо держать как кэш в синхроне (иначе дрейф).

### Что это за токен
Ликвидное on-chain право на пропорциональную долю SOL пота, сжигаемое против казны по NAV в любой момент. Так как это стандартный SPL:
- виден в любом кошельке;
- **transferable** — можно продать/подарить свою долю без разрешения пота;
- **composable** — LP, залог, торговля на DEX, обёртки. ← это и есть нарратив «programmable capital» под грант.

### Дальнейшая жизнь токена (roadmap, не код v1)
- вторичная торговля на DEX (прайс-дискавери против NAV);
- залог в lending;
- **LP на Meteora** (твоя причина держать native SOL) — пара share/SOL;
- позже — вес в голосовании, когда governance вернётся после аудита.

### Что обязан отметить (безопасность + юридика)
- ⚠️ **Transferable усиливает «security-law» профиль.** Свободно передаваемый токен-право на пулированный управляемый фонд выглядит ещё больше как ценная бумага/CIS. Для нарратива в v1 можно выпустить transferable, **но** в связке с disclaimers и юридическим треком из roadmap. Альтернатива на ранний mainnet — Token-2022 с transfer-hook allowlist или non-transferable до юр-заключения (минус: transfer-hook ломает совместимость с DEX). **Моя рекомендация: классический SPL, transferable, с явными disclaimer'ами, и параллельно — юр-заключение до маркетинга как «инвестиция».**
- ⚠️ **First-depositor inflation:** атакер кладёт 1 lamport (1 share), донатит большой SOL прямо в vault, у следующего депозитора shares округляются в 0. Митигация: первый депозит минтит 1:1 к лампортам **+** минимальный первый депозит (напр. 0.01 SOL) **+** минт крошечной «мёртвой» доли на пот при init. Обязателен тест.
- ⚠️ **Прямой перевод SOL в vault** поднимает NAV существующим холдерам («донат») — обычно безвредно, но shares считаем от баланса vault **до** депозита.
- Округление — всегда floor в пользу пула; промежуточная математика через u128.

---

## E. Чек-лист действий по ключам (по порядку)
1. `solana-keygen new -o ~/keys/pot_vault-program.json` → это program keypair (бэкап холодно).
2. Deployer-кошелёк для devnet (можно текущий `~/.config/solana/id.json`).
3. Зарезервировать Squads multisig-адрес под (a) upgrade authority и (b) protocol treasury.
4. devnet-деплой с deployer = upgrade authority (нормально для теста).
5. Перед mainnet — **передать upgrade authority на Squads** (`solana program set-upgrade-authority`).
6. Keeper-кошелёк — не сейчас (Phase 2).

## Open questions
1. Squads multisig: какой состав подписантов и порог (рекомендую 2-of-3)?
2. Берём ли комиссию в v1 (влияет на то, нужен ли treasury-flow уже сейчас)?
3. Decimals share-токена: 9 (зеркало SOL) — ок?
