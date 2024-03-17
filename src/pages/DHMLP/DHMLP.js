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
            //门票比例，默认100%
            let ticketRate = parseInt(baseInfo[7]);
            //区块时间
            let blockTime = parseInt(baseInfo[8]);
            //计算MXC价格，价格=1U/1U的币数量*币的精度
            let mxcPrice = toWei('1', 18).mul(toWei('1', usdtDecimals)).div(mxcAmountPerUsdt);
            //代币价格
            let tokenPrice = toWei('1', tokenDecimals).mul(toWei('1', usdtDecimals), tokenDecimals).div(tokenPerUsdt);
            this.setState({
                dailyAddressNum: dailyAddressNum,
                todayAddressNum: todayAddressNum,
                dailyJoinNumMax: dailyJoinNumMax,
                dailyAmountMax: dailyAmountMax,
                showDailyAmountMax: showFromWei(dailyAmountMax, usdtDecimals, 2),
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
                let todayJoinNum = new BN(userInfo[5], 10);
                //今日参与数量
                let toayJoinAmount = new BN(userInfo[6], 10);
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
                })
                //记录列表
                let records = [];
                let startIndex = 0;
                let pageSize = 100;
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
                        records.push({
                            status: status,
                            statusLabel: statusLabel,
                            amount: showFromWei(amountList[i], lpDecimals, 6),
                            startTime: this.formatTime(startTimeList[i]),
                            endTime: this.formatTime(endTime),
                            amountEth: showFromWei(amountEthList[i], 18, 8),
                            amountToken: showFromWei(amountTokenList[i], tokenDecimals, 6),
                        });
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
            this.onPriceChange();
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
        let tokenAmounts = this.state.tokenAmounts;
        if (event.target.validity.valid) {
            amount = event.target.value;
            if (amount) {
                let mxcAmount = this.state.mxcAmountPerUsdt.mul(new BN(amount, 10));
                let refiAmount = this.state.tokenPerUsdt.mul(new BN(amount, 10));
                tokenAmounts = [showFromWei(refiAmount, this.state.tokenDecimals, 6), showFromWei(mxcAmount, 18, 8)];
            } else {
                tokenAmounts = ['', ''];
            }
        }
        this.setState({ amountIn: amount, tokenAmounts: tokenAmounts });
    }

    //获取到新价格时更新数据
    onPriceChange() {
        //自己参与数量变化
        let amount = this.state.amountIn;
        let tokenAmounts = this.state.tokenAmounts;
        if (amount) {
            let mxcAmount = this.state.mxcAmountPerUsdt.mul(new BN(amount, 10));
            let refiAmount = this.state.tokenPerUsdt.mul(new BN(amount, 10));
            tokenAmounts = [showFromWei(refiAmount, this.state.tokenDecimals, 6), showFromWei(mxcAmount, 18, 8)];
        } else {
            tokenAmounts = ['', ''];
        }
        this.setState({ amountIn: amount, tokenAmounts: tokenAmounts });

        //帮参与数量变化
        let helpAmount = this.state.helpAmountIn;
        let helpMxcAmount = this.state.helpMxcAmount;
        let helpTokenAmount = this.state.helpTokenAmount;
        if (helpAmount) {
            //帮参与支付数量
            let payUsdt = toWei(helpAmount, this.state.usdtDecimals).mul(new BN(this.state.helpPayRate)).div(new BN(10000));
            let mxcUsdt = payUsdt.mul(new BN(this.state.helpPayMxcRate)).div(new BN(10000));
            let usdtUnit = toWei('1', this.state.usdtDecimals);
            //帮参与MXC数量
            let mxcAmount = this.state.mxcAmountPerUsdt.mul(mxcUsdt).div(usdtUnit);
            helpMxcAmount = showFromWei(mxcAmount, 18, 8);
            //帮参与REFI数量
            let refiAmount = this.state.tokenPerUsdt.mul(payUsdt.sub(mxcUsdt)).div(usdtUnit);
            helpTokenAmount = showFromWei(refiAmount, this.state.tokenDecimals, 6);
        } else {
            helpMxcAmount = '';
            helpTokenAmount = '';
        }
        this.setState({ helpAmountIn: helpAmount, helpMxcAmount: helpMxcAmount, helpTokenAmount: helpTokenAmount });
    }

    connectWallet() {
        WalletState.connetWallet();
    }

    //参与挖矿
    async join() {
        if (WalletState.wallet.chainId != CHAIN_ID || !WalletState.wallet.account) {
            toast.show(CHAIN_ERROR_TIP);
            return;
        }
        loading.show();
        try {
            let amount = this.state.amountIn;
            let usdtAmount = toWei(amount, this.state.usdtDecimals);
            if (usdtAmount.lt(this.state.minAmount)) {
                toast.show("最少参与" + this.state.showMinAmount);
            }
            let selIndex = this.state.selIndex;
            let payAmount;
            let mxcValue = new BN(0);

            const web3 = new Web3(Web3.givenProvider);
            let account = WalletState.wallet.account;

            //REFI
            if (0 == selIndex) {
                payAmount = toWei(this.state.tokenAmounts[selIndex], this.state.tokenDecimals);
                if (this.state.tokenBalance.lt(payAmount)) {
                    toast.show('REFI余额不足');
                }
                let approvalNum = this.state.tokenAllowance;
                //LP授权额度不够了，需要重新授权
                if (approvalNum.lt(payAmount)) {
                    const tokenContract = new web3.eth.Contract(ERC20_ABI, this.state.tokenAddress);
                    var transaction = await tokenContract.methods.approve(WalletState.config.DHMLPPool_ABI, MAX_INT).send({ from: account });
                    if (!transaction.status) {
                        toast.show("授权失败");
                        return;
                    }
                }
            } else { //MXC
                payAmount = toWei(this.state.tokenAmounts[selIndex], 18);
                //支付MXC，设置5%滑点
                mxcValue = payAmount.mul(new BN(105)).div(new BN(100));
                if (this.state.balance.lt(mxcValue)) {
                    toast.show('MXC余额不足');
                }
            }
            const poolContract = new web3.eth.Contract(DHMLPPool_ABI, WalletState.config.DHMLPPool);
            let id = this.state.joinTokens[selIndex].id;
            //参与挖矿
            var estimateGas = await poolContract.methods.join(usdtAmount, id).estimateGas({ from: account, value: mxcValue });
            var transaction = await poolContract.methods.join(usdtAmount, id).send({ from: account, value: mxcValue });
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
    async claimReward() {
        let account = WalletState.wallet.account;
        if (!account) {
            this.connectWallet();
            return;
        }
        loading.show();
        try {
            const web3 = new Web3(Web3.givenProvider);
            const poolContract = new web3.eth.Contract(DHMLPPool_ABI, WalletState.config.DHMLPPool);
            var estimateGas = await poolContract.methods.claimReward(account).estimateGas({ from: account });
            var transaction = await poolContract.methods.claimReward(account).send({ from: account });
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

    //绑定上级输入框
    handleInvitorInChange(event) {
        let invitorIn = event.target.value;
        this.setState({ invitorIn: invitorIn });
    }

    async bindInvitor() {
        let account = WalletState.wallet.account;
        if (!account) {
            this.connectWallet();
            return;
        }
        loading.show();
        try {
            const web3 = new Web3(Web3.givenProvider);
            const poolContract = new web3.eth.Contract(DHMLPPool_ABI, WalletState.config.DHMLPPool);
            let invitor = this.state.invitorIn;
            var estimateGas = await poolContract.methods.bindInvitor(invitor).estimateGas({ from: account });
            var transaction = await poolContract.methods.bindInvitor(invitor).send({ from: account });
            if (transaction.status) {
                toast.show("绑定成功");
            } else {
                toast.show("绑定失败");
            }
        } catch (e) {
            console.log("e", e);
            toast.show(e.message);
        } finally {
            loading.hide();
        }
    }

    getItemClass(i) {
        if (i == this.state.selIndex) {
            return "Item Item-Sel";
        }
        return "Item Item-Nor";
    }

    setSelItem(i) {
        let selIndex = this.state.selIndex;
        if (selIndex == i) {

        } else {
            selIndex = i;
        }
        this.setState({
            selIndex: selIndex,
        });
    }


    //帮参与地址输入框
    handleHelpAccountChange(event) {
        let accountIn = event.target.value;
        this.setState({ helpAccountIn: accountIn });
    }

    //帮参与数量输入框变化，计算需要多少代币
    handleHelpAmountChange(event) {
        let amount = this.state.helpAmountIn;
        let helpMxcAmount = this.state.helpMxcAmount;
        let helpTokenAmount = this.state.helpTokenAmount;
        if (event.target.validity.valid) {
            amount = event.target.value;
            if (amount) {
                //帮参与支付数量
                let payUsdt = toWei(amount, this.state.usdtDecimals).mul(new BN(this.state.helpPayRate)).div(new BN(10000));
                let mxcUsdt = payUsdt.mul(new BN(this.state.helpPayMxcRate)).div(new BN(10000));
                let usdtUnit = toWei('1', this.state.usdtDecimals);
                //帮参与MXC数量
                let mxcAmount = this.state.mxcAmountPerUsdt.mul(mxcUsdt).div(usdtUnit);
                helpMxcAmount = showFromWei(mxcAmount, 18, 8);
                //帮参与REFI数量
                let refiAmount = this.state.tokenPerUsdt.mul(payUsdt.sub(mxcUsdt)).div(usdtUnit);
                helpTokenAmount = showFromWei(refiAmount, this.state.tokenDecimals, 6);
            } else {
                helpMxcAmount = '';
                helpTokenAmount = '';
            }
        }
        this.setState({ helpAmountIn: amount, helpMxcAmount: helpMxcAmount, helpTokenAmount: helpTokenAmount });
    }

    //帮参与
    async helpJoin() {
        if (WalletState.wallet.chainId != CHAIN_ID || !WalletState.wallet.account) {
            toast.show(CHAIN_ERROR_TIP);
            return;
        }
        loading.show();
        try {
            let amount = this.state.helpAmountIn;
            let usdtAmount = toWei(amount, this.state.usdtDecimals);
            if (usdtAmount.lt(this.state.minAmount)) {
                toast.show("最少参与" + this.state.showMinAmount);
            }
            let payTokenAmount = toWei(this.state.helpTokenAmount, this.state.tokenDecimals);
            let mxcValue = toWei(this.state.helpMxcAmount, 18);

            const web3 = new Web3(Web3.givenProvider);
            let account = WalletState.wallet.account;

            //支付MXC，设置5%滑点
            mxcValue = mxcValue.mul(new BN(105)).div(new BN(100));
            if (this.state.balance.lt(mxcValue)) {
                toast.show('MXC余额不足');
            }

            //代币
            if (this.state.tokenBalance.lt(payTokenAmount)) {
                toast.show('REFI余额不足');
            }
            let approvalNum = this.state.tokenAllowance;
            //LP授权额度不够了，需要重新授权
            if (approvalNum.lt(payTokenAmount)) {
                const tokenContract = new web3.eth.Contract(ERC20_ABI, this.state.tokenAddress);
                var transaction = await tokenContract.methods.approve(WalletState.config.DHMLPPool_ABI, MAX_INT).send({ from: account });
                if (!transaction.status) {
                    toast.show("授权失败");
                    return;
                }
            }

            const poolContract = new web3.eth.Contract(DHMLPPool_ABI, WalletState.config.DHMLPPool);
            //帮参与挖矿
            let helpAccount = this.state.helpAccountIn;
            var estimateGas = await poolContract.methods.helpJoin(helpAccount, usdtAmount).estimateGas({ from: account, value: mxcValue });
            var transaction = await poolContract.methods.helpJoin(helpAccount, usdtAmount).send({ from: account, value: mxcValue });
            if (transaction.status) {
                toast.show("帮参与成功");
            } else {
                toast.show("帮参与失败");
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
                        <div>REFI价格</div>
                        <div>{this.state.tokenPrice}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt5'>
                        <div>全网实时算力</div>
                        <div>{this.state.totalUsdt}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt5'>
                        <div>全网直推矿池算力</div>
                        <div>{this.state.totalInvitePoolAmount}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt5'>
                        <div>全网团队矿池算力</div>
                        <div>{this.state.totalTeamPoolAmount}</div>
                    </div>
                </div>

                <div className='Module ModuleTop'>
                    <div className='Items flex'>
                        {this.state.joinTokens.map((item, index) => {
                            return <div className={this.getItemClass(index)} key={index} onClick={this.setSelItem.bind(this, index)}>
                                <div className='flex align-center'>
                                    <div className='Unit'>{item.tokenSymbol}</div>
                                </div>
                            </div>
                        })}
                    </div>
                    <div className='InputBg mt10'>
                        <input className="Input" type="text" value={this.state.amountIn}
                            placeholder={'请输入数量,最少' + this.state.showMinAmount}
                            onChange={this.handleAmountChange.bind(this)} pattern="[0-9]*" >
                        </input>
                    </div>
                    <div className='mt10 prettyBg button' onClick={this.join.bind(this)}>{this.state.tokenAmounts[this.state.selIndex]} {this.state.joinTokens[this.state.selIndex].tokenSymbol}参与</div>
                    <div className='ModuleContentWitdh RuleTitle mt10'>
                        <div>余额</div>
                        <div>{this.state.showBalance} MXC / {this.state.showTokenBalance} {this.state.tokenSymbol}</div>
                    </div>
                </div>

                <div className='Module ModuleTop'>
                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>个人算力</div>
                        <div>{this.state.userAmount}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt5'>
                        <div>个人直推矿池算力</div>
                        <div>{this.state.invitePoolAmount}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt5'>
                        <div>个人团队矿池算力</div>
                        <div>{this.state.teamPoolAmount}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt5'>
                        <div>释放额度</div>
                        <div>{this.state.usdtRewardBalance}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt5'>
                        <div>释放速度</div>
                        <div>{this.state.dailyUsdtRewardAmount}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt5'>
                        <div>实时收益</div>
                        <div>{this.state.reward}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt5'>
                        <div>直推收益</div>
                        <div>{this.state.invitePoolReward}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt5'>
                        <div>团队收益</div>
                        <div>{this.state.teamPoolReward}</div>
                    </div>
                    <div className='mt10 prettyBg button' onClick={this.claimReward.bind(this)}>领取 {this.state.pendingToken} {this.state.tokenSymbol}</div>
                </div>




                <div className='Module ModuleTop'>
                    <div className='Title'>LP记录 {this.state.records.length}</div>
                    {this.state.records.map((item, index) => {
                        return <div className='mt5' key={index}>
                            <div className='ModuleContentWitdh RuleTitle'>
                                <div className=''>{index + 1}. {item.account}</div>
                                <div className=''>{item.amount}</div>
                            </div>
                        </div>
                    })}
                </div>

                <div className='mt20'></div>
            </div>
        );
    }
}

export default withNavigation(DHMLP);