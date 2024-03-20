import React, { Component } from 'react'
import { withNavigation } from '../../hocs'
import "../Token/Token.css"
import "../NFT/NFT.css"
import WalletState, { CHAIN_ID, ZERO_ADDRESS, CHAIN_ERROR_TIP, CHAIN_SYMBOL, MAX_INT } from '../../state/WalletState';
import loading from '../../components/loading/Loading'
import toast from '../../components/toast/toast'
import Web3 from 'web3'
import { ERC20_ABI } from "../../abi/erc20"
import { showFromWei, showLongAccount, toWei } from '../../utils'
import BN from 'bn.js'

import Header from '../Header';
import { DHMLPPool_ABI } from '../../abi/DHMLPPool_ABI';
import moment from 'moment';

class DHMLP extends Component {
    state = {
        chainId: 0,
        account: "",
        lang: "EN",
        local: {},
        amountIn: "",
        records: [],
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
            //LP分红合约
            const poolContract = new web3.eth.Contract(DHMLPPool_ABI, WalletState.config.DHMLPPool);
            //LP分红合约代币信息
            const tokenInfo = await poolContract.methods.getTokenInfo().call();
            //lp合约
            let lpToken = tokenInfo[0];
            //lp符号
            let lpSymbol = tokenInfo[1];
            //lp精度
            let lpDecimals = parseInt(tokenInfo[2]);
            //代币DHM合约
            let token = tokenInfo[3];
            //代币DHM符号
            let tokenSymbol = tokenInfo[4];
            //代币DHM精度
            let tokenDecimals = parseInt(tokenInfo[5]);
            //门票REFI合约
            let ticket = tokenInfo[6];
            //门票REFI符号
            let ticketSymbol = tokenInfo[7];
            //门票REFI精度
            let ticketDecimals = parseInt(tokenInfo[8]);
            //usdt精度固定18
            let usdtDecimals = 18;
            //LP分红合约基本信息
            const baseInfo = await poolContract.methods.getPoolInfo().call();
            //锁仓周期
            let lockDuration = parseInt(baseInfo[0]) * 1000 / 86400;
            lockDuration = parseInt(lockDuration) / 1000;
            //每天限制地址数量
            let dailyAddressNum = parseInt(baseInfo[1]);
            //当天参与地址数量
            let todayAddressNum = parseInt(baseInfo[2]);
            //每日限制地址参与次数
            let dailyJoinNumMax = parseInt(baseInfo[3]);
            //每日限制参与USDT数量
            let dailyAmountMax = new BN(baseInfo[4], 10);
            //1U有多少mxc
            let mxcAmountPerUsdt = new BN(baseInfo[5], 10);
            //1U有多少DHM代币
            let tokenPerUsdt = new BN(baseInfo[6], 10);
            //加池子门票比例，默认100%
            let ticketRate = parseInt(baseInfo[7]);
            //区块时间
            let blockTime = parseInt(baseInfo[8]);
            //全部锁仓lp
            let totalLPAmount = new BN(baseInfo[9], 10);
            //领取子门票比例，默认100%
            let claimTicketRate = parseInt(baseInfo[10]);
            //计算MXC价格，价格=1U/1U的币数量*币的精度
            let mxcPrice = toWei('1', 18).mul(toWei('1', usdtDecimals)).div(mxcAmountPerUsdt);
            //代币价格
            let tokenPrice = toWei('1', tokenDecimals).mul(toWei('1', usdtDecimals), tokenDecimals).div(tokenPerUsdt);
            let mxcMax = mxcAmountPerUsdt.mul(dailyAmountMax).div(toWei('1', usdtDecimals));
            let ticketMax = tokenPerUsdt.mul(dailyAmountMax).div(toWei('1', tokenDecimals));
            this.setState({
                dailyAddressNum: dailyAddressNum,
                todayAddressNum: todayAddressNum,
                dailyJoinNumMax: dailyJoinNumMax,
                dailyAmountMax: dailyAmountMax,
                showDailyAmountMax: showFromWei(dailyAmountMax, usdtDecimals, 2),
                showMxcMax: showFromWei(mxcMax, 18, 6),
                showTicketMax: showFromWei(ticketMax, tokenDecimals, 2),
                ticket: ticket,
                ticketDecimals: ticketDecimals,
                ticketSymbol: ticketSymbol,
                usdtDecimals: usdtDecimals,
                tokenAddress: token,
                tokenDecimals: tokenDecimals,
                tokenSymbol: tokenSymbol,
                mxcAmountPerUsdt: mxcAmountPerUsdt,
                tokenPerUsdt: tokenPerUsdt,
                lockDuration: lockDuration,
                mxcPrice: showFromWei(mxcPrice, usdtDecimals, 8),
                tokenPrice: showFromWei(tokenPrice, usdtDecimals, 12),
                ticketRate: ticketRate,
                showTicketRate: ticketRate / 100,
                blockTime: blockTime,
                totalLPAmount: showFromWei(totalLPAmount, lpDecimals, 6),
            })

            let account = WalletState.wallet.account;
            if (account) {
                //用户LP信息
                const userInfo = await poolContract.methods.getUserInfo(account).call();
                //待领取收益
                let pendingReward = new BN(userInfo[0], 10);
                //MXC余额
                let balance = new BN(userInfo[1], 10);
                //代币余额
                let tokenBalance = new BN(userInfo[2], 10);
                //门票余额
                let ticketBalance = new BN(userInfo[3], 10);
                //门票授权
                let ticketAllowance = new BN(userInfo[4], 10);
                //今日参与次数
                let todayJoinNum = parseInt(userInfo[5]);
                //今日参与数量
                let toayJoinAmount = new BN(userInfo[6], 10);
                //锁仓的lpshul
                let stakeLPAmount = new BN(userInfo[7], 10);
                //领取要扣多少REFI
                let claimTicketAmount = pendingReward.mul(new BN(claimTicketRate)).div(new BN(10000))
                this.setState({
                    balance: balance,
                    showBalance: showFromWei(balance, 18, 6),
                    showTokenBalance: showFromWei(tokenBalance, tokenDecimals, 2),
                    ticketBalance: ticketBalance,
                    showTicketBalance: showFromWei(ticketBalance, ticketDecimals, 2),
                    pendingReward: showFromWei(pendingReward, tokenDecimals, 4),
                    ticketAllowance: ticketAllowance,
                    todayJoinNum: todayJoinNum,
                    toayJoinAmount: toayJoinAmount,
                    showToayJoinAmount: showFromWei(toayJoinAmount, usdtDecimals, 2),
                    stakeLPAmount: showFromWei(stakeLPAmount, lpDecimals, 6),
                    claimTicketAmount: showFromWei(claimTicketAmount, ticketDecimals, 4),
                })
                //记录列表
                let records = [];
                let startIndex = 0;
                let pageSize = 100;
                let index = 0;
                while (true) {
                    //获取记录列表
                    let recordsResult = await poolContract.methods.getRecords(account, startIndex, pageSize).call();
                    //lp数量列表
                    let amountList = recordsResult[0];
                    //开始时间
                    let startTimeList = recordsResult[1];
                    //解锁时间
                    let endTimeList = recordsResult[2];
                    //状态，1=已领取，0=未领取
                    let statusList = recordsResult[3];
                    //mxc数量
                    let amountEthList = recordsResult[4];
                    //代币数量
                    let amountTokenList = recordsResult[5];
                    let len = amountList.length;
                    for (let i = 0; i < len; ++i) {
                        let status = parseInt(statusList[i]);
                        let endTime = parseInt(endTimeList[i]);
                        let statusLabel = '冻结';
                        if (1 == status) {
                            statusLabel = "已提取";
                        } else if (blockTime >= endTime) {
                            statusLabel = "提取";
                        }
                        let amountEth = new BN(amountEthList[i],10);
                        //计算lp里实际有多少代币
                        let lpAmountToken = amountEth.mul(tokenPerUsdt).div(mxcAmountPerUsdt);
                        records.push({
                            index: index,
                            status: status,
                            statusLabel: statusLabel,
                            amount: showFromWei(amountList[i], lpDecimals, 6),
                            startTime: this.formatTime(startTimeList[i]),
                            endTime: this.formatTime(endTime),
                            amountEth: showFromWei(amountEthList[i], 18, 8),
                            //合约返回的这个金额是扣过撤池子税的
                            amountToken: showFromWei(amountTokenList[i], tokenDecimals, 6),
                            //实际含有的代币数量
                            lpAmountToken:showFromWei(lpAmountToken,tokenDecimals,6),
                        });
                        ++index;
                    }
                    if (len < pageSize) {
                        break;
                    }
                    startIndex += pageSize;
                }

                this.setState({
                    records: records
                });
            }
            this.onPriceChange(this.state.amountIn, mxcAmountPerUsdt, tokenPerUsdt, ticketRate);
        } catch (e) {
            console.log("getInfo", e);
            toast.show(e.message);
        } finally {
        }
    }

    formatTime(timestamp) {
        return moment(new BN(parseInt(timestamp)).mul(new BN(1000)).toNumber()).format("YYYY-MM-DD HH:mm:ss");
    }

    //输入框变化，计算需要多少代币
    handleAmountChange(event) {
        let amount = this.state.amountIn;
        if (event.target.validity.valid) {
            amount = event.target.value;
        }
        this.setState({ amountIn: amount });
        this.onPriceChange(amount, this.state.mxcAmountPerUsdt, this.state.tokenPerUsdt, this.state.ticketRate);
    }

    //获取到新价格时更新数据
    onPriceChange(amount, mxcAmountPerUsdt, tokenPerUsdt, ticketRate) {
        //自己参与数量变化
        let mxcAmount = '';
        let ticketAmount = '';
        if (amount) {
            mxcAmount = mxcAmountPerUsdt.mul(new BN(amount, 10));
            let tokenAmount = tokenPerUsdt.mul(new BN(amount, 10));
            ticketAmount = tokenAmount.mul(new BN(ticketRate)).div(new BN(10000));
            mxcAmount = showFromWei(mxcAmount, 18, 8);
            ticketAmount = showFromWei(ticketAmount, this.state.ticketDecimals, 6);
        }
        this.setState({ mxcAmount: mxcAmount, ticketAmount: ticketAmount, });
    }

    connectWallet() {
        WalletState.connetWallet();
    }

    //参与LP挖矿
    async deposit() {
        if (WalletState.wallet.chainId != CHAIN_ID || !WalletState.wallet.account) {
            toast.show(CHAIN_ERROR_TIP);
            return;
        }
        loading.show();
        try {
            let usdtAmount = toWei(this.state.amountIn, this.state.usdtDecimals);
            const web3 = new Web3(Web3.givenProvider);
            let account = WalletState.wallet.account;
            //支付MXC，设置5%滑点
            let mxcValue = toWei(this.state.mxcAmount, 18);
            mxcValue = mxcValue.mul(new BN(105)).div(new BN(100));
            if (this.state.balance.lt(mxcValue)) {
                toast.show('MXC余额不足');
            }
            let ticketAmount = toWei(this.state.ticketAmount, this.state.ticketDecimals);
            //设置5%滑点
            ticketAmount = ticketAmount.mul(new BN(105)).div(new BN(100));
            if (this.state.ticketBalance.lt(ticketAmount)) {
                toast.show(this.state.ticketSymbol + '余额不足');
            }
            let approvalNum = this.state.ticketAllowance;
            let gasPrice = await web3.eth.getGasPrice();
            gasPrice = new BN(gasPrice, 10);
            //门票授权额度不够了，需要重新授权
            if (approvalNum.lt(ticketAmount)) {
                const tokenContract = new web3.eth.Contract(ERC20_ABI, this.state.ticket);
                let estimateGas = await tokenContract.methods.approve(WalletState.config.DHMLPPool, MAX_INT).estimateGas({ from: account });
                estimateGas = new BN(estimateGas, 10).mul(new BN(150)).div(new BN(100));
                let transaction = await tokenContract.methods.approve(WalletState.config.DHMLPPool, MAX_INT).send({
                    from: account,
                    gas: estimateGas,
                    gasPrice: gasPrice,
                });
                if (!transaction.status) {
                    toast.show("授权失败");
                    return;
                }
            }

            const poolContract = new web3.eth.Contract(DHMLPPool_ABI, WalletState.config.DHMLPPool);
            //参与挖矿
            let estimateGas = await poolContract.methods.deposit(usdtAmount).estimateGas({ from: account, value: mxcValue });
            estimateGas = new BN(estimateGas, 10).mul(new BN(150)).div(new BN(100));
            let transaction = await poolContract.methods.deposit(usdtAmount).send({
                from: account,
                value: mxcValue,
                gas: estimateGas,
                gasPrice: gasPrice,
            });
            if (transaction.status) {
                toast.show("参与成功");
            } else {
                toast.show("参与失败");
            }
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
            loading.hide();
        }
    }

    //领取奖励
    async claim() {
        let account = WalletState.wallet.account;
        if (!account) {
            this.connectWallet();
            return;
        }
        loading.show();
        try {
            const web3 = new Web3(Web3.givenProvider);
            const poolContract = new web3.eth.Contract(DHMLPPool_ABI, WalletState.config.DHMLPPool);
            let estimateGas = await poolContract.methods.claim().estimateGas({ from: account });
            estimateGas = new BN(estimateGas, 10).mul(new BN(150)).div(new BN(100));
            let gasPrice = await web3.eth.getGasPrice();
            gasPrice = new BN(gasPrice, 10);
            let transaction = await poolContract.methods.claim().send({
                from: account,
                gas: estimateGas,
                gasPrice: gasPrice,
            });
            if (transaction.status) {
                toast.show("领取成功");
            } else {
                toast.show("领取失败");
            }
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
            loading.hide();
        }
    }

    //提取LP
    async withdraw(index) {
        let account = WalletState.wallet.account;
        if (!account) {
            this.connectWallet();
            return;
        }
        loading.show();
        try {
            const web3 = new Web3(Web3.givenProvider);
            const poolContract = new web3.eth.Contract(DHMLPPool_ABI, WalletState.config.DHMLPPool);
            let estimateGas = await poolContract.methods.withdraw(index).estimateGas({ from: account });
            estimateGas = new BN(estimateGas, 10).mul(new BN(150)).div(new BN(100));
            let gasPrice = await web3.eth.getGasPrice();
            gasPrice = new BN(gasPrice, 10);
            let transaction = await poolContract.methods.withdraw(index).send({
                from: account,
                gas: estimateGas,
                gasPrice: gasPrice,
            });
            if (transaction.status) {
                toast.show("提取成功");
            } else {
                toast.show("提取失败");
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
                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>MXC价格</div>
                        <div>{this.state.mxcPrice}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt5'>
                        <div>{this.state.tokenSymbol}价格</div>
                        <div>{this.state.tokenPrice}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt5'>
                        <div>全网每天名额</div>
                        <div>{this.state.todayAddressNum}/{this.state.dailyAddressNum}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt5'>
                        <div>地址每天限制金额</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>{this.state.showDailyAmountMax}USDT={this.state.showMxcMax}MXC={this.state.showTicketMax}{this.state.ticketSymbol}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt5'>
                        <div>锁仓时间</div>
                        <div>{this.state.lockDuration}天</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt5'>
                        <div>地址每天参与次数</div>
                        <div>{this.state.dailyJoinNumMax}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt10'>
                        <div>总锁仓LP</div>
                        <div>{this.state.totalLPAmount}</div>
                    </div>
                </div>

                <div className='Module ModuleTop'>
                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>锁仓LP</div>
                        <div>{this.state.stakeLPAmount}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt10'>
                        <div>今日参与次数</div>
                        <div>{this.state.todayJoinNum}/{this.state.dailyJoinNumMax}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>今日参与金额</div>
                        <div>{this.state.showToayJoinAmount}/{this.state.showDailyAmountMax}</div>
                    </div>
                    <div className='InputBg mt10'>
                        <input className="Input" type="text" value={this.state.amountIn}
                            placeholder={'请参与USDT输入数量'}
                            onChange={this.handleAmountChange.bind(this)} pattern="[0-9]*" >
                        </input>
                    </div>
                    <div className='mt10 prettyBg button' onClick={this.deposit.bind(this)}>{this.state.mxcAmount}MXC+{this.state.ticketAmount}{this.state.ticketSymbol}参与</div>
                    <div className='ModuleContentWitdh RuleTitle mt10'>
                        <div>余额</div>
                        <div>{this.state.showBalance}MXC/{this.state.showTicketBalance} {this.state.ticketSymbol}</div>
                    </div>
                </div>

                <div className='Module ModuleTop'>
                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>{this.state.tokenSymbol}余额</div>
                        <div>{this.state.showTokenBalance}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt5'>
                        <div>待领取分红</div>
                        <div>{this.state.pendingReward}</div>
                    </div>
                    <div className='mt10 prettyBg button' onClick={this.claim.bind(this)}>扣{this.state.claimTicketAmount}{this.state.ticketSymbol} 领取</div>
                </div>

                <div className='ModuleTop'>
                    <div className='Title flex center'>LP记录 {this.state.records.length}</div>
                    {this.state.records.map((item, index) => {
                        return <div className='Module ModuleTop' key={index}>
                            <div className='ModuleContentWitdh RuleTitle'>
                                <div className=''>NO.{index + 1} </div>
                                <div className=''>{item.amount}LP</div>
                            </div>
                            <div className='ModuleContentWitdh RuleTitle'>
                                <div className=''>开始: {item.startTime}</div>
                                <div className=''>解锁: {item.endTime}</div>
                            </div>
                            <div className='ModuleContentWitdh RuleTitle'>
                                <div className=''>{item.amountEth} MXC</div>
                                <div className=''>{item.lpAmountToken} {this.state.tokenSymbol}</div>
                            </div>
                            <div className='mt10 prettyBg button' onClick={this.withdraw.bind(this, item.index)}>{item.statusLabel}</div>
                        </div>
                    })}
                </div>

                <div className='mt20'></div>
            </div>
        );
    }
}

export default withNavigation(DHMLP);