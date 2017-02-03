"use strict";

const async = require("async");
const BTCE = require("btc-e");
const _ = require("lodash");
const moment = require("moment");
const StringScanner = require("strscan").StringScanner;
const BigNumber = require("bignumber.js");

const util = require("./util"); //custom functions

function Btce (options) {
    let btcePublic, btcePrivate;
    const self = this;
    self["options"] = options;

    const privateConfig = {
        activeOrders_noOrdersReturnMsg: "no orders",     // the error message returned by BTC-e's ActiveOrders API when no active orders
        tradeOrders_noOrdersReturnMsg: "no trades",       // the error message returned by BTC-e's TradeOrders API when no active orders
        transOrders_noOrdersReturnMsg: "no trans"       // the error message returned by BTC-e's TradeOrders API when no active orders
    };

    btcePublic = new BTCE();        // create an object which will be used for public API calls

    if (typeof options.key === "string" && typeof options.secret === "string") {
        btcePrivate = new BTCE(options.key, options.secret);
    } else {
        btcePrivate = btcePublic;
    }

    Object.getOwnPropertyNames(Object.getPrototypeOf(btcePrivate)).forEach(prop => {
        if (typeof  btcePrivate[prop] === 'function' && prop !== 'constructor') {
            self[prop] = btcePrivate[prop];
        }
    });

    self.getRate = function (options, callback) {
        self.getTicker(options, function(err, ticker) {
            let rate = {
                timestamp: util.timestampNow(),
                error: "",
                data: []
            };
            if (err) {
                rate.error = err.message;
                return callback(err, rate);
            }
            rate.timestamp = ticker.timestamp;
            let data = {
                pair: ticker.data[0].pair.toUpperCase(),
                rate: ticker.data[0].last.toString(),
            };
            rate.data.push(data);
            callback(err, rate);
        });
    };

    self.getTicker = function (options, callback) {
        if (!options)
            options = {};
        let currencies = typeof options.pair === 'string' && options.pair.toLowerCase().split('_') || ['', ''];
        let btcePair = `${currencies[0].replace(/xbt/i, 'btc')}_${currencies[1].replace(/xbt/i, 'btc')}`;
        btcePublic.ticker(btcePair, function (err, btceTicker) {
            // https://btc-e.com/api/3/ticker/btc_usd
            let ticker;
            if (err) {
                ticker = {
                    timestamp: util.timestampNow(),
                    error: err.message,
                    data: []
                };
            } else {
                ticker = {
                    timestamp: util.timestamp(btceTicker.ticker.updated),
                    error: "",
                    data: []
                };
                let data = {
                    pair: options.pair.toUpperCase(),
                    last: btceTicker.ticker.last.toString(),
                    bid: btceTicker.ticker.sell.toString(),
                    ask: btceTicker.ticker.buy.toString(),
                    volume: btceTicker.ticker.vol_cur.toString(),
                };
                ticker.data.push(data);
            }
            callback(err, ticker);
        });
    };

    self.getOrderBook = function (options, callback) {
        let currencies = typeof options.pair === 'string' && options.pair.toLowerCase().split('_') || ['', ''];
        let btcePair = `${currencies[0].replace(/xbt/i, 'btc')}_${currencies[1].replace(/xbt/i, 'btc')}`;
        btcePublic.depth(btcePair, function (err, btceDepth) {
            // https://btc-e.com/api/3/depth/btc_usd
            let orderBook;
            if (err) {
                orderBook = {
                    timestamp: util.timestampNow(),
                    error: err.message,
                    data: []
                };
            } else {
                orderBook = {
                    timestamp: util.timestampNow(),
                    error: "",
                    data: []
                };
                let data = {
                    pair: options.pair.toUpperCase(),
                    asks: [],
                    bids: []
                };
                orderBook.data.push(data);
                btceDepth.asks.forEach(function (element, index, asks) {
                    let order = {
                        price: element[0].toString(),
                        volume: element[1].toString(),
                    };
                    orderBook.data[0].asks.push(order);
                });
                btceDepth.bids.forEach(function (element, index, bids) {
                    let order = {
                        price: element[0].toString(),
                        volume: element[1].toString(),
                    };
                    orderBook.data[0].bids.push(order);
                });
            }
            callback(err, orderBook);
        });
    };

    self.getTrades = function (options, callback) {
        var trades;
        var err = new Error("Method not implemented");
        trades = {
            timestamp: util.timestampNow(),
            error: err.message,
            data: []
        };
        callback(err, trades);
    };

    self.getFee = function (options, callback) {
        let currencies = typeof options.pair === 'string' && options.pair.toLowerCase().split('_') || ['', ''];
        let btcePair = `${currencies[0].replace(/xbt/i, 'btc')}_${currencies[1].replace(/xbt/i, 'btc')}`;
        btcePublic.fee(btcePair, function (err, btceFee) {
            // https://btc-e.com/api/2/btc_usd/fee
            let fee = {
                timestamp: util.timestampNow(),
                error: "",
                data: []
            };
            if (err) {
                fee.error = err.message;
                return  callback(err, fee);
            }
                let data = {
                    pair: options.pair.toUpperCase(),
                    maker_fee: (btceFee.trade / 100).toString(),
                    taker_fee: (btceFee.trade / 100).toString(),
                };
                fee.data.push(data);
            callback(null, fee);
        });
    };

    self.getTransactions = function (options, callback) {
        var transactions;
        var err = new Error("Method not implemented");
        transactions = {
            timestamp: util.timestampNow(),
            error: err.message,
            data: []
        };
        callback(err, transactions);
    };

    self.getBalance = function (options, callback) {
        var balance;
        var err = new Error("Method not implemented");
        balance = {
            account_id: "",
            timestamp: util.timestampNow(),
            error: err.message,
            data: []
        };
        callback(err, balance);
    };

    self.getOpenOrders = function (options, callback) {
        let currencies = typeof options.pair === 'string' && options.pair.toLowerCase().split('_') || ['', ''];
        let btcePair = `${currencies[0].replace(/xbt/i, 'btc')}_${currencies[1].replace(/xbt/i, 'btc')}`;
        btcePrivate.activeOrders(btcePair, function (err, result) {
            let openOrders = {
                timestamp: util.timestampNow(),
                error: "",
                data: []
            };
            openOrders.timestamp = util.timestampNow();      // we update the tiomestamp due to the callback
            if (!err) {
                // var jf = require("jsonfile"); jf.writeFileSync(__dirname + "/bitstamp-getTransactions_MockApiResponse.json", result);     // only used to create MockApiResponse file for the test unit
                let activeOrders = result["return"];
                for (let record in activeOrders) {
                    let newOrder = {
                        order_id: record.toString(),
                        pair: activeOrders[record].pair.toUpperCase(),      //btc_usd
                        type: activeOrders[record].type,               // 'buy'
                        amount: activeOrders[record].amount.toString(),           // 2.85811
                        rate: activeOrders[record].rate.toString(),               // 444.064
                        margin: false,
                        status: activeOrders[record].status.toString(),           // 0
                        created_at: util.timestamp(activeOrders[record].timestamp_created)      // 1396619879
                    };
                    openOrders.data.push(newOrder);
                }
            }
            if (err && err.message === privateConfig.activeOrders_noOrdersReturnMsg)
            // if we have the error "Error: no orders" we will not return error
                err = null;
            openOrders.error = err ? err.message : "";
            callback(err, openOrders);
        });
    };

    function postOrder(type, options, callback) {
        let orderCallback = function (err, xResult) {
            let result = {
                timestamp: util.timestampNow(),
                error: '',
                data: []
            };
            if (err || xResult.hasOwnProperty('error')) {
                let error = err  || new Error(xResult.error);
                result.error = err.message;
                return callback(error, result);
            }

            // let jf = require("jsonfile").writeFileSync(`${__dirname}/btce-post${type}Order_MockApiResponse.json`, xResult, {spaces: 2});     // only used to create MockApiResponse file for the test unit

            let data = {
                order_id: xResult.return.order_id,
                created_at: '', //btce does not reply with a creation timestamp
            };
            result.data.push(data);
            return callback(null, result);
        };

        let currencyPair;
        if (options.hasOwnProperty('pair')) {
            let currencies = options.pair.split('_');
            let currencyA = currencies[0] && currencies[0].replace(/xbt/i, 'btc').toLocaleLowerCase() || '';
            let currencyB = currencies[1] && currencies[1].replace(/xbt/i, 'btc').toLocaleLowerCase() || '';
            currencyPair = `${currencyA}_${currencyB}`;
        } else {
            currencyPair = null;
        }
        let rate = options.rate || null;
        let amount = options.amount || null;

        btcePrivate.trade(currencyPair, type, rate, amount, orderCallback);
    }

    self.postSellOrder = function (options, callback) {
        postOrder('sell', options, callback);
    };

    self.postBuyOrder = function (options, callback) {
        postOrder('buy', options, callback);
    };

    self.cancelOrder = function (options, callback) {
        btcePrivate.cancelOrder(options.order_id, function(err, xResult) {
            let result = {
                timestamp: util.timestampNow(),
                error: '',
                data: []
            };
            if (err || xResult.hasOwnProperty('error')) {
                let error = err  || new Error(xResult.error);
                result.error = err.message;
                return callback(error, result);
            }
            return callback(null, result);
        });
    };
}

Btce.prototype.properties = {
    name: "BTC-e",              // Proper name of the exchange/provider
    slug: "btce",               // slug name of the exchange. Needs to be the same as the .js filename
    methods: {
        implemented: ["getRate", "getTicker", "getOrderBook", "getFee", "getOpenOrders", "postSellOrder", "postBuyOrder", "cancelOrder"],
        notSupported: ["getMarginPositions", "getLendBook", "getActiveOffers", "postOffer", "cancelOffer"]
    },
    instruments: [                  // all allowed currency/asset combinatinos (pairs) that form a market
        {
            pair: "XBT_USD"
        },
    ],
    publicAPI: {
        supported: true,            // is public API (not requireing user authentication) supported by this exchange?
        requires: []                // required parameters
    },
    privateAPI: {
        supported: true,            // is public API (requireing user authentication) supported by this exchange?
        requires: ["key", "secret"]
    },
    marketOrder: false,             // does it support market orders?
    infinityOrder: false,           // does it supports infinity orders?
                                    // (which means that it will accept orders bigger then the current balance and order at the full balance instead)
    monitorError: "",               //if not able to monitor this exchange, please set it to an URL explaining the problem
    tradeError: ""                  //if not able to trade at this exchange, please set it to an URL explaining the problem
};

module.exports = Btce;
