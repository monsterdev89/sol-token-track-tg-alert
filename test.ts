import SPLRugchecker from './rugchecker/index';
import * as dotenv from 'dotenv';

dotenv.config();

const rugCheckConfig = {
  solanaRpcEndpoint: `${process.env.HELIUS_BASIC_URL}${process.env.HELIUS_API_KEY}`,
  heliusApiKey: process.env.HELIUS_API_KEY
}

const main = async () => {

  const rugChecker = new SPLRugchecker(rugCheckConfig);

  const trumpTokenAddress = 'yEk3NsYoa2zktzfiGZqwrJzQioBbvC2NqYSWeswwRAW';
  const trumpPoolAddress = '3smL1P9cCuPsJ8G8qtsb8KXYFrnJFVkBD2bZdCYkvTfv';

  const tokenMintAddress = 'DNhZGNkDEoZBeMyapDxD2PuhdhJEQuzhGsEmfKmUpump';
  const poolAddress = 'BmniA7AYGiLSrK6zp45mhR93WYSGX6Fju14de1KAYFb8';

  const babyTokenMint = '3kBEZJLh8oCFApS3vqkgun3V9ronYh1J8EKzrksT6VEb';
  const babyPoolAddress = 'E7ztWUaAMYFHdbeFrsCFfdhcQJ8zatc27yGWwg9T6bxZ';

  const result = await rugChecker.check(tokenMintAddress, poolAddress);

  // const score = rugChecker.rugScore(result);
  const normalizedRugScore = rugChecker.isRug(result);
  console.log(">> normalizedRugScore ", normalizedRugScore);
}

main();

// import axios from "axios"

// const main = async () => {
//     const tx = await axios.get("https://api.dexscreener.com/token-pairs/v1/solana/6p6xgHyF7AeE6TZkSmFsko444wqoP15icUSqi2jfGiPN")

//     console.log(tx.data)
// }

// main()