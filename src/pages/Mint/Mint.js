import React, { Component } from 'react'
import { withNavigation } from '../../hocs'
import "../Token/Token.css"
import "../NFT/NFT.css"
import WalletState, { CHAIN_ID, ZERO_ADDRESS, CHAIN_ERROR_TIP, CHAIN_SYMBOL, MAX_INT } from '../../state/WalletState';
import loading from '../../components/loading/Loading'
import toast from '../../components/toast/toast'
import Web3 from 'web3'
import { ERC20_ABI } from "../../abi/erc20"
import { showCountdownTime, showFromWei, showLongAccount, toWei } from '../../utils'
import BN from 'bn.js'

import Header from '../Header';
import copy from 'copy-to-clipboard';
import { UPool_ABI } from '../../abi/UPool_ABI';
import moment from 'moment';

class Mint extends Component {
    state = {
        chainId: 0,
        account: "",
        lang: "EN",
        local: {},
        amountIn: "",
        rewardRate: 30000,
        binders: [],
        joinTokens: [{ tokenSymbol: 'REFI', id: 1 }, { tokenSymbol: 'MXC', id: 0 }],
        selIndex: 0,
        //保存需要多少代币，数组
        tokenAmounts: ['', ''],
        invitorIn: '',
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
            //挖矿合约
            const poolContract = new web3.eth.Contract(UPool_ABI, WalletState.config.UPool);
            //挖矿合约基本信息
            const baseInfo = await poolContract.methods.getBaseInfo().call();
            //USDT精度
            let usdtDecimals = parseInt(baseInfo[0]);
            //代币合约
            let tokenAddress = baseInfo[1];
            //代币符号
            let tokenSymbol = baseInfo[2];
            //代币精度
            let tokenDecimals = parseInt(baseInfo[3]);
            //是否暂停
            let pause = baseInfo[4];
            //最小参与
            let minAmount = new BN(baseInfo[5], 10);
            //全网实时算力
            let totalUsdt = new BN(baseInfo[6], 10);
            //全网直推算力
            let totalInvitePoolAmount = new BN(baseInfo[7], 10);
            //全网团队算力
            let totalTeamPoolAmount = new BN(baseInfo[8], 10);
            //1U有多少mxc
            let mxcAmountPerUsdt = new BN(baseInfo[9], 10);
            //1U有多少REFI代币
            let tokenPerUsdt = new BN(baseInfo[10], 10);
            //计算MXC价格，价格=1U/1U的币数量*币的精度
            let mxcPrice = toWei('1', 18).mul(toWei('1', usdtDecimals)).div(mxcAmountPerUsdt);
            //代币价格
            let tokenPrice = toWei('1', tokenDecimals).mul(toWei('1', usdtDecimals), tokenDecimals).div(tokenPerUsdt);

            //获取其他信息
            let extInfoResult = await poolContract.methods.getExtInfo().call();
            //帮支付付款比例，分母1万
            let helpPayRate = parseInt(extInfoResult[0]);
            //帮支付MXC比例，分母1万
            let helpPayMxcRate = parseInt(extInfoResult[1]);
            //领取收益手续费，分母1万
            let rewardFee = parseInt(extInfoResult[2]);
            //默认上级，首码地址
            let defaultInvitor = extInfoResult[3];
            this.setState({
                usdtDecimals: usdtDecimals,
                tokenAddress: tokenAddress,
                tokenDecimals: tokenDecimals,
                tokenSymbol: tokenSymbol,
                pause: pause,
                minAmount: minAmount,
                showMinAmount: showFromWei(minAmount, usdtDecimals, 2),
                totalUsdt: showFromWei(totalUsdt, usdtDecimals, 2),
                totalInvitePoolAmount: showFromWei(totalInvitePoolAmount, usdtDecimals, 2),
                totalTeamPoolAmount: showFromWei(totalTeamPoolAmount, usdtDecimals, 2),
                mxcAmountPerUsdt: mxcAmountPerUsdt,
                tokenPerUsdt: tokenPerUsdt,
                helpPayRate: helpPayRate,
                helpPayMxcRate: helpPayMxcRate,
                rewardFee: rewardFee,
                defaultInvitor: defaultInvitor,
                mxcPrice: showFromWei(mxcPrice, usdtDecimals, 8),
                tokenPrice: showFromWei(tokenPrice, usdtDecimals, 12),
            })

            let account = WalletState.wallet.account;
            if (account) {
                //用户挖矿信息
                const userInfo = await poolContract.methods.getUserInfo(account).call();
                //释放额度
                let usdtRewardBalance = new BN(userInfo[0], 10);
                //实时算力
                let userAmount = usdtRewardBalance.mul(new BN(10000)).div(new BN(this.state.rewardRate));
                //参与挖矿的邀请算力
                let invitePoolAmount = new BN(userInfo[1], 10);
                //参与挖矿的团队算力
                let teamPoolAmount = new BN(userInfo[2], 10);
                //静态奖励
                let reward = new BN(userInfo[3], 10);
                //直推奖励
                let invitePoolReward = new BN(userInfo[4], 10);
                //团队奖励
                let teamPoolReward = new BN(userInfo[5], 10);
                //是否激活，绑定上级就算激活
                let active = userInfo[6];
                //每日释放速度
                let dailyUsdtRewardAmount = new BN(userInfo[7], 10);
                //最后一次领取静态奖励的时间
                let lastRewardTime = parseInt(userInfo[8]);
                //总收益
                let totalReward = reward.add(invitePoolReward).add(teamPoolReward);
                if (totalReward.gt(usdtRewardBalance)) {
                    totalReward = usdtRewardBalance;
                }
                //收益换算成代币
                let pendingToken = totalReward.mul(tokenPerUsdt).div(toWei('1', usdtDecimals));

                //用户其他信息
                const userExtInfo = await poolContract.methods.getUserExtInfo(account).call();
                //mxc余额
                let balance = new BN(userExtInfo[0], 10);
                //代币余额
                let tokenBalance = new BN(userExtInfo[1], 10);
                //代币授权额度
                let tokenAllowance = new BN(userExtInfo[2], 10);
                //团队人数
                let teamNum = parseInt(userExtInfo[3]);
                //直推人数
                let binderNum = parseInt(userExtInfo[4]);
                //团队等级，1=小型，2=中型，3=大型
                let teamStatus = parseInt(userExtInfo[5]);
                //上级邀请人
                let invitor = userExtInfo[6];
                //团队总业绩
                let teamAmount = new BN(userExtInfo[7], 10);
                //大区贡献业绩
                let largeSupplyAmount = new BN(userExtInfo[8], 10);
                //直推业绩
                let inviteAmount = new BN(userExtInfo[9], 10);
                this.setState({
                    usdtRewardBalance: showFromWei(usdtRewardBalance, usdtDecimals, 2),
                    userAmount: showFromWei(userAmount, usdtDecimals, 2),
                    invitePoolAmount: showFromWei(invitePoolAmount, usdtDecimals, 2),
                    teamPoolAmount: showFromWei(teamPoolAmount, usdtDecimals, 2),
                    reward: showFromWei(reward, usdtDecimals, 6),
                    invitePoolReward: showFromWei(invitePoolReward, usdtDecimals, 6),
                    teamPoolReward: showFromWei(teamPoolReward, usdtDecimals, 6),
                    dailyUsdtRewardAmount: showFromWei(dailyUsdtRewardAmount, usdtDecimals, 6),
                    balance: balance,
                    showBalance: showFromWei(balance, 18, 6),
                    tokenBalance: tokenBalance,
                    showTokenBalance: showFromWei(tokenBalance, tokenDecimals, 2),
                    tokenAllowance: tokenAllowance,
                    active: active,
                    teamNum: teamNum,
                    binderNum: binderNum,
                    teamStatus: teamStatus,
                    invitor: invitor,
                    teamAmount: showFromWei(teamAmount, usdtDecimals, 2),
                    largeSupplyAmount: showFromWei(largeSupplyAmount, usdtDecimals, 2),
                    inviteAmount: showFromWei(inviteAmount, usdtDecimals, 2),
                    pendingToken: showFromWei(pendingToken, tokenDecimals, 4),
                })

                //直推列表
                let binders = [];
                let startIndex = 0;
                let pageSize = 100;
                let index = 0;
                while (true) {
                    //获取直推列表
                    let bindersResult = await poolContract.methods.getBinderList(account, startIndex, pageSize).call();
                    //有效记录条数
                    let len = parseInt(bindersResult[0]);
                    //直推列表
                    let binderList = bindersResult[1];
                    //算力列表
                    let amountList = bindersResult[2];
                    for (let i = 0; i < len; ++i) {
                        binders.push({
                            account: showLongAccount(binderList[i]),
                            amount: showFromWei(amountList[i], usdtDecimals, 2),
                        });
                        index++;
                    }
                    if (len < pageSize) {
                        break;
                    }
                    startIndex += pageSize;
                }

                this.setState({
                    binders: binders
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
        return moment(new BN(timestamp, 10).mul(new BN(1000)).toNumber()).format("YYYY-MM-DD HH:mm:ss");
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
                    var transaction = await tokenContract.methods.approve(WalletState.config.UPool, MAX_INT).send({ from: account });
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
            const poolContract = new web3.eth.Contract(UPool_ABI, WalletState.config.UPool);
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
            const poolContract = new web3.eth.Contract(UPool_ABI, WalletState.config.UPool);
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
            const poolContract = new web3.eth.Contract(UPool_ABI, WalletState.config.UPool);
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
                var transaction = await tokenContract.methods.approve(WalletState.config.UPool, MAX_INT).send({ from: account });
                if (!transaction.status) {
                    toast.show("授权失败");
                    return;
                }
            }

            const poolContract = new web3.eth.Contract(UPool_ABI, WalletState.config.UPool);
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
                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>上级邀请人</div>
                        <div>{showLongAccount(this.state.invitor)}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt5'>
                        <div>团队人数</div>
                        <div>{this.state.teamNum}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt5'>
                        <div>团队总业绩</div>
                        <div>{this.state.teamAmount}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt5'>
                        <div>大区贡献业绩</div>
                        <div>{this.state.largeSupplyAmount}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt5'>
                        <div>团队级别</div>
                        <div>{this.state.teamStatus}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt5'>
                        <div>直推业绩</div>
                        <div>{this.state.inviteAmount}</div>
                    </div>

                    <div className='InputBg mt10'>
                        <input className="Input" type="text" value={this.state.invitorIn}
                            placeholder={'请输入上级地址'}
                            onChange={this.handleInvitorInChange.bind(this)} >
                        </input>
                    </div>
                    <div className='mt20 prettyBg button' onClick={this.bindInvitor.bind(this)}>绑定上级</div>
                </div>

                <div className='Module ModuleTop'>
                    <div className='Title'>帮参与</div>
                    <div className='InputBg mt10'>
                        <input className="Input" type="text" value={this.state.helpAmountIn}
                            placeholder={'请输入数量,最少' + this.state.showMinAmount}
                            onChange={this.handleHelpAmountChange.bind(this)} pattern="[0-9]*" >
                        </input>
                    </div>
                    <div className='InputBg mt10'>
                        <input className="Input" type="text" value={this.state.helpAccountIn}
                            placeholder={'请输入帮参与地址'}
                            onChange={this.handleHelpAccountChange.bind(this)} >
                        </input>
                    </div>
                    <div className='mt10 prettyBg button' onClick={this.helpJoin.bind(this)}>{this.state.helpMxcAmount} MXC + {this.state.helpTokenAmount} {this.state.tokenSymbol} 参与</div>
                    <div className='ModuleContentWitdh RuleTitle mt10'>
                        <div>余额</div>
                        <div>{this.state.showBalance} MXC / {this.state.showTokenBalance} {this.state.tokenSymbol}</div>
                    </div>
                </div>

                <div className='Module ModuleTop'>
                    <div className='Title'>直推人数 {this.state.binderNum}</div>
                    {this.state.binders.map((item, index) => {
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

export default withNavigation(Mint);