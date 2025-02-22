import * as solanaWeb3 from '@solana/web3.js';
import { sleep } from './rugchecker/utils/helper';
import TelegramBot from 'node-telegram-bot-api';
import * as dotenv from 'dotenv';

import SPLRugchecker from './rugchecker/index';

dotenv.config();

// Helius RPC URL
const heliusRpcUrl = `${process.env.HELIUS_BASIC_URL}${process.env.HELIUS_API_KEY}`;
const heliusWs = `${process.env.HELIUS_WS_URL}${process.env.HELIUS_API_KEY}`;
// console.log(">> helius api url: ", heliusRpcUrl);
console.log("--------------------------->>>>>>>>>>>>>>>>>>>>>>>>>>>> new token <<<<<<<<<<<<<<<<<<<<<<<<<<<<---------------------------");

// Ensure that the wsEndpoint is provided in the connection config
const web3ConnectionConfig: solanaWeb3.ConnectionConfig = {
  wsEndpoint: heliusWs,
  commitment: "confirmed"
};

const web3 = new solanaWeb3.Connection(heliusRpcUrl, web3ConnectionConfig);

const telegramBotToken = String(process.env.TELEGRAM_BOT_TOKEN);
const telegramChatId = String(process.env.TELEGRAM_CHAT_ID);
const raydiumProgramId = new solanaWeb3.PublicKey(String(process.env.RAYDIUM_PROGRAM_KEY));
const bot = new TelegramBot(telegramBotToken, { polling: false });
const rugCheckConfig = {
  solanaRpcEndpoint: `${process.env.HELIUS_BASIC_URL}${process.env.HELIUS_API_KEY}`,
  heliusApiKey: process.env.HELIUS_API_KEY
}

function extractMintAccountFromTransaction(transaction: any): [solanaWeb3.PublicKey | null, solanaWeb3.PublicKey | null] {
  try {
    const staticAccountKeys = transaction.transaction.message.staticAccountKeys;
    const compiledInstructions = transaction.transaction.message.compiledInstructions;

    for (const instruction of compiledInstructions) {
      const programIdIndex = instruction.programIdIndex;
      const programId = staticAccountKeys[programIdIndex].toBase58();

      if (programId === String(process.env.RAYDIUM_PROGRAM_KEY)) {
        const instructionData = Buffer.from(instruction.data, 'hex');

        if (instructionData.length > 0) {
          const accountKeyIndexes = instruction.accountKeyIndexes;
          // for (let i = 0; i < accountKeyIndexes.length; i++) {
          //   console.log(">>i = ", i, " >> account indexes", accountKeyIndexes[i], " address:", staticAccountKeys[accountKeyIndexes[i]].toBase58())
          // }
          const mintAccountIndex = accountKeyIndexes[8];
          const poolIndex = accountKeyIndexes[4];
          return [
            staticAccountKeys[mintAccountIndex] || null,
            staticAccountKeys[poolIndex] || null
          ]; // Ensure a PublicKey or null is returned
        }
      }
    }

    return [null, null]; // No mint account found
  } catch (error) {
    console.error("Error extracting mint account:", error);
    return [null, null];
  }
}

async function sendTelegramAlert(mintAccount: solanaWeb3.PublicKey, poolAddress: solanaWeb3.PublicKey, normalizedRugScore: number): Promise<void> {
  const message = `
    New Token Detected From Raydium!
    Token Address: 🟢 *${mintAccount.toBase58()}*
    Pool Address: 🟢 *${poolAddress.toBase58()}*
    RugScore: 🔴 *${normalizedRugScore}*
    `;
  try {
    await bot.sendMessage(telegramChatId, message);
    console.log('Telegram alert sent.');
  } catch (error) {
    console.error('Error sending Telegram alert:', error);
  }
}

const main = async (): Promise<void> => {
  const block = await web3.getLatestBlockhash();
  console.log("block: ", block);

  web3.onLogs(
    raydiumProgramId,
    async (logInfo) => {
      if (logInfo.logs.some(log => log.includes("initialize2"))) {
        console.log("Detected pool creation event.");

        try {
          const transaction = await web3.getTransaction(logInfo.signature, {
            commitment: 'confirmed',
            maxSupportedTransactionVersion: 0
          });

          if (transaction) {
            const [mintAccount, poolAddress] = extractMintAccountFromTransaction(transaction as any); // Type assertion
            if (mintAccount && poolAddress) {
              console.log(">>Mint Account:", mintAccount.toBase58());
              console.log(">>Pool Address:", poolAddress.toBase58());
              if (mintAccount.toBase58() === String(process.env.WRAPPED_SOL_TOKEN)) return;
              const rugChecker = new SPLRugchecker(rugCheckConfig);
              await sleep(60000);
              const result = await rugChecker.check(mintAccount.toBase58(), poolAddress.toBase58());
              const nomalizedRugScore = rugChecker.isRug(result);
              console.log(">> nomalizedRugScore -> ", nomalizedRugScore);
              sendTelegramAlert(mintAccount, poolAddress, nomalizedRugScore);
            }
          } else {
            console.log("Transaction is null");
          }
        } catch (error) {
          console.error("Error processing transaction:", error);
        }
      }
    },
    'confirmed'
  );
}

main();