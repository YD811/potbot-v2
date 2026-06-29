/**
 * Pot composition validation.
 *
 * Enforces the registry rules:
 *   R1  at most MAX_ASSETS_PER_POT assets
 *   R2  target weights sum to exactly TOTAL_WEIGHT_BPS (10000)
 *   R3  only addable assets (enabled && verified && mint && supportsNav)
 *   R4  per-asset weight <= asset.maxPotWeightBps
 *   R5  each weight strictly > 0
 *   R6  no duplicate assets
 *   R7  risky assets (riskTier >= RISKY_RISK_TIER) require acknowledgeRisk
 *   R8  LP strategy only on assets that supportsLp
 */
import {
  MAX_ASSETS_PER_POT,
  TOTAL_WEIGHT_BPS,
  RISKY_RISK_TIER,
  isAssetAddable,
  assetStatus,
} from '../constants.js';
import type {
  Asset,
  PotAssetDraft,
  ValidationIssue,
  ValidationResult,
} from '../types.js';

export interface ValidatePotInput {
  draft: PotAssetDraft[];
  /** Lookup of asset id -> Asset (typically loaded from the registry). */
  assetsById: Map<string, Asset>;
  /** Override the max assets (defaults to MAX_ASSETS_PER_POT). */
  maxAssets?: number;
}

export function validatePotComposition(input: ValidatePotInput): ValidationResult {
  const { draft, assetsById } = input;
  const maxAssets = input.maxAssets ?? MAX_ASSETS_PER_POT;
  const errors: ValidationIssue[] = [];
  const warnings: ValidationIssue[] = [];

  // R6 duplicates
  const seen = new Set<string>();
  for (const row of draft) {
    if (seen.has(row.assetId)) {
      errors.push({ code: 'DUPLICATE_ASSET', message: `Asset ${row.assetId} listed more than once`, assetId: row.assetId });
    }
    seen.add(row.assetId);
  }

  // R1 count
  if (draft.length === 0) {
    errors.push({ code: 'EMPTY_POT', message: 'A Pot must contain at least one asset' });
  }
  if (draft.length > maxAssets) {
    errors.push({ code: 'TOO_MANY_ASSETS', message: `A Pot may hold at most ${maxAssets} assets (got ${draft.length})` });
  }

  let weightSum = 0;
  for (const row of draft) {
    const asset = assetsById.get(row.assetId);

    // R3 existence + addability
    if (!asset) {
      errors.push({ code: 'UNKNOWN_ASSET', message: `Asset ${row.assetId} not found in registry`, assetId: row.assetId });
      continue;
    }
    if (!isAssetAddable(asset)) {
      const reason =
        assetStatus(asset) === 'pending_verification'
          ? 'asset is pending_verification'
          : !asset.enabled ? 'asset is disabled'
          : !asset.mint ? 'asset has no verified mint'
          : !asset.supportsNav ? 'asset does not support NAV'
          : 'asset not addable';
      errors.push({ code: 'ASSET_NOT_ADDABLE', message: `Cannot add ${asset.symbol}: ${reason}`, assetId: row.assetId });
      // keep validating weights so caller sees all issues at once
    }

    // R5 positive weight
    if (!Number.isInteger(row.targetWeightBps) || row.targetWeightBps <= 0) {
      errors.push({ code: 'INVALID_WEIGHT', message: `${asset.symbol} weight must be a positive integer (bps)`, assetId: row.assetId });
    }

    // R4 per-asset cap
    if (asset && row.targetWeightBps > asset.maxPotWeightBps) {
      errors.push({
        code: 'WEIGHT_EXCEEDS_CAP',
        message: `${asset.symbol} weight ${row.targetWeightBps}bps exceeds cap ${asset.maxPotWeightBps}bps`,
        assetId: row.assetId,
      });
    }

    // R7 risky acknowledgement
    if (asset && asset.riskTier >= RISKY_RISK_TIER) {
      if (!row.acknowledgeRisk) {
        errors.push({
          code: 'RISK_NOT_ACKNOWLEDGED',
          message: `${asset.symbol} is risky (tier ${asset.riskTier}); acknowledgeRisk required`,
          assetId: row.assetId,
        });
      } else {
        warnings.push({
          code: 'RISKY_ASSET',
          message: `${asset.symbol} is a tier-${asset.riskTier} (risky) asset`,
          assetId: row.assetId,
        });
      }
    }

    // R8 LP strategy support
    if (asset && row.primaryStrategy === 'lp' && !asset.supportsLp) {
      errors.push({ code: 'LP_UNSUPPORTED', message: `${asset.symbol} does not support LP strategy`, assetId: row.assetId });
    }
    if (asset && row.primaryStrategy === 'lend' && !asset.supportsLending) {
      errors.push({ code: 'LEND_UNSUPPORTED', message: `${asset.symbol} does not support lending strategy`, assetId: row.assetId });
    }

    weightSum += row.targetWeightBps;
  }

  // R2 weights sum
  if (weightSum !== TOTAL_WEIGHT_BPS) {
    errors.push({
      code: 'WEIGHTS_NOT_100',
      message: `Target weights must sum to ${TOTAL_WEIGHT_BPS}bps (100%); got ${weightSum}bps`,
    });
  }

  return { ok: errors.length === 0, errors, warnings };
}
