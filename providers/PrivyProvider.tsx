'use client';

import { defineChain } from 'viem';
import { useCallback, useEffect } from 'react';
import { PrivyProvider as PrivyClientProvider, usePrivy, useWallets } from '@privy-io/react-auth';
import { ethers } from 'ethers';
import Cookies from 'js-cookie';
import { useAuth } from './AuthProvider';
import api from '@/app/api/refresh/api';

const CapxChain = defineChain({
  id: Number(process.env.NEXT_PUBLIC_CAPX_CHAIN_ID),
  name: process.env.NEXT_PUBLIC_CAPX_CHAIN_NETWORK_NAME!,
  network: process.env.NEXT_PUBLIC_CAPX_CHAIN_NETWORK_NAME!,
  nativeCurrency: {
    decimals: 18,
    name: 'ether',
    symbol: process.env.NEXT_PUBLIC_CAPX_CHAIN_CURRENCY!,
  },
  rpcUrls: {
    default: { 
      http: [process.env.NEXT_PUBLIC_CAPX_CHAIN_RPC_URL!],
      webSocket: [process.env.NEXT_PUBLIC_CAPX_WEB_SOCKET_URL!],
    },
    public: {
      http: [process.env.NEXT_PUBLIC_CAPX_CHAIN_RPC_URL!],
      webSocket: [process.env.NEXT_PUBLIC_CAPX_WEB_SOCKET_URL!],
    },
  },
  blockExplorers: {
    default: {
      name: 'Explorer',
      url: process.env.NEXT_PUBLIC_CAPX_CHAIN_EXPLORE_URL!,
    },
  },
});

function PrivyWrapper({ children }: { children: React.ReactNode }) {
  const { txDetails, userDetails, getUserDetails } = useAuth();
  const { wallets } = useWallets();
  const { user, authenticated, createWallet } = usePrivy();

  const mintXId = async () => {
    if (Object.keys(txDetails).length === 0) return false;

    try {
      await api.post('/wallet/faucet');
      
      const wallet = wallets.find(w => w.walletClientType === 'privy');
      if (!wallet) return false;

      await wallet.switchChain(Number(process.env.NEXT_PUBLIC_CAPX_CHAIN_ID));
      const provider = await wallet.getEthersProvider();
      const signer = provider.getSigner();
      
      const contract = new ethers.Contract(
        txDetails.contract_address,
        txDetails.contract_abi,
        signer
      );

      const tx = await signer.sendTransaction({
        to: txDetails.contract_address,
        data: contract.interface.encodeFunctionData('createProfile', [
          txDetails.input_params._profileParams,
          txDetails.input_params._profileData,
        ]),
        chainId: Number(process.env.NEXT_PUBLIC_CAPX_CHAIN_ID),
      });

      await tx.wait();
      await getUserDetails();
      return true;
    } catch (error) {
      console.error('Mint XID error:', error);
      return false;
    }
  };

  useEffect(() => {
    let timer: NodeJS.Timeout;

    (async () => {
      if (txDetails && userDetails?.version < 3 && wallets.length > 0) {
        const isMinted = await mintXId();
        if (!isMinted) {
          timer = setInterval(async () => {
            const isXIdMinted = await mintXId();
            if (isXIdMinted) clearInterval(timer);
          }, 300000);
        }
      }
    })();

    return () => clearInterval(timer);
  }, [txDetails, userDetails, wallets.length]);

  useEffect(() => {
    if (authenticated && !user?.wallet) {
      createWallet();
    }
  }, [authenticated, user, createWallet]);

  return <>{wallets.length > 0 ? children : <p>Loading...</p>}</>;
}

export function PrivyProvider({ children }: { children: React.ReactNode }) {
  const { isUserCreated } = useAuth();

  const getCustomToken = useCallback(async () => {
    try {
      if (!isUserCreated) return undefined;
      const token = Cookies.get('access_token');
      return token || undefined;
    } catch (error) {
      console.error('Error getting custom token:', error);
      return undefined;
    }
  }, [isUserCreated]);

  return (
    <PrivyClientProvider
      appId={process.env.NEXT_PUBLIC_PRIVY_APP_ID!}
      config={{
        supportedChains: [CapxChain],
        defaultChain: CapxChain,
        appearance: {
          theme: 'dark',
          accentColor: '#676FFF',
          logo: 'https://internal.app.capx.fi/favicon.png',
          showWalletLoginFirst: false,
        },
        customAuth: {
          enabled: isUserCreated,
          getCustomAccessToken: getCustomToken,
          isLoading: false
        },
      }}
    >
      <PrivyWrapper>{children}</PrivyWrapper>
    </PrivyClientProvider>
  );
}