const axios = require('axios');
const ethers = require('ethers');
const dotenv = require('dotenv');
const readline = require('readline');
const fs = require('fs');
const { wrapper } = require('axios-cookiejar-support');
const { CookieJar } = require('tough-cookie');

dotenv.config();


const ERC20_ABI = [
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function approve(address spender, uint256 amount) returns (bool)",
  "function allowance(address owner, address spender) view returns (uint256)"
];
const LIQUIDITY_CONTRACT_ABI = [
    "function addDVMLiquidity(address dvmAddress, uint256 baseInAmount, uint256 quoteInAmount, uint256 baseMinAmount, uint256 quoteMinAmount, uint8 flag, uint256 deadLine)"
];
const PRIMUS_TIP_ABI = [
    "function tip((uint32,address) token, (string,string,uint256,uint256[]) recipient)"
];
const AQUAFLUX_NFT_ABI = [
    "function claimTokens()",
    "function mint(uint256 nftType, uint256 expiresAt, bytes signature)"
];


const PHAROS_CHAIN_ID = 688688;
const PHAROS_RPC_URLS = ['https://testnet.dplabs-internal.com'];
const PHAROS_SCAN_BASE_URL = 'https://testnet.pharosscan.xyz/tx/'; 


const TOKENS = {
  PHRS: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE', 
  USDT: '0xD4071393f8716661958F766DF660033b3d35fD29',
  USDC: '0x72df0bcd7276f2dfbac900d1ce63c272c4bccced'
};


const AQUAFLUX_NFT_CONTRACT = '0xcc8cf44e196cab28dba2d514dc7353af0efb370e';
const AQUAFLUX_TOKENS = {
  P: '0xb5d3ca5802453cc06199b9c40c855a874946a92c',
  C: '0x4374fbec42e0d46e66b379c0a6072c910ef10b32',
  S: '0x5df839de5e5a68ffe83b89d430dc45b1c5746851',
  CS: '0xceb29754c54b4bfbf83882cb0dcef727a259d60a'
};


const DODO_ROUTER = '0x73CAfc894dBfC181398264934f7Be4e482fc9d40';
const PHRS_TO_USDT_AMOUNT = ethers.parseEther('0.00245');
const USDT_TO_PHRS_AMOUNT = ethers.parseUnits('1', 6);
const PHRS_TO_USDC_AMOUNT = ethers.parseEther('0.00245');
const USDC_TO_PHRS_AMOUNT = ethers.parseUnits('1', 6);


const LIQUIDITY_CONTRACT = '0x4b177aded3b8bd1d5d747f91b9e853513838cd49';
const DVM_POOL_ADDRESS = '0xff7129709ebd3485c4ed4fef6dd923025d24e730';


const PRIMUS_TIP_CONTRACT = '0xd17512b7ec12880bd94eca9d774089ff89805f02';



const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/108.0.0.0 Safari/537.36';


const colors = {
  reset: "\x1b[0m", cyan: "\x1b[36m", green: "\x1b[32m", yellow: "\x1b[33m", red: "\x1b[31m", white: "\x1b[37m", bold: "\x1b[1m", blue: "\x1b[34m",
};


const logger = {
  info: (msg) => console.log(`${colors.green}[✅] ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}[🛑] ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}[❌] ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}[✅] ${msg}${colors.reset}`),
  loading: (msg) => console.log(`${colors.cyan}[🔄] ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.white}[🟢] ${msg}${colors.reset}`),
  countdown: (msg) => process.stdout.write(`\r${colors.blue}[⏰] ${msg}${colors.reset}`),
  banner: () => {
    console.log(`${colors.cyan}${colors.bold}`);
    console.log(`      ██████╗ ██╗  ██╗ █████╗ ██████╗  █████╗  ██████╗   ██████╗██████╗ `);
    console.log(`      ██╔══██╗██║  ██║██╔══██╗██╔══██╗██╔══██╗██╔════╝  ██╔════╝╚════██╗`);
    console.log(`      ██████╔╝███████║███████║██████╔╝██║  ██║╚█████╗   ╚█████╗   ███╔═╝`);
    console.log(`      ██╔═══╝ ██╔══██║██╔══██║██╔══██╗██║  ██║ ╚═══██╗   ╚═══██╗██╔══╝  `);
    console.log(`      ██║     ██║  ██║██║  ██║██║  ██║╚█████╔╝██████╔╝  ██████╔╝███████╗`);
    console.log(`      ╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚════╝ ╚═════╝   ╚═════╝ ╚══════╝`);
    console.log(`💧 AquaFlux Protocol 🦄 DODO DEX 💰 Flow Add Liquidity 💸 Primus Social Tipping`);
    console.log(`     For Future New Script or Update Join Telegram Channel : Invictuslabs - Airdrops`);
    console.log(`                 ----     Script Author By : Kazmight    ----               ${colors.reset}`);
  }
};


async function buildFallbackProvider(rpcUrls, chainId, name) {
  const provider = new ethers.JsonRpcProvider(rpcUrls[0], { chainId, name });
  return {
    getProvider: async () => {
      for (let i = 0; i < 3; i++) {
        try {
          await provider.getBlockNumber();
          return provider;
        } catch (e) {
          if (e.code === 'UNKNOWN_ERROR' && e.error && e.error.code === -32603) {
            logger.warn(`RPC is busy, retrying ${i + 1}/3...`);
            await new Promise(r => setTimeout(r, 2000));
            continue;
          }
          throw e;
        }
      }
      throw new Error('All RPC retries failed');
    }
  };
}


function loadPrivateKeys() {
  const keys = [];
  let i = 1;
  while (process.env[`PRIVATE_KEY_${i}`]) {
    const pk = process.env[`PRIVATE_KEY_${i}`];
    if (pk.startsWith('0x') && pk.length === 66) {
      keys.push(pk);
    } else {
      logger.warn(`Invalid PRIVATE_KEY_${i} in .env, skipping...`);
    }
    i++;
  }
  return keys;
}

async function manualDelay(minSeconds, maxSeconds) {
  if (!minSeconds || !maxSeconds || minSeconds <= 0 || maxSeconds <= 0) return;
  const delaySeconds = Math.floor(Math.random() * (maxSeconds - minSeconds + 1)) + minSeconds;
  logger.info(`Waiting for ${delaySeconds} seconds before continuing...`);
  for (let i = delaySeconds; i > 0; i--) {
    logger.countdown(`Waiting... ${i} seconds remaining.`);
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  process.stdout.write('\n');
}




const jar = new CookieJar();
const api = wrapper(axios.create({ jar }));

const aquaFluxHeaders = (accessToken = null) => {
    const headers = {
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.9',
        'content-type': 'application/json',
        'origin': 'https://playground.aquaflux.pro',
        'priority': 'u=1, i',
        'referer': 'https://playground.aquaflux.pro/',
        'sec-ch-ua': '"Not)A;Brand";v="8", "Chromium";v="138", "Google Chrome";v="138"',
        'sec-ch-ua-mobile': '?0',
        'sec-ch-ua-platform': '"Windows"',
        'sec-fetch-dest': 'empty',
        'sec-fetch-mode': 'cors',
        'sec-fetch-site': 'same-site',
        'user-agent': USER_AGENT,
    };
    if (accessToken) {
        headers['authorization'] = `Bearer ${accessToken}`;
    }
    return headers;
};


async function aquaFluxLogin(wallet) {
  logger.step('Attempting AquaFlux login...');
  try {
    const timestamp = Date.now();
    const message = `Sign in to AquaFlux with timestamp: ${timestamp}`;
    const signature = await wallet.signMessage(message);
    const response = await api.post('https://api.aquaflux.pro/api/v1/users/wallet-login', {
      address: wallet.address,
      message: message,
      signature: signature
    }, {
      headers: aquaFluxHeaders()
    });

    if (response.data.status === 'success') {
      logger.success('AquaFlux login successful!');
      return response.data.data.accessToken;
    } else {
      throw new Error('Login failed: ' + JSON.stringify(response.data));
    }
  } catch (e) {
    logger.error(`AquaFlux login failed: ${e.message}`);
    throw e;
  }
}

async function claimTokens(wallet) {
  logger.step('Claiming free AquaFlux tokens (C & S)...');
  try {
    const nftContract = new ethers.Contract(AQUAFLUX_NFT_CONTRACT, AQUAFLUX_NFT_ABI, wallet);
    const tx = await nftContract.claimTokens({ gasLimit: 300000 });
    logger.info(`Claim tokens transaction sent! TX Hash: ${tx.hash}`);
    await tx.wait();
    logger.success('Tokens claimed successfully!');
    logger.info(`Transaction Link: ${PHAROS_SCAN_BASE_URL}${tx.hash}`);
    return true;
  } catch (e) {
    if (e.message.includes('already claimed')) {
      logger.warn('Tokens have already been claimed for today.');
      return true;
    }
    logger.error(`Claim tokens failed: ${e.message}`);
    throw e;
  }
}

async function craftTokens(wallet) {
  logger.step('Crafting 100 CS tokens from C and S tokens...');
  try {
    const cTokenContract = new ethers.Contract(AQUAFLUX_TOKENS.C, ERC20_ABI, wallet);
    const sTokenContract = new ethers.Contract(AQUAFLUX_TOKENS.S, ERC20_ABI, wallet);
    const csTokenContract = new ethers.Contract(AQUAFLUX_TOKENS.CS, ERC20_ABI, wallet);
    const requiredAmount = ethers.parseUnits('100', 18);

    const cBalance = await cTokenContract.balanceOf(wallet.address);
    if (cBalance < requiredAmount) {
      throw new Error(`Insufficient C tokens. Required: 100, Available: ${ethers.formatUnits(cBalance, 18)}`);
    }
    const sBalance = await sTokenContract.balanceOf(wallet.address);
    if (sBalance < requiredAmount) {
      throw new Error(`Insufficient S tokens. Required: 100, Available: ${ethers.formatUnits(sBalance, 18)}`);
    }

    const cAllowance = await cTokenContract.allowance(wallet.address, AQUAFLUX_NFT_CONTRACT);
    if (cAllowance < requiredAmount) {
      logger.info('Approving C tokens for crafting...');
      const cApproveTx = await cTokenContract.approve(AQUAFLUX_NFT_CONTRACT, ethers.MaxUint256);
      await cApproveTx.wait();
      logger.success('C tokens approved');
      logger.info(`Approval TX Link: ${PHAROS_SCAN_BASE_URL}${cApproveTx.hash}`);
    }

    const sAllowance = await sTokenContract.allowance(wallet.address, AQUAFLUX_NFT_CONTRACT);
    if (sAllowance < requiredAmount) {
      logger.info('Approving S tokens for crafting...');
      const sApproveTx = await sTokenContract.approve(AQUAFLUX_NFT_CONTRACT, ethers.MaxUint256);
      await sApproveTx.wait();
      logger.success('S tokens approved');
      logger.info(`Approval TX Link: ${PHAROS_SCAN_BASE_URL}${sApproveTx.hash}`);
    }
    
    logger.info("Crafting CS tokens...");
    const CRAFT_METHOD_ID = '0x4c10b523';
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const encodedParams = abiCoder.encode(['uint256'], [requiredAmount]);
    const calldata = CRAFT_METHOD_ID + encodedParams.substring(2);

    const craftTx = await wallet.sendTransaction({
      to: AQUAFLUX_NFT_CONTRACT,
      data: calldata,
      gasLimit: 300000
    });
    logger.info(`Crafting transaction sent! TX Hash: ${craftTx.hash}`);
    await craftTx.wait();
    logger.success('CS tokens crafted successfully.');
    logger.info(`Transaction Link: ${PHAROS_SCAN_BASE_URL}${craftTx.hash}`);
    return true;
  } catch (e) {
    logger.error(`Crafting tokens failed: ${e.reason || e.message}`);
    throw e;
  }
}

async function checkTokenHolding(accessToken) {
  logger.step('Checking token holding status...');

  for (let i = 0; i < 3; i++) {
    try {
      const response = await api.post('https://api.aquaflux.pro/api/v1/users/check-token-holding', null, {
        headers: aquaFluxHeaders(accessToken)
      });

      if (response.data.status === 'success') {
        const isHolding = response.data.data.isHoldingToken;
        logger.success(`Token holding check successful. Status: ${isHolding}`);
        return isHolding;
      } else {
        throw new Error('Check holding failed: ' + JSON.stringify(response.data));
      }
    } catch (e) {
      if (e.response && e.response.status === 500) {
        logger.warn(`AquaFlux server returned a 500 error. Retrying (${i + 1}/3)...`);
        await new Promise(r => setTimeout(r, 3000));
        continue;
      }
      logger.error(`Check token holding failed: ${e.message}`);
      throw e;
    }
  }
  throw new Error('Check token holding failed after multiple retries.');
}


async function getSignature(wallet, accessToken) {
  logger.step('Getting mint signature from AquaFlux API...');
  try {
    const nftType = 1; 
    const response = await api.post('https://api.aquaflux.pro/api/v1/users/get-signature', {
      walletAddress: wallet.address,
      requestedNftType: nftType
    }, {
      headers: aquaFluxHeaders(accessToken)
    });

    if (response.data.status === 'success') {
      logger.success('Signature obtained successfully!');
      return response.data.data;
    } else {
      throw new Error('Get signature failed: ' + JSON.stringify(response.data));
    }
  } catch (e) {
    logger.error(`Get signature failed: ${e.message}`);
    throw e;
  }
}

async function mintNFT(wallet, signatureData) {
  logger.step('Minting AquaFlux NFT...');
  try {
    const csTokenContract = new ethers.Contract(AQUAFLUX_TOKENS.CS, ERC20_ABI, wallet);
    const requiredAmount = ethers.parseUnits('100', 18);

    const csBalance = await csTokenContract.balanceOf(wallet.address);
    if (csBalance < requiredAmount) {
      throw new Error(`Insufficient CS tokens. Required: 100, Available: ${ethers.formatUnits(csBalance, 18)}`);
    }

    const allowance = await csTokenContract.allowance(wallet.address, AQUAFLUX_NFT_CONTRACT);
    if (allowance < requiredAmount) {
      logger.info('Approving CS tokens for minting...');
      const approvalTx = await csTokenContract.approve(AQUAFLUX_NFT_CONTRACT, ethers.MaxUint256);
      await approvalTx.wait();
      logger.success('CS tokens approved for minting.');
      logger.info(`Approval TX Link: ${PHAROS_SCAN_BASE_URL}${approvalTx.hash}`);
    }

    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime >= signatureData.expiresAt) {
      throw new Error(`Signature is already expired! Check your system's clock.`);
    }

    const nftContract = new ethers.Contract(AQUAFLUX_NFT_CONTRACT, AQUAFLUX_NFT_ABI, wallet);
    const tx = await nftContract.mint(signatureData.nftType, signatureData.expiresAt, signatureData.signature, { gasLimit: 400000 });
    
    logger.info(`NFT mint transaction sent! TX Hash: ${tx.hash}`);
    const receipt = await tx.wait();

    if (receipt.status === 0) {
      throw new Error('Transaction reverted on-chain. Check the transaction on a block explorer.');
    }
    logger.success('NFT minted successfully!');
    logger.info(`Transaction Link: ${PHAROS_SCAN_BASE_URL}${tx.hash}`);
    return true;
  } catch (e) {
    logger.error(`NFT mint failed: ${e.reason || e.message}`);
    throw e;
  }
}

async function executeAquaFluxFlow(wallet) {
  logger.step('--- Starting AquaFlux Flow ---');
  try {
    const accessToken = await aquaFluxLogin(wallet);
    await claimTokens(wallet);
    await craftTokens(wallet);
    await checkTokenHolding(accessToken); 
    const signatureData = await getSignature(wallet, accessToken);
    await mintNFT(wallet, signatureData);
    logger.success('AquaFlux flow completed successfully!');
    return true;
  } catch (e) {
    logger.error(`AquaFlux flow failed: ${e.message}`); 
    
    if (e.response && e.response.status === 500 && e.message.includes('AquaFlux server returned a 500 error')) {
        return 'API_500_ERROR'; 
    }
    return false; 
  }
}




async function fetchWithTimeout(url, options, timeout = 30000) {
    const source = axios.CancelToken.source();
    const timeoutId = setTimeout(() => source.cancel('Request timed out'), timeout);
    
    const response = await axios({
        ...options,
        url: url,
        cancelToken: source.token,
        headers: {
          'user-agent': USER_AGENT
        }
    });
    
    clearTimeout(timeoutId);
    return response;
}

async function robustFetchDodoRoute(url) {
    for (let i = 0; i < 7; i++) {
        try {
            const res = await fetchWithTimeout(url, { method: 'GET' });
            const data = res.data; 
            if (data.status !== -1 && data.data) return data.data; 
            logger.warn(`DODO API returned status -1 or no data. Retrying ${i + 1}/7...`);
        } catch (e) {
            logger.warn(`DODO API fetch failed (Retry ${i + 1}/7): ${e.message}`);
        }
        await new Promise(r => setTimeout(r, 5000));
    }
    throw new Error('DODO API failed after multiple retries.');
}

async function fetchDodoRoute(fromAddr, toAddr, userAddr, amountWei) {
    const deadline = Math.floor(Date.now() / 1000) + 600;
    const url = `https://api.dodoex.io/route-service/v2/widget/getdodoroute?chainId=${PHAROS_CHAIN_ID}&deadLine=${deadline}&apikey=a37546505892e1a952&slippage=3&source=dodoV2AndMixWasm&toTokenAddress=${toAddr}&fromTokenAddress=${fromAddr}&userAddr=${userAddr}&estimateGas=true&fromAmount=${amountWei.toString()}`;
    
    try {
        const result = await robustFetchDodoRoute(url);
        if (!result || !result.data) {
            throw new Error('Invalid DODO API response: missing data field');
        }
        logger.success('DODO Route info fetched successfully');
        return result;
    } catch (err) {
        logger.error(`DODO API fetch failed: ${err.message}`);
        throw err;
    }
}

async function approveToken(wallet, tokenAddr, tokenSymbol, amount, spender, decimals = 18) {
  if (tokenAddr === TOKENS.PHRS) return true;
  const contract = new ethers.Contract(tokenAddr, ERC20_ABI, wallet);
  try {
    const balance = await contract.balanceOf(wallet.address);
    if (balance < amount) {
      logger.error(`Insufficient ${tokenSymbol} balance. Have ${ethers.formatUnits(balance, decimals)}, need ${ethers.formatUnits(amount, decimals)}`);
      return false;
    }
    const allowance = await contract.allowance(wallet.address, spender);
    if (allowance >= amount) {
      logger.info(`${tokenSymbol} already approved for spender.`);
      return true;
    }
    logger.step(`Approving ${ethers.formatUnits(amount, decimals)} ${tokenSymbol} for spender ${spender}`);
    const tx = await contract.approve(spender, amount);
    logger.info(`Approval TX sent: ${tx.hash}`);
    await tx.wait();
    logger.success('Approval confirmed');
    logger.info(`Approval TX Link: ${PHAROS_SCAN_BASE_URL}${tx.hash}`);
    return true;
  } catch (e) {
    logger.error(`Approval for ${tokenSymbol} failed: ${e.message}`);
    return false;
  }
}

async function executeSwap(wallet, routeData, fromAddr, fromSymbol, amount, decimals) {
    if (fromAddr !== TOKENS.PHRS) {
        const approved = await approveToken(wallet, fromAddr, fromSymbol, amount, DODO_ROUTER, decimals);
        if (!approved) throw new Error(`Token approval for ${fromSymbol} failed`);
    }

    try {
        if (!routeData.data || routeData.data === '0x') {
            throw new Error('Invalid transaction data from DODO API');
        }
        const tx = await wallet.sendTransaction({
            to: routeData.to,
            data: routeData.data,
            value: BigInt(routeData.value || 0),
            gasLimit: BigInt(routeData.gasLimit || 500000)
        });
        logger.info(`Swap Transaction sent! TX Hash: ${tx.hash}`);
        await tx.wait();
        logger.success('Swap transaction confirmed!');
        logger.info(`Transaction Link: ${PHAROS_SCAN_BASE_URL}${tx.hash}`);
    } catch (e) {
        logger.error(`Swap TX failed: ${e.message}`);
        throw e;
    }
}

async function batchSwap(wallet, numberOfCycles, minDelay, maxDelay) {
    logger.step(`--- Starting Swap Flow (${numberOfCycles} cycles) ---`);
    const swapPairs = [
        { from: TOKENS.PHRS, to: TOKENS.USDT, amount: PHRS_TO_USDT_AMOUNT, fromSymbol: 'PHRS', toSymbol: 'USDT', decimals: 18 },
        { from: TOKENS.USDT, to: TOKENS.PHRS, amount: USDT_TO_PHRS_AMOUNT, fromSymbol: 'USDT', toSymbol: 'PHRS', decimals: 6 },
        { from: TOKENS.PHRS, to: TOKENS.USDC, amount: PHRS_TO_USDC_AMOUNT, fromSymbol: 'PHRS', toSymbol: 'USDC', decimals: 18 },
        { from: TOKENS.USDC, to: TOKENS.PHRS, amount: USDC_TO_PHRS_AMOUNT, fromSymbol: 'USDC', toSymbol: 'PHRS', decimals: 6 }
    ];

    for (let cycle = 0; cycle < numberOfCycles; cycle++) {
        logger.info(`--- Starting Swap Cycle ${cycle + 1} of ${numberOfCycles} ---`);
        for (let i = 0; i < swapPairs.length; i++) {
            const { from, to, amount, fromSymbol, toSymbol, decimals } = swapPairs[i];
            const pair = `${fromSymbol} -> ${toSymbol}`;
            logger.step(`Executing Swap #${i + 1}/4 in cycle ${cycle + 1}: ${pair}`);
            try {
                const data = await fetchDodoRoute(from, to, wallet.address, amount);
                await executeSwap(wallet, data, from, fromSymbol, amount, decimals);
            } catch (e) {
                logger.error(`Swap #${i + 1} failed: ${e.message}. Skipping to next swap.`);
            }
            if (i < swapPairs.length - 1) {
                await manualDelay(minDelay, maxDelay);
            }
        }
    }
}



async function addLiquidity(wallet, usdcAmountStr, usdtAmountStr) {
    logger.step('--- Starting Add Liquidity Flow ---');
    try {
        const baseInAmount = ethers.parseUnits(usdcAmountStr, 6);
        const quoteInAmount = ethers.parseUnits(usdtAmountStr, 6);

        logger.info(`Preparing to add ${usdcAmountStr} USDC and ${usdtAmountStr} USDT.`);

        logger.info('Checking USDC approval for liquidity...');
        const usdcApproved = await approveToken(wallet, TOKENS.USDC, 'USDC', baseInAmount, LIQUIDITY_CONTRACT, 6);
        if (!usdcApproved) throw new Error('USDC approval failed. Aborting.');

        logger.info('Checking USDT approval for liquidity...');
        const usdtApproved = await approveToken(wallet, TOKENS.USDT, 'USDT', quoteInAmount, LIQUIDITY_CONTRACT, 6);
        if (!usdtApproved) throw new Error('USDT approval failed. Aborting.');
        
        logger.step('Approvals successful. Preparing to add liquidity...');
        const liquidityContract = new ethers.Contract(LIQUIDITY_CONTRACT, LIQUIDITY_CONTRACT_ABI, wallet);


        const baseMinAmount = baseInAmount * BigInt(995) / BigInt(1000); 
        const quoteMinAmount = quoteInAmount * BigInt(995) / BigInt(1000); 
        const deadline = Math.floor(Date.now() / 1000) + 600; 

        const tx = await liquidityContract.addDVMLiquidity(
            DVM_POOL_ADDRESS, baseInAmount, quoteInAmount, baseMinAmount, quoteMinAmount, 0, deadline
        );

        logger.info(`Add Liquidity transaction sent! TX Hash: ${tx.hash}`);
        await tx.wait();
        logger.success('Transaction confirmed! Liquidity added successfully.');
        logger.info(`Transaction Link: ${PHAROS_SCAN_BASE_URL}${tx.hash}`);
    } catch (e) {
        logger.error(`Add Liquidity failed: ${e.message}`);
        throw e;
    }
}


async function sendTip(wallet, usernames, numberOfTipsPerUser, minDelay, maxDelay) {
    if (usernames.length === 0) {
        logger.warn('No usernames found in twitter.txt to send tips.');
        return;
    }
    logger.step(`--- Starting Tip Flow for ${usernames.length} username(s) ---`);

    for (const username of usernames) {
        logger.info(`Sending tips to username: ${username}`);
        for (let i = 0; i < numberOfTipsPerUser; i++) {
            logger.step(`Executing Tip #${i + 1} of ${numberOfTipsPerUser} to ${username}`);
            try {
                const minAmount = ethers.parseEther('0.0000001');
                const maxAmount = ethers.parseEther('0.00000015');
                const randomAmount = minAmount + (BigInt(Math.floor(Math.random() * 100)) % (maxAmount - minAmount + 1n));
                const amountStr = ethers.formatEther(randomAmount);

                logger.info(`Preparing to tip ${amountStr} PHRS to ${username} on X...`);

                const tipContract = new ethers.Contract(PRIMUS_TIP_CONTRACT, PRIMUS_TIP_ABI, wallet);
                const tokenStruct = [1, '0x0000000000000000000000000000000000000000'];
                const recipientStruct = ['x', username, randomAmount, []];

                const tx = await tipContract.tip(tokenStruct, recipientStruct, { value: randomAmount });

                logger.info(`Tip transaction sent! TX Hash: ${tx.hash}`);
                await tx.wait();
                logger.success(`Successfully tipped ${amountStr} PHRS to ${username}!`);
                logger.info(`Transaction Link: ${PHAROS_SCAN_BASE_URL}${tx.hash}`);
            } catch (e) {
                logger.error(`Tip transaction #${i + 1} to ${username} failed: ${e.message}`);
            }
            if (i < numberOfTipsPerUser - 1) {
                await manualDelay(minDelay, maxDelay);
            }
        }
        
        if (usernames.indexOf(username) < usernames.length - 1) {
            await manualDelay(minDelay, maxDelay);
        }
    }
}


async function loadUsernamesFromFile(filePath) {
    try {
        const data = fs.readFileSync(filePath, 'utf8');

        return data.split('\n').map(line => line.trim()).filter(line => line.length > 0);
    } catch (error) {
        if (error.code === 'ENOENT') {
            logger.error(`File "${filePath}" not found. Please create it and add usernames.`);
            return [];
        }
        logger.error(`Error reading file "${filePath}": ${error.message}`);
        return [];
    }
}



async function showCountdown() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    return new Promise(resolve => {
        const interval = setInterval(() => {
            const remaining = tomorrow.getTime() - new Date().getTime();
            if (remaining <= 0) {
                clearInterval(interval);
                process.stdout.write('\n');
                resolve();
                return;
            }
            const hours = Math.floor(remaining / (1000 * 60 * 60));
            const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
            const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
            logger.countdown(`Next run in ${hours}h ${minutes}m ${seconds}s`);
        }, 1000);
    });
}

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
function question(query) {
    return new Promise(resolve => rl.question(query, resolve));
}

(async () => {
    logger.banner();
    const fallbackProvider = await buildFallbackProvider(PHAROS_RPC_URLS, PHAROS_CHAIN_ID, 'pharos');
    const provider = await fallbackProvider.getProvider();
    const privateKeys = loadPrivateKeys();

    if (privateKeys.length === 0) {
        logger.error('No valid private keys found in .env. Please add PRIVATE_KEY_1, PRIVATE_KEY_2, etc.');
        process.exit(1);
    }
    logger.info(`${privateKeys.length} wallet(s) loaded from .env file.\n`);
    
    const runAquaFluxStr = await question(`${colors.cyan}Run AquaFlux Mint flow? (y/n): ${colors.reset}`);
    const runAquaFlux = runAquaFluxStr.toLowerCase() === 'y';

    const swapCycleStr = await question(`${colors.cyan}Enter the number of swap cycles per wallet (e.g., 2): ${colors.reset}`);
    const numberOfSwapCycles = parseInt(swapCycleStr) || 0;

    const runAddLiquidityStr = await question(`${colors.cyan}Run Add Liquidity flow? (y/n): ${colors.reset}`);
    const runAddLiquidity = runAddLiquidityStr.toLowerCase() === 'y';
    

    const usdcAmount = '10'; 
    const usdtAmount = '30.427458'; 
    
    if (runAddLiquidity) {

    }


    const tipCountStr = await question(`${colors.cyan}Enter number of tips to send per username (e.g., 1): ${colors.reset}`);
    const numberOfTipsPerUser = parseInt(tipCountStr) || 0;
    
    let usernamesToTip = [];
    if (numberOfTipsPerUser > 0) {
        usernamesToTip = await loadUsernamesFromFile('twitter.txt');
        if (usernamesToTip.length === 0) {
            logger.warn('No usernames found in twitter.txt. Tipping will be skipped.');
            numberOfTipsPerUser = 0; 
        } else {
            logger.info(`Loaded ${usernamesToTip.length} username(s) from twitter.txt.`);
        }
    }

    const minDelayStr = await question(`${colors.cyan}Enter the minimum delay between transactions (seconds, e.g., 10): ${colors.reset}`);
    const minDelay = parseInt(minDelayStr) || 10;

    const maxDelayStr = await question(`${colors.cyan}Enter the maximum delay between transactions (seconds, e.g., 30): ${colors.reset}`);
    const maxDelay = parseInt(maxDelayStr) || 30;

    console.log('\n');
    rl.close();

    while (true) {
        for (const [index, privateKey] of privateKeys.entries()) {
            const wallet = new ethers.Wallet(privateKey, provider);
            console.log('----------------------------------------------------------------');
            logger.success(`Processing Wallet ${index + 1}/${privateKeys.length}: ${wallet.address}`);
            console.log('----------------------------------------------------------------');

            let aquaFluxOutcome = false; 
            if (runAquaFlux) {
                try {
                    aquaFluxOutcome = await executeAquaFluxFlow(wallet); 
                } catch (e) {
                    logger.error(`A critical error occurred during the AquaFlux flow: ${e.message}`);
                    aquaFluxOutcome = false; 
                }
                
                if (aquaFluxOutcome === 'API_500_ERROR') { 
                    logger.warn('Note: AquaFlux flow might have failed due to external API issues (HTTP 500 from AquaFlux server). This is not an issue with your script logic.');
                } else if (aquaFluxOutcome === false && runAquaFlux) {
                    logger.warn('Note: AquaFlux flow failed for reasons other than a 500 API error. Check the logs above for details.');
                }
                await manualDelay(minDelay, maxDelay);
            } else if (index === 0) { 
                logger.warn('Skipping AquaFlux mints based on user input.');
            }
            
            if (numberOfSwapCycles > 0) {
                try {
                    await batchSwap(wallet, numberOfSwapCycles, minDelay, maxDelay);
                    logger.success('Swap cycles completed for this wallet!');
                } catch (e) {
                    logger.error(`A critical error occurred during the swap flow: ${e.message}`);
                }
                await manualDelay(minDelay, maxDelay);
            } else if (index === 0) { 
                logger.warn('Skipping swaps based on user input.');
            }

            if (runAddLiquidity) {
                try {
                    await addLiquidity(wallet, usdcAmount, usdtAmount);
                } catch (e) {
                    logger.error(`A critical error occurred during the Add Liquidity flow: ${e.message}`);
                }
                await manualDelay(minDelay, maxDelay);
            } else if (index === 0) { 
                logger.warn('Skipping add liquidity based on user input.');
            }

            
            if (usernamesToTip.length > 0 && numberOfTipsPerUser > 0) {
                try {
                    await sendTip(wallet, usernamesToTip, numberOfTipsPerUser, minDelay, maxDelay);
                    logger.success('Tipping operations completed for this wallet!');
                } catch (e) {
                    logger.error(`A critical error occurred during the tipping flow: ${e.message}`);
                }
            } else if (index === 0) { 
                logger.warn('Skipping tips based on user input or no usernames found.');
            }

            logger.success(`All tasks finished for wallet ${wallet.address}\n`);

            if (index < privateKeys.length - 1) {
                logger.info(`Waiting before starting the next wallet...`);
                await manualDelay(minDelay, maxDelay);
            }
        }

        logger.step('All wallets have been processed for this cycle.');
        await showCountdown();
    }
})();
