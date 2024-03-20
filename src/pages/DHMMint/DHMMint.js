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
import { DHMMintPool_ABI } from '../../abi/DHMMintPool_ABI';
import moment from 'moment';

class DHMMint extends Component {
    state = {
        chainId: 0,
        account: "",
        lang: "EN",
        local: {},
        amountIn: "",
        rewardRate: 20000,
        binders: [],
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
            const poolContract = new web3.eth.Contract(DHMMintPool_ABI, WalletState.config.DHMMintPool);
            //挖矿合约代币信息
            const tokenInfo = await poolContract.methods.getTokenInfo().call();
            //代币DHM合约
            let token = tokenInfo[0];
            //代币DHM符号
            let tokenSymbol = tokenInfo[1];
            //代币DHM精度
            let tokenDecimals = parseInt(tokenInfo[2]);
            //门票REFI合约
            let ticket = tokenInfo[3];
            //门票REFI符号
            let ticketSymbol = tokenInfo[4];
            //门票REFI精度
            let ticketDecimals = parseInt(tokenInfo[5]);
            //usdt精度固定18
            let usdtDecimals = 18;
            //挖矿合约基本信息
            const baseInfo = await poolContract.methods.getPoolInfo().call();
            //是否暂停
            let pause = baseInfo[0];
            //最少参与USDT数量
            let minAmount = new BN(baseInfo[1], 10);
            //当前总算力
            let totalAmount = new BN(baseInfo[2], 10);
            //直推池子算力
            let totalInvitePoolAmount = new BN(baseInfo[3], 10);
            //团队池子算力
            let totalTeamPoolAmount = new BN(baseInfo[4], 10);
            //1U有多少mxc
            let mxcAmountPerUsdt = new BN(baseInfo[5], 10);
            //1U有多少DHM代币
            let tokenPerUsdt = new BN(baseInfo[6], 10);
            //mxc比例，默认10%
            let mxcRate = parseInt(baseInfo[7]);
            //门票比例，默认100%
            let ticketRate = parseInt(baseInfo[8]);
            //计算MXC价格，价格=1U/1U的币数量*币的精度
            let mxcPrice = toWei('1', 18).mul(toWei('1', usdtDecimals)).div(mxcAmountPerUsdt);
            //代币价格
            let tokenPrice = toWei('1', tokenDecimals).mul(toWei('1', usdtDecimals), tokenDecimals).div(tokenPerUsdt);
            this.setState({
                pause: pause,
                minAmount: minAmount,
                showMinAmount: showFromWei(minAmount, usdtDecimals, 2),
                ticket: ticket,
                ticketDecimals: ticketDecimals,
                ticketSymbol: ticketSymbol,
                usdtDecimals: usdtDecimals,
                tokenAddress: token,
                tokenDecimals: tokenDecimals,
                tokenSymbol: tokenSymbol,
                mxcAmountPerUsdt: mxcAmountPerUsdt,
                tokenPerUsdt: tokenPerUsdt,
                mxcPrice: showFromWei(mxcPrice, usdtDecimals, 8),
                tokenPrice: showFromWei(tokenPrice, usdtDecimals, 12),
                ticketRate: ticketRate,
                showTicketRate: ticketRate / 100,
                mxcRate: mxcRate,
                showMxcRate: mxcRate / 100,
                totalAmount: showFromWei(totalAmount, tokenDecimals, 2),
                totalInvitePoolAmount: showFromWei(totalInvitePoolAmount, tokenDecimals, 2),
                totalTeamPoolAmount: showFromWei(totalTeamPoolAmount, tokenDecimals, 2),
            })

            let account = WalletState.wallet.account;
            if (account) {
                //用户挖矿信息
                const userInfo = await poolContract.methods.getUserInfo(account).call();
                console.log('userInfo', userInfo);
                //释放额度
                let rewardBalance = new BN(userInfo[0], 10);
                //实时算力
                let userAmount = rewardBalance.mul(new BN(10000)).div(new BN(this.state.rewardRate));
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
                //每日释放速度
                let dailyRewardAmount = new BN(userInfo[6], 10);
                //门票余额
                let ticketBalance = new BN(userInfo[7], 10);
                //门票授权
                let ticketAllowance = new BN(userInfo[8], 10);
                //总收益
                let totalReward = reward.add(invitePoolReward).add(teamPoolReward);
                if (totalReward.gt(rewardBalance)) {
                    totalReward = rewardBalance;
                }
                //收益换算成代币
                let pendingToken = totalReward;
                //领取要扣多少REFI
                let claimTicketAmount = pendingToken.mul(new BN(ticketRate)).div(new BN(10000))

                //用户其他信息
                const userExtInfo = await poolContract.methods.getUserExtInfo(account).call();
                console.log('userExtInfo', userExtInfo);
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
                    rewardBalance: showFromWei(rewardBalance, tokenDecimals, 2),
                    userAmount: showFromWei(userAmount, tokenDecimals, 2),
                    invitePoolAmount: showFromWei(invitePoolAmount, tokenDecimals, 2),
                    teamPoolAmount: showFromWei(teamPoolAmount, tokenDecimals, 2),
                    reward: showFromWei(reward, tokenDecimals, 6),
                    invitePoolReward: showFromWei(invitePoolReward, tokenDecimals, 6),
                    teamPoolReward: showFromWei(teamPoolReward, tokenDecimals, 6),
                    dailyRewardAmount: showFromWei(dailyRewardAmount, tokenDecimals, 6),
                    balance: balance,
                    showBalance: showFromWei(balance, 18, 6),
                    tokenBalance: tokenBalance,
                    showTokenBalance: showFromWei(tokenBalance, tokenDecimals, 2),
                    tokenAllowance: tokenAllowance,
                    teamNum: teamNum,
                    binderNum: binderNum,
                    teamStatus: teamStatus,
                    invitor: invitor,
                    teamAmount: showFromWei(teamAmount, tokenDecimals, 2),
                    largeSupplyAmount: showFromWei(largeSupplyAmount, tokenDecimals, 2),
                    inviteAmount: showFromWei(inviteAmount, tokenDecimals, 2),
                    pendingToken: pendingToken,
                    showPendingToken: showFromWei(pendingToken, tokenDecimals, 4),
                    ticketBalance: ticketBalance,
                    showTicketBalance: showFromWei(ticketBalance, ticketDecimals, 2),
                    ticketAllowance: ticketAllowance,
                    claimTicketAmount: showFromWei(claimTicketAmount, ticketDecimals, 4),
                })

                //直推列表
                let binders = [];
                let startIndex = 0;
                let pageSize = 100;
                let index = 0;
                while (true) {
                    //获取直推列表
                    let bindersResult = await poolContract.methods.getBinderList(account, startIndex, pageSize).call();
                    //直推列表
                    let binderList = bindersResult[0];
                    //算力列表
                    let amountList = bindersResult[1];
                    //有效记录条数
                    let len = amountList.length;
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
            this.onPriceChange(this.state.amountIn, mxcAmountPerUsdt, tokenPerUsdt, mxcRate);
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
        this.onPriceChange(amount, this.state.mxcAmountPerUsdt, this.state.tokenPerUsdt, this.state.mxcRate);
    }

    //获取到新价格时更新数据
    onPriceChange(amount, mxcAmountPerUsdt, tokenPerUsdt, mxcRate) {
        //自己参与数量变化
        let mxcAmount = '';
        let tokenAmount = '';
        if (amount) {
            amount = parseInt(amount);
            mxcAmount = mxcAmountPerUsdt.mul(new BN(amount)).mul(new BN(mxcRate)).div(new BN(10000));
            mxcAmount = showFromWei(mxcAmount, 18, 8);
            tokenAmount = tokenPerUsdt.mul(new BN(amount)).mul(new BN(10000 - mxcRate)).div(new BN(10000));
            tokenAmount = showFromWei(tokenAmount, this.state.tokenSymbol, 2);
        }
        this.setState({ mxcAmount: mxcAmount, tokenAmount: tokenAmount, });
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
            let usdtAmount = toWei(this.state.amountIn, this.state.usdtDecimals);
            const web3 = new Web3(Web3.givenProvider);
            let account = WalletState.wallet.account;
            //支付MXC，设置5%滑点
            let mxcValue = toWei(this.state.mxcAmount, 18);
            mxcValue = mxcValue.mul(new BN(105)).div(new BN(100));
            if (this.state.balance.lt(mxcValue)) {
                toast.show('MXC余额不足');
            }
            let tokenAmount = toWei(this.state.tokenAmount, this.state.tokenDecimals);
            //设置5%滑点
            tokenAmount = tokenAmount.mul(new BN(105)).div(new BN(100));
            if (this.state.tokenBalance.lt(tokenAmount)) {
                toast.show(this.state.tokenSymbol + '余额不足');
            }
            let approvalNum = this.state.tokenAllowance;
            let gasPrice = await web3.eth.getGasPrice();
            gasPrice = new BN(gasPrice, 10);
            //门票授权额度不够了，需要重新授权
            if (approvalNum.lt(tokenAmount)) {
                const tokenContract = new web3.eth.Contract(ERC20_ABI, this.state.tokenAddress);
                let estimateGas = await tokenContract.methods.approve(WalletState.config.DHMMintPool, MAX_INT).estimateGas({ from: account });
                estimateGas = new BN(estimateGas, 10).mul(new BN(150)).div(new BN(100));
                let transaction = await tokenContract.methods.approve(WalletState.config.DHMMintPool, MAX_INT).send({
                    from: account,
                    gas: estimateGas,
                    gasPrice: gasPrice,
                });
                if (!transaction.status) {
                    toast.show("授权失败");
                    return;
                }
            }

            const poolContract = new web3.eth.Contract(DHMMintPool_ABI, WalletState.config.DHMMintPool);
            //参与挖矿
            let estimateGas = await poolContract.methods.join(usdtAmount).estimateGas({ from: account, value: mxcValue });
            estimateGas = new BN(estimateGas, 10).mul(new BN(150)).div(new BN(100));
            let transaction = await poolContract.methods.join(usdtAmount).send({
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
    async claimReward() {
        let account = WalletState.wallet.account;
        if (!account) {
            this.connectWallet();
            return;
        }
        loading.show();
        try {
            const web3 = new Web3(Web3.givenProvider);
            let ticketAmount = this.state.pendingToken;
            //设置1%滑点，奖励会时刻在变
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
                let estimateGas = await tokenContract.methods.approve(WalletState.config.DHMMintPool, MAX_INT).estimateGas({ from: account });
                estimateGas = new BN(estimateGas, 10).mul(new BN(150)).div(new BN(100));
                let transaction = await tokenContract.methods.approve(WalletState.config.DHMMintPool, MAX_INT).send({
                    from: account,
                    gas: estimateGas,
                    gasPrice: gasPrice,
                });
                if (!transaction.status) {
                    toast.show("授权失败");
                    return;
                }
            }

            const poolContract = new web3.eth.Contract(DHMMintPool_ABI, WalletState.config.DHMMintPool);
            let estimateGas = await poolContract.methods.claimReward(account).estimateGas({ from: account });
            estimateGas = new BN(estimateGas, 10).mul(new BN(150)).div(new BN(100));
            let transaction = await poolContract.methods.claimReward(account).send({
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
                        <div>全网实时算力</div>
                        <div>{this.state.totalAmount}</div>
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
                    <div className='InputBg mt10'>
                        <input className="Input" type="text" value={this.state.amountIn}
                            placeholder={'请输入数量,最少' + this.state.showMinAmount}
                            onChange={this.handleAmountChange.bind(this)} pattern="[0-9]*" >
                        </input>
                    </div>
                    <div className='mt10 prettyBg button' onClick={this.join.bind(this)}>{this.state.mxcAmount}MXC+{this.state.tokenAmount}{this.state.tokenSymbol}参与</div>
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
                        <div>{this.state.rewardBalance}</div>
                    </div>
                    <div className='ModuleContentWitdh RuleTitle mt5'>
                        <div>释放速度</div>
                        <div>{this.state.dailyRewardAmount}</div>
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
                    <div className='mt10 prettyBg button' onClick={this.claimReward.bind(this)}>扣{this.state.claimTicketAmount}{this.state.ticketSymbol} 领取{this.state.showPendingToken} {this.state.tokenSymbol}</div>
                    <div className='ModuleContentWitdh RuleTitle'>
                        <div>{this.state.ticketSymbol}余额</div>
                        <div>{this.state.showTicketBalance}</div>
                    </div>
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
                </div>

                <div className='ModuleTop'>
                    <div className='Title flex center'>直推 {this.state.binders.length}</div>
                    {this.state.binders.map((item, index) => {
                        return <div className='Module mt5' key={index}>
                            <div className='ModuleContentWitdh RuleTitle'>
                                <div className=''>NO.{index + 1} </div>
                                <div className=''>{item.account}</div>
                            </div>
                            <div className='ModuleContentWitdh RuleTitle'>
                                <div className=''>算力:</div>
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

export default withNavigation(DHMMint);