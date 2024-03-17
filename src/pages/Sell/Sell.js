import React, { Component } from 'react'
import { withNavigation } from '../../hocs'
import "../Token/Token.css"
import "../NFT/NFT.css"
import WalletState, { CHAIN_ID, CHAIN_ERROR_TIP, MAX_INT } from '../../state/WalletState';
import loading from '../../components/loading/Loading'
import toast from '../../components/toast/toast'
import Web3 from 'web3'
import { ERC20_ABI } from "../../abi/erc20"
import { showFromWei, toWei } from '../../utils'
import BN from 'bn.js'

import Header from '../Header';
import { SellPool_ABI } from '../../abi/SellPool_ABI';

class Sell extends Component {
    state = {
        chainId: 0,
        account: "",
        lang: "EN",
        local: {},
        tokenIn: '',
        wmxcOut: '',
    }
    constructor(props) {
        super(props);
        this.refreshInfo = this.refreshInfo.bind(this);
    }
    componentDidMount() {
        this.handleAccountsChanged();
        WalletState.onStateChanged(this.handleAccountsChanged);
        this.refreshInfo();
    }

    componentWillUnmount() {
        WalletState.removeListener(this.handleAccountsChanged);
        if (this._refreshInfoIntervel) {
            clearInterval(this._refreshInfoIntervel);
        }
    }

    handleAccountsChanged = () => {
        console.log(WalletState.wallet.lang);
        const wallet = WalletState.wallet;
        let page = this;
        page.setState({
            chainId: wallet.chainId,
            account: wallet.account,
            lang: WalletState.wallet.lang,
            local: page.getLocal()
        });
        this.getInfo();
    }

    getLocal() {
        let local = {};
        return local;
    }

    _refreshInfoIntervel;
    refreshInfo() {
        if (this._refreshInfoIntervel) {
            clearInterval(this._refreshInfoIntervel);
        }
        this._refreshInfoIntervel = setInterval(() => {
            this.getInfo();
        }, 15000);
    }

    async getInfo() {
        if (WalletState.wallet.chainId != CHAIN_ID) {
            return;
        }
        try {
            const web3 = new Web3(Web3.givenProvider);
            //兑换池合约
            const swapPoolContract = new web3.eth.Contract(SellPool_ABI, WalletState.config.SellPool);

            //兑换池代币信息
            const tokenInfo = await swapPoolContract.methods.getBaseInfo().call();
            //代币合约
            let tokenAddress = tokenInfo[0];
            //代币符号
            let tokenSymbol = tokenInfo[1];
            //代币精度
            let tokenDecimals = parseInt(tokenInfo[2]);
            //是否暂停卖出
            let pause = tokenInfo[3];

            this.setState({
                tokenAddress: tokenAddress,
                tokenSymbol: tokenSymbol,
                tokenDecimals: tokenDecimals,
                pause: pause,
            })

            let account = WalletState.wallet.account;
            if (account) {
                //用户信息
                const userInfo = await swapPoolContract.methods.getUserTokenInfo(account).call();
                let tokenBalance = new BN(userInfo[0], 10);
                let tokenAllowance = new BN(userInfo[1], 10);
                this.setState({
                    tokenBalance: tokenBalance,
                    tokenAllowance: tokenAllowance,
                    showTokenBalance: showFromWei(tokenBalance, tokenDecimals, 4),
                })
            }
        } catch (e) {
            console.log("getInfo", e);
            toast.show(e.message);
        } finally {
        }
    }

    //输入框变化
    handleTokenInChange(event) {
        let amountIn = this.state.tokenIn;
        if (event.target.validity.valid) {
            amountIn = event.target.value;
            if (amountIn) {
                this.getAmountOut(amountIn);
            } else {
                this.setState({ wmxcOut: '' });
            }

        }
        this.setState({ tokenIn: amountIn });
    }

    async getAmountOut(amountIn) {
        try {
            const web3 = new Web3(Web3.givenProvider);
            //兑换池合约
            const swapPoolContract = new web3.eth.Contract(SellPool_ABI, WalletState.config.SellPool);
            let tokenDecimals = this.state.tokenDecimals;
            let amount = toWei(amountIn, tokenDecimals);
            //获取能卖得多少MXC
            let amountOut = await swapPoolContract.methods.getAmountOut(amount).call();
            //当前输入一样才显示
            if (this.state.tokenIn == amountIn) {
                this.setState({
                    wmxcOut: showFromWei(amountOut, 18, 12),
                })
            }
        } catch (e) {
            console.log("getAmountOut", e);
            toast.show(e.message);
        } finally {
        }
    }

    connectWallet() {
        WalletState.connetWallet();
    }

    //卖出代币
    async sell() {
        if (WalletState.wallet.chainId != CHAIN_ID || !WalletState.wallet.account) {
            toast.show(CHAIN_ERROR_TIP);
            return;
        }
        loading.show();
        try {
            let tokenIn = this.state.tokenIn;
            //参与数量，处理精度
            let tokenInDecimals = toWei(tokenIn, this.state.tokenDecimals);
            //可用代币余额
            var tokenBalance = this.state.tokenBalance;
            if (tokenBalance.lt(tokenInDecimals)) {
                toast.show("余额不足");
                // return;
            }

            const web3 = new Web3(Web3.givenProvider);
            let account = WalletState.wallet.account;
            let approvalNum = this.state.tokenAllowance;
            //LP授权额度不够了，需要重新授权
            if (approvalNum.lt(tokenInDecimals)) {
                const tokenContract = new web3.eth.Contract(ERC20_ABI, this.state.tokenAddress);
                var transaction = await tokenContract.methods.approve(WalletState.config.SellPool, MAX_INT).send({ from: account });
                if (!transaction.status) {
                    toast.show("授权失败");
                    return;
                }
            }
            const swapPoolContract = new web3.eth.Contract(SellPool_ABI, WalletState.config.SellPool);
            //卖出
            var estimateGas = await swapPoolContract.methods.sell(tokenInDecimals).estimateGas({ from: account });
            var transaction = await swapPoolContract.methods.sell(tokenInDecimals).send({ from: account });
            if (transaction.status) {
                toast.show("卖出成功");
            } else {
                toast.show("卖出失败");
            }
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
            loading.hide();
        }
    }

    render() {
        return (
            <div className="Token NFT">
                <Header></Header>
                <div className='Module ModuleTop'>
                    <div className='ModuleContentWitdh RuleTitle mt10'>
                        <div>钱包余额</div>
                        <div>{this.state.showTokenBalance} {this.state.tokenSymbol}</div>
                    </div>
                </div>
                <div className='Module ModuleTop'>
                    <div className='InputBg mt10'>
                        <input className="Input" type="text" value={this.state.tokenIn}
                            placeholder={'请输入' + this.state.tokenSymbol + '数量'}
                            onChange={this.handleTokenInChange.bind(this)} pattern="[0-9.]*" >
                        </input>
                    </div>
                    <div className='mt10 prettyBg button' onClick={this.sell.bind(this)}>卖出</div>
                    <div className='ModuleContentWitdh RuleTitle mt5'>
                        <div>预计获得</div>
                        <div>{this.state.wmxcOut} MXC</div>
                    </div>
                </div>

                <div className='mt20'></div>
            </div>
        );
    }
}

export default withNavigation(Sell);