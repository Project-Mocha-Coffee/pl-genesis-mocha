const { ethers } = require("hardhat");
const fs = require("fs");
const path = require("path");

// Try JSON deployment first, fallback to legacy TXT
const JSON_DEPLOYMENT = "deployments/deployment-vault-scrollSepolia-2025-09-24T19-11-45-264Z.json";
const TXT_DEPLOYMENT = "deployments/deployment-scrollSepolia-chain-534351-2025-08-11T14-58-45-568Z.txt";
const ACCOUNTS_FILE = "accounts/accounts-scrollSepolia-534351-2025-08-01T16-14-51-798Z.txt";

function loadDeployment() {
    // JSON preferred
    try {
        const p = path.resolve(JSON_DEPLOYMENT);
        if (fs.existsSync(p)) {
            const data = JSON.parse(fs.readFileSync(p, "utf8"));
            const contracts = data.contracts || {};
            const params = data.parameters || {};
            const tokenAddresses = (data.configuration && data.configuration.tokenAddresses) || {};
            return {
                MochaTreeRightsToken: contracts.MochaTreeRightsToken?.address,
                MochaLandToken: contracts.MochaLandToken?.address || params.mochaLandToken || tokenAddresses.mochaLandToken,
                MochaTreeToken: contracts.MochaTreeToken?.address || params.mochaTreeToken || tokenAddresses.mochaTreeToken,
                TreeFarmDiamond: contracts.TreeFarmDiamond?.address,
                Asset: contracts.Asset?.address || params.asset || tokenAddresses.asset
            };
        }
    } catch (_) {}

    // TXT fallback
    const p = path.resolve(TXT_DEPLOYMENT);
    if (!fs.existsSync(p)) {
        throw new Error("No deployment file found (JSON/TXT)");
    }
    const deploymentContent = fs.readFileSync(p, "utf8");
    const deployment = {};
    for (const line of deploymentContent.split("\n")) {
        const trimmed = line.trim();
        if (!trimmed || !trimmed.includes(":")) continue;
        const idx = trimmed.indexOf(":");
        const key = trimmed.substring(0, idx).trim();
        const value = trimmed.substring(idx + 1).trim();
        if (value.startsWith("0x") && value.length === 42) {
            deployment[key] = value;
        }
    }
    return deployment;
}

function loadAccounts() {
    const p = path.resolve(ACCOUNTS_FILE);
    if (!fs.existsSync(p)) {
        console.log(`⚠️  Accounts file not found at ${p}. Proceeding without farm owner signers.`);
        return {};
    }
    const content = fs.readFileSync(p, "utf8");
    const accounts = {};
    const lines = content.split('\n');
    let currentRole = null;
    for (const raw of lines) {
        const line = raw.trim();
        if (!line || line.startsWith('#')) continue;
        if (line.endsWith(':') && !line.includes(' ')) {
            currentRole = line.slice(0, -1);
            if (!accounts[currentRole]) accounts[currentRole] = {};
            continue;
        }
        if (currentRole && line.includes(':')) {
            const idx = line.indexOf(':');
            const key = line.substring(0, idx).trim();
            const value = line.substring(idx + 1).trim();
            if (key === 'Address') accounts[currentRole].address = value;
            if (key === 'Private Key' && value !== 'CONFIGURED_IN_ENV') accounts[currentRole].privateKey = value;
        }
    }
    return accounts;
}

function resolveFarmOwnerSigner(accountsByRole, farmId, expectedOwnerAddress) {
    const provider = ethers.provider;
    const roleKey = `FARMOWNER${farmId}`;
    if (accountsByRole[roleKey]?.privateKey) {
        try {
            return new ethers.Wallet(accountsByRole[roleKey].privateKey, provider);
        } catch (_) {}
    }
    if (expectedOwnerAddress) {
        const match = Object.values(accountsByRole).find(a => a.address && a.privateKey && a.address.toLowerCase() === expectedOwnerAddress.toLowerCase());
        if (match) {
            try {
                return new ethers.Wallet(match.privateKey, provider);
            } catch (_) {}
        }
    }
    return null;
}

async function getAllMltTokenIds(mlt) {
    const ids = [];
    let id = 1;
    // iterate sequentially until ownerOf reverts
    while (true) {
        try {
            const owner = await mlt.ownerOf(id);
            if (owner && owner !== ethers.ZeroAddress) {
                ids.push(id);
            }
            id++;
        } catch (_) {
            break;
        }
    }
    return ids;
}

async function getVaultStatus(mttr, maxProbe = 200) {
    const vaultIds = [];
    for (let id = 1; id <= maxProbe; id++) {
        try {
            const cfg = await mttr.getFarmConfig(id);
            if (cfg.farmOwner !== ethers.ZeroAddress) {
                vaultIds.push({ id, active: cfg.active, owner: cfg.farmOwner, name: cfg.name });
            }
        } catch (_) {
            // stop early if large gap? keep probing up to maxProbe
        }
    }
    return vaultIds;
}

async function main() {
    console.log("Harmonize Farms (MLT ↔ Vault)");
    console.log("============================\n");

    const deployment = loadDeployment();
    const mttrAddress = deployment.MochaTreeRightsToken;
    const mltAddress = deployment.MochaLandToken;
    const mttAddress = deployment.MochaTreeToken;

    if (!mttrAddress || !mltAddress || !mttAddress) {
        throw new Error("Missing required contract addresses in deployment");
    }

    console.log("Contracts:");
    console.log("  MTTR:", mttrAddress);
    console.log("  MLT:", mltAddress);
    console.log("  MTT:", mttAddress);

    const mttr = await ethers.getContractAt("MochaTreeRightsToken", mttrAddress);
    const mlt = await ethers.getContractAt("MochaLandToken", mltAddress);
    const mtt = await ethers.getContractAt("MochaTreeToken", mttAddress);

    // Load farm owner signers from accounts
    const accountsByRole = loadAccounts();

    // Discover state
    const mltIds = await getAllMltTokenIds(mlt);
    const vaultInfos = await getVaultStatus(mttr, Math.max(mltIds.length + 10, 50));
    const vaultIdSet = new Set(vaultInfos.map(v => v.id));

    // Fetch active list (best-effort)
    let activeIds = [];
    try {
        const res = await mttr.getActiveFarmIds();
        const arr = Array.isArray(res) ? res : (typeof res?.toArray === 'function' ? res.toArray() : []);
        activeIds = arr.map(n => Number(n));
    } catch (_) {}

    console.log("\nDiscovered:");
    console.log(`  MLT tokens: ${mltIds.length} [${mltIds.join(', ')}]`);
    console.log(`  Vault farms: ${vaultInfos.length} [${vaultInfos.map(v=>v.id).join(', ')}]`);
    console.log(`  Active farms: ${activeIds.length} [${activeIds.join(', ')}]`);

    // Plan actions
    const toAdd = mltIds.filter(id => !vaultIdSet.has(id));
    const inactive = vaultInfos.filter(v => !v.active).map(v => v.id);

    console.log("\nActions Needed:");
    console.log(`  Add to vault: ${toAdd.length} [${toAdd.join(', ')}]`);
    console.log(`  Activate in vault: ${inactive.length} [${inactive.join(', ')}]`);

    const results = { added: [], skippedNoTrees: [], failedAdd: [], activated: [], failedActivate: [] };

    // Defaults (can be tuned)
    const DEFAULT_APY_BPS = 1200; // 12%
    const DEFAULT_MATURITY_MONTHS = 36; // 36 months

    // Add missing farms
    for (const farmId of toAdd) {
        console.log(`\n➕ Adding farm ${farmId} to vault...`);
        try {
            const owner = await mlt.ownerOf(farmId);
            if (!owner || owner === ethers.ZeroAddress) {
                console.log("  ⚠️ No MLT owner found, skipping");
                results.failedAdd.push(farmId);
                continue;
            }

            // Verify the owner holds MTT subIds for this farm (required by vault add)
            let treeBalance = 0n;
            try {
                // subIdBalanceOf(owner, farmId) per IDLTEnumerable
                treeBalance = await mtt.subIdBalanceOf(owner, farmId);
            } catch (_) {
                // fallback heuristic: check first 5 subIds
                for (let sub = 1; sub <= 5; sub++) {
                    try {
                        const bal = await mtt.subBalanceOf(owner, farmId, sub);
                        if (bal > 0) treeBalance += BigInt(bal);
                    } catch (_) { break; }
                }
            }
            if (treeBalance === 0n) {
                console.log("  ⚠️ Owner has no trees (MTT) for this farm; cannot add (vault requires >0 trees)");
                results.skippedNoTrees.push(farmId);
                continue;
            }

            // Choose signer: prefer FARMOWNER{farmId} or matching address from accounts file
            const caller = resolveFarmOwnerSigner(accountsByRole, farmId, owner);
            if (!caller) {
                console.log("  ⚠️ No signer available for farm owner from accounts file; skipping");
                results.failedAdd.push(farmId);
                continue;
            }

            const farmName = `Farm ${farmId}`;
            const tx = await mttr.connect(caller).addFarm(
                farmId,
                farmName,
                owner, // treat owner EOA as TBA per current pattern
                DEFAULT_APY_BPS,
                DEFAULT_MATURITY_MONTHS,
                `${farmName} Shares`,
                `FST${farmId}`
            );
            await tx.wait();
            console.log("  ✅ Added to vault");
            results.added.push(farmId);
        } catch (err) {
            console.log(`  ❌ Failed to add: ${err.message}`);
            results.failedAdd.push(farmId);
        }
    }

    // Activate inactive farms
    for (const farmId of inactive) {
        console.log(`\n🔁 Activating farm ${farmId}...`);
        try {
            // Keep APY unchanged; fetch then set active=true via updateFarm
            const cfg = await mttr.getFarmConfig(farmId);
            const tx = await mttr.updateFarm(farmId, cfg.targetAPY, true);
            await tx.wait();
            console.log("  ✅ Activated");
            results.activated.push(farmId);
        } catch (err) {
            console.log(`  ❌ Failed to activate: ${err.message}`);
            results.failedActivate.push(farmId);
        }
    }

    console.log("\n" + "=".repeat(50));
    console.log("HARMONIZATION SUMMARY");
    console.log("=".repeat(50));
    console.log(`Added: ${results.added.length} [${results.added.join(', ')}]`);
    console.log(`Skipped (no trees): ${results.skippedNoTrees.length} [${results.skippedNoTrees.join(', ')}]`);
    console.log(`Failed Add: ${results.failedAdd.length} [${results.failedAdd.join(', ')}]`);
    console.log(`Activated: ${results.activated.length} [${results.activated.join(', ')}]`);
    console.log(`Failed Activate: ${results.failedActivate.length} [${results.failedActivate.join(', ')}]`);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("Script failed:", error);
        process.exit(1);
    });


