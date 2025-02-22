import { Connection, PublicKey, ParsedAccountData } from '@solana/web3.js';
// import { promises as fs } from 'fs';
import { LIQUIDITY_STATE_LAYOUT_V4 } from '@raydium-io/raydium-sdk';
import LiquidityCheckConfig from '../model/config/liquidity-check';
import LiquidityCheckResult from '../model/result/liquidity-check';

export default class LiquidityChecker {
  private connection: Connection;

  // private poolAddress: string;
  constructor({ solanaRpcEndpoint, poolFilePath, poolAddress }: LiquidityCheckConfig, connection?: Connection) {
    if (!solanaRpcEndpoint) {
      solanaRpcEndpoint = `${process.env.HELIUS_BASIC_URL}${process.env.HELIUS_API_KEY}`;
    }
    if (!connection) {
      connection = new Connection(solanaRpcEndpoint);
    }
    this.connection = connection;
  }

  async check(tokenAddress: string, poolAddress: string): Promise<LiquidityCheckResult> {
    const liquidityCheckResult = new LiquidityCheckResult();
    try {
      const acc = await this.connection.getMultipleAccountsInfo([new PublicKey(poolAddress)]);
      if (!acc || acc.length === 0 || !acc[0]) {
        console.warn(`Liquidity pool not found at address: ${poolAddress}`);
        liquidityCheckResult.hasLiquidity = false;
        return liquidityCheckResult;
      }
      const parsed = acc.map((v) => (v ? LIQUIDITY_STATE_LAYOUT_V4.decode(v.data) : null));
      if (!parsed || parsed.length === 0 || !parsed[0]) {
        console.warn(`Could not decode liquidity pool data at address: ${poolAddress}`);
        liquidityCheckResult.hasLiquidity = false;
        return liquidityCheckResult;
      }
      const lpMint = String(parsed[0]?.lpMint);
      let lpReserve = parsed[0]?.lpReserve.toNumber() ?? 0;
      const accInfo = await this.connection.getParsedAccountInfo(new PublicKey(lpMint));
      if (!accInfo || !accInfo.value) {
        console.warn(`Could not fetch parsed account info for LP Mint: ${lpMint}`);
        liquidityCheckResult.hasLiquidity = false;
        return liquidityCheckResult;
      }
      const mintInfo = (accInfo?.value?.data as ParsedAccountData)?.parsed?.info;
      if (!mintInfo) {
        console.warn(`Could not extract mint info from LP Mint data.`);
        liquidityCheckResult.hasLiquidity = false;
        return liquidityCheckResult;
      }
      lpReserve = lpReserve / Math.pow(10, mintInfo?.decimals);
      const actualSupply = mintInfo?.supply / Math.pow(10, mintInfo?.decimals);
      const burnAmt = lpReserve - actualSupply;
      const burnPct = (burnAmt / lpReserve) * 100;
      liquidityCheckResult.isLiquidityLocked = burnPct > 95;
      liquidityCheckResult.burnt = burnPct;
      liquidityCheckResult.liquidityPoolAddress = poolAddress;
      liquidityCheckResult.address = tokenAddress;
      liquidityCheckResult.hasLiquidity = lpReserve > 0;
      liquidityCheckResult.lpReverse = lpReserve;
      // console.log(liquidityCheckResult);
      return liquidityCheckResult;
    }
    catch (error) {
      console.error(`Error checking liquidity for pool ${poolAddress}:`, error);
      liquidityCheckResult.hasLiquidity = false; // Default to false in case of error
      return liquidityCheckResult;
    }
  }

  // async getLiquidityPool(tokenAddress: string) {
  //   try {
  //     const data = await fs.readFile(this.poolFilePath, 'utf8');
  //     const allPools = JSON.parse(data);

  //     const pool = allPools.find(
  //       (pool: { baseMint: string; quoteMint: string}) => pool.baseMint === tokenAddress || pool.quoteMint === tokenAddress
  //     );

  //     return pool ? pool.id : '';
  //   } catch (error) {
  //     console.error('Error reading or parsing pool file:', error);
  //     return '';
  //   }
  // }

  // async getRaydiumPoolAddress(mintAddress: string) {
  //   try {
  //     const url = 'https://api.geckoterminal.com/api/v2/networks/solana/tokens/' + mintAddress;
  //     const response = await axios.get(url);
  //     // console.log(response.data.data.relationships.top_pools.data[0])
  //     return response.data.data.relationships.top_pools.data[0].id.replace('solana_', '');
  //   } catch (error) {
  //     // console.error('Error fetching pool address:', error);
  //   }
  // }
}