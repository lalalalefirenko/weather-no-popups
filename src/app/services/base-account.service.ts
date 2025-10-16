import { Injectable } from '@angular/core';
import { createBaseAccountSDK, ProviderInterface } from '@base-org/account';

/**
 * A service that manages interaction with the Base Account SDK.
 * It enables the use of sub-accounts with automatic spending permissions,
 * allowing users to perform onchain actions without repetitive wallet pop-ups.
 */
@Injectable({
    providedIn: 'root'
})
export class BaseAccountService {
    private sdk: any;
    private provider: ProviderInterface;
    private universalAddress: string | null = null;
    private subAccount: { address: string } | null = null;

    constructor() {
        /**
         * Initializes the Base Account SDK.
         * Configures automatic sub-account creation on connection
         * and sets default account to the sub-account.
         */
        this.sdk = createBaseAccountSDK({
            appName: 'Weather NFT App',
            appLogoUrl: '',
            appChainIds: [8453], // Base mainnet (use 84532 for Base Sepolia testnet)
            subAccounts: {
                creation: 'on-connect',
                defaultAccount: 'sub'
                // Auto-spend (auto transfer) is enabled by default
            }
            // Optionally: paymasterUrls, capabilities, etc.
        });

        // Retrieve the EIP-1193 provider from SDK
        this.provider = this.sdk.getProvider();
    }

    /**
     * Connects the user’s wallet via the Base Account SDK.
     * This request will automatically create and/or connect
     * the universal and sub-account pair.
     *
     * @returns {Promise<string[]>} A list of connected account addresses:
     * [universalAccount, subAccount]
     */
    async connectWallet(): Promise<string[]> {
        const accounts: string[] = await this.provider.request({
            method: 'eth_requestAccounts',
            params: []
        }) as string[];

        this.universalAddress = accounts[0];

        if (accounts.length >= 2) {
            this.subAccount = { address: accounts[1] };
        }

        return accounts;
    }

    /**
     * Ensures that a sub-account exists.
     * If it already exists, returns it.
     * Otherwise, it attempts to retrieve one via RPC or create a new sub-account.
     *
     * @returns {Promise<{ address: string }>} The sub-account information object.
     */
    async ensureSubAccount(): Promise<{ address: string }> {
        if (this.subAccount) {
            return this.subAccount;
        }

        const resp = await this.provider.request({
            method: 'wallet_getSubAccounts',
            params: [{
                account: this.universalAddress,
                domain: window.location.origin
            }]
        }) as { subAccounts: Array<{ address: string }> };

        if (resp.subAccounts && resp.subAccounts.length > 0) {
            this.subAccount = { address: resp.subAccounts[0].address };
        } else {
            const newSub = await this.provider.request({
                method: 'wallet_addSubAccount',
                params: [
                    {
                        account: {
                            type: 'create'
                        }
                    }
                ]
            }) as { address: string };

            this.subAccount = { address: newSub.address };
        }

        return this.subAccount;
    }

    /**
     * Sends an onchain transaction using the sub-account through
     * the Base Account SDK “wallet_sendCalls” method.
     * This enables gasless and batched calls via auto-spend.
     *
     * @param {string} to - Target contract or recipient address.
     * @param {string} data - Encoded transaction data (e.g. ABI-encoded call).
     * @param {string} [value='0x0'] - Optional ETH value in hex format.
     * @returns {Promise<any>} The transaction result from the SDK.
     */
    async sendTransactionFromSub(to: string, data: string, value = '0x0'): Promise<any> {
        const sub = await this.ensureSubAccount();

        const callsParam = {
            version: '2.0',
            atomicRequired: true,
            from: sub.address,
            calls: [
                {
                    to,
                    data,
                    value
                }
            ]
        };

        const result = await this.provider.request({
            method: 'wallet_sendCalls',
            params: [callsParam]
        });

        return result;
    }

    /**
     * Sends a transaction directly through the EIP-1193 RPC method “eth_sendTransaction”.
     * This is an alternative to the Base-specific “wallet_sendCalls” method.
     *
     * @param {string} to - Target contract address.
     * @param {string} data - Encoded transaction data.
     * @param {string} [value='0x0'] - ETH amount in hex format.
     * @returns {Promise<any>} The raw transaction hash or result.
     */
    async sendTxViaEthRpc(to: string, data: string, value = '0x0'): Promise<any> {
        const sub = await this.ensureSubAccount();

        const txReq = {
            from: sub.address,
            to,
            data,
            value
        };

        const tx = await this.provider.request({
            method: 'eth_sendTransaction',
            params: [txReq]
        });

        return tx;
    }

    /**
     * Retrieves the address of the sub-account,
     * creating one automatically if necessary.
     *
     * @returns {Promise<string>} The sub-account address.
     */
    async getSubAccountAddress(): Promise<string> {
        const sub = await this.ensureSubAccount();
        return sub.address;
    }

    /**
     * Returns the universal (main) account address.
     *
     * @returns {string | null} The universal account address, or null if not connected.
     */
    getUniversalAddress(): string | null {
        return this.universalAddress;
    }
}
