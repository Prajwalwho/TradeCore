#include <gtest/gtest.h>
#include <stdexcept>
#include <vector>
#include "TestHelpers.hpp"

using namespace engine;

TEST(OrderBookTest, BestBidIsHighestAndBestAskIsLowest) {
    OrderBook book("AAPL");
    book.submitOrder(makeOrder("b1", Side::BUY, OrderType::LIMIT, 10, 189.0));
    book.submitOrder(makeOrder("b2", Side::BUY, OrderType::LIMIT, 10, 190.0));
    book.submitOrder(makeOrder("s1", Side::SELL, OrderType::LIMIT, 10, 192.0));
    book.submitOrder(makeOrder("s2", Side::SELL, OrderType::LIMIT, 10, 191.0));

    EXPECT_EQ(book.getBestBid(), 190.0);
    EXPECT_EQ(book.getBestAsk(), 191.0);
}

TEST(OrderBookTest, NonCrossingLimitOrderRests) {
    OrderBook book("AAPL");
    book.submitOrder(makeOrder("s1", Side::SELL, OrderType::LIMIT, 50, 191.0));

    auto buy = makeOrder("b1", Side::BUY, OrderType::LIMIT, 50, 190.0);
    auto trades = book.submitOrder(buy);

    EXPECT_TRUE(trades.empty());
    EXPECT_EQ(buy->getStatus(), OrderStatus::PENDING);
    EXPECT_EQ(buy->getRemainingQuantity(), 50);
    EXPECT_EQ(book.getBestBid(), 190.0);
    EXPECT_EQ(book.getBestAsk(), 191.0);
}

TEST(OrderBookTest, CrossingLimitTradesAtRestingPrice) {
    OrderBook book("AAPL");
    auto sell = makeOrder("s1", Side::SELL, OrderType::LIMIT, 100, 190.0);
    book.submitOrder(sell);

    auto buy = makeOrder("b1", Side::BUY, OrderType::LIMIT, 50, 191.0);
    auto trades = book.submitOrder(buy);

    ASSERT_EQ(trades.size(), 1u);
    EXPECT_EQ(trades[0].price, 190.0);   // resting order's price, not the buyer's 191
    EXPECT_EQ(trades[0].quantity, 50);
    EXPECT_EQ(buy->getStatus(), OrderStatus::FILLED);
    EXPECT_EQ(sell->getStatus(), OrderStatus::PARTIALLY_FILLED);
    EXPECT_EQ(sell->getRemainingQuantity(), 50);
    EXPECT_EQ(book.getBestAsk(), 190.0);
}

TEST(OrderBookTest, TimePriorityWithinPriceLevel) {
    OrderBook book("AAPL");
    auto first = makeOrder("sell-first", Side::SELL, OrderType::LIMIT, 30, 190.0);
    auto second = makeOrder("sell-second", Side::SELL, OrderType::LIMIT, 30, 190.0);
    book.submitOrder(first);
    book.submitOrder(second);

    auto buy = makeOrder("b1", Side::BUY, OrderType::LIMIT, 40, 190.0);
    auto trades = book.submitOrder(buy);

    ASSERT_EQ(trades.size(), 2u);
    EXPECT_EQ(trades[0].sellOrderId, "sell-first");
    EXPECT_EQ(trades[0].quantity, 30);
    EXPECT_EQ(trades[1].sellOrderId, "sell-second");
    EXPECT_EQ(trades[1].quantity, 10);
    EXPECT_EQ(second->getRemainingQuantity(), 20);
}

TEST(OrderBookTest, MarketBuySweepsMultipleLevels) {
    OrderBook book("AAPL");
    auto s1 = makeOrder("s1", Side::SELL, OrderType::LIMIT, 50, 190.0);
    auto s2 = makeOrder("s2", Side::SELL, OrderType::LIMIT, 50, 191.0);
    auto s3 = makeOrder("s3", Side::SELL, OrderType::LIMIT, 50, 192.0);
    book.submitOrder(s1);
    book.submitOrder(s2);
    book.submitOrder(s3);

    auto buy = makeOrder("m1", Side::BUY, OrderType::MARKET, 120);
    auto trades = book.submitOrder(buy);

    ASSERT_EQ(trades.size(), 3u);
    EXPECT_EQ(trades[0].price, 190.0);
    EXPECT_EQ(trades[0].quantity, 50);
    EXPECT_EQ(trades[1].price, 191.0);
    EXPECT_EQ(trades[1].quantity, 50);
    EXPECT_EQ(trades[2].price, 192.0);
    EXPECT_EQ(trades[2].quantity, 20);

    EXPECT_EQ(buy->getStatus(), OrderStatus::FILLED);
    EXPECT_EQ(s3->getRemainingQuantity(), 30);
    EXPECT_EQ(book.getBestAsk(), 192.0);
    EXPECT_EQ(book.getAskLevelCount(), 1u);
}

// Regression test for the Day 13 bug (BUY side).
TEST(OrderBookTest, MarketBuyPartialFillIsNotRejected) {
    OrderBook book("AAPL");
    book.submitOrder(makeOrder("s1", Side::SELL, OrderType::LIMIT, 30, 192.0));

    auto buy = makeOrder("m1", Side::BUY, OrderType::MARKET, 100);
    auto trades = book.submitOrder(buy);

    ASSERT_EQ(trades.size(), 1u);
    EXPECT_EQ(buy->getFilledQuantity(), 30);
    EXPECT_EQ(buy->getRemainingQuantity(), 70);
    EXPECT_EQ(buy->getStatus(), OrderStatus::PARTIALLY_FILLED);
    EXPECT_EQ(book.getAskLevelCount(), 0u);
}

TEST(OrderBookTest, MarketOrderWithNoLiquidityIsRejected) {
    OrderBook book("AAPL");
    auto buy = makeOrder("m1", Side::BUY, OrderType::MARKET, 10);
    auto trades = book.submitOrder(buy);

    EXPECT_TRUE(trades.empty());
    EXPECT_EQ(buy->getStatus(), OrderStatus::REJECTED);
}

TEST(OrderBookTest, SellCrossingBidTradesAtBidPrice) {
    OrderBook book("AAPL");
    auto buy = makeOrder("b1", Side::BUY, OrderType::LIMIT, 100, 191.0);
    book.submitOrder(buy);

    auto sell = makeOrder("s1", Side::SELL, OrderType::LIMIT, 60, 190.0);
    auto trades = book.submitOrder(sell);

    ASSERT_EQ(trades.size(), 1u);
    EXPECT_EQ(trades[0].price, 191.0);   // resting bid's price, not the seller's 190
    EXPECT_EQ(trades[0].quantity, 60);
    EXPECT_EQ(sell->getStatus(), OrderStatus::FILLED);
    EXPECT_EQ(buy->getRemainingQuantity(), 40);
    EXPECT_EQ(book.getBestBid(), 191.0);
}

// Regression test for the Day 13 bug (SELL side).
TEST(OrderBookTest, MarketSellPartialFillIsNotRejected) {
    OrderBook book("AAPL");
    book.submitOrder(makeOrder("b1", Side::BUY, OrderType::LIMIT, 30, 190.0));

    auto sell = makeOrder("m1", Side::SELL, OrderType::MARKET, 100);
    auto trades = book.submitOrder(sell);

    ASSERT_EQ(trades.size(), 1u);
    EXPECT_EQ(sell->getFilledQuantity(), 30);
    EXPECT_EQ(sell->getRemainingQuantity(), 70);
    EXPECT_EQ(sell->getStatus(), OrderStatus::PARTIALLY_FILLED);
    EXPECT_EQ(book.getBidLevelCount(), 0u);
}

TEST(OrderBookTest, CancelPartiallyFilledOrder) {
    OrderBook book("AAPL");
    auto sell = makeOrder("s1", Side::SELL, OrderType::LIMIT, 100, 190.0);
    book.submitOrder(sell);
    book.submitOrder(makeOrder("b1", Side::BUY, OrderType::LIMIT, 40, 190.0));

    EXPECT_EQ(book.cancelOrder("s1"), CancelResult::CANCELLED);
    EXPECT_EQ(sell->getStatus(), OrderStatus::CANCELLED);
    EXPECT_EQ(sell->getFilledQuantity(), 40);
    EXPECT_FALSE(book.getBestAsk().has_value());
}

TEST(OrderBookTest, CancelUnknownOrderReturnsNotFound) {
    OrderBook book("AAPL");
    EXPECT_EQ(book.cancelOrder("does-not-exist"), CancelResult::NOT_FOUND);
}

TEST(OrderBookTest, CancelFilledOrderReturnsNotFound) {
    OrderBook book("AAPL");
    book.submitOrder(makeOrder("s1", Side::SELL, OrderType::LIMIT, 50, 191.0));
    book.submitOrder(makeOrder("m1", Side::BUY, OrderType::MARKET, 50));

    EXPECT_EQ(book.cancelOrder("s1"), CancelResult::NOT_FOUND);
}

TEST(OrderBookTest, EventsAreEmittedInOrder) {
    OrderBook book("AAPL");
    std::vector<EngineEvent> events;
    book.setEventListener([&](const EngineEvent& e) { events.push_back(e); });

    book.submitOrder(makeOrder("s1", Side::SELL, OrderType::LIMIT, 100, 190.0));
    book.submitOrder(makeOrder("b1", Side::BUY, OrderType::LIMIT, 100, 190.0));

    ASSERT_EQ(events.size(), 4u);
    EXPECT_EQ(events[0].type, EventType::ORDER_RESTED);
    EXPECT_EQ(events[0].orderId, "s1");
    EXPECT_EQ(events[1].type, EventType::TRADE_EXECUTED);
    EXPECT_EQ(events[2].type, EventType::ORDER_FILLED);
    EXPECT_EQ(events[2].orderId, "s1");
    EXPECT_EQ(events[3].type, EventType::ORDER_FILLED);
    EXPECT_EQ(events[3].orderId, "b1");
}

TEST(OrderBookTest, WrongInstrumentThrows) {
    OrderBook book("AAPL");
    auto tsla = std::make_shared<Order>("t1", "acc", "TSLA", Side::BUY, OrderType::LIMIT, 10, 100.0);
    EXPECT_THROW(book.submitOrder(tsla), std::invalid_argument);
}

TEST(OrderBookTest, MarketBuyWithPriceCapStopsAtCapAndDoesNotRest) {
    OrderBook book("AAPL");
    book.submitOrder(makeOrder("s1", Side::SELL, OrderType::LIMIT, 50, 190.0));
    book.submitOrder(makeOrder("s2", Side::SELL, OrderType::LIMIT, 50, 191.0));
    auto s3 = makeOrder("s3", Side::SELL, OrderType::LIMIT, 50, 192.0);
    book.submitOrder(s3);

    // A market order that carries a price is a market order with a cap: never pays more than 191.
    auto buy = makeOrder("m1", Side::BUY, OrderType::MARKET, 120, 191.0);
    auto trades = book.submitOrder(buy);

    ASSERT_EQ(trades.size(), 2u);
    EXPECT_EQ(trades[0].price, 190.0);
    EXPECT_EQ(trades[1].price, 191.0);
    EXPECT_EQ(buy->getFilledQuantity(), 100);
    EXPECT_EQ(buy->getStatus(), OrderStatus::PARTIALLY_FILLED);
    EXPECT_EQ(s3->getRemainingQuantity(), 50);   // the 192 ask was never touched
    EXPECT_EQ(book.getBestAsk(), 192.0);
    EXPECT_EQ(book.getBidLevelCount(), 0u);      // and the unfilled remainder did not rest
}

TEST(OrderBookTest, MarketBuyWithCapBelowBestAskIsRejected) {
    OrderBook book("AAPL");
    book.submitOrder(makeOrder("s1", Side::SELL, OrderType::LIMIT, 50, 190.0));

    auto buy = makeOrder("m1", Side::BUY, OrderType::MARKET, 10, 189.0);
    auto trades = book.submitOrder(buy);

    EXPECT_TRUE(trades.empty());
    EXPECT_EQ(buy->getStatus(), OrderStatus::REJECTED);
    EXPECT_EQ(book.getBidLevelCount(), 0u);
}

TEST(OrderBookTest, MarketSellWithPriceFloorStopsAtFloor) {
    OrderBook book("AAPL");
    book.submitOrder(makeOrder("b1", Side::BUY, OrderType::LIMIT, 50, 191.0));
    book.submitOrder(makeOrder("b2", Side::BUY, OrderType::LIMIT, 50, 190.0));

    auto sell = makeOrder("m1", Side::SELL, OrderType::MARKET, 80, 191.0);   // won't accept less than 191
    auto trades = book.submitOrder(sell);

    ASSERT_EQ(trades.size(), 1u);
    EXPECT_EQ(trades[0].price, 191.0);
    EXPECT_EQ(sell->getFilledQuantity(), 50);
    EXPECT_EQ(sell->getStatus(), OrderStatus::PARTIALLY_FILLED);
    EXPECT_EQ(book.getBestBid(), 190.0);
    EXPECT_EQ(book.getAskLevelCount(), 0u);
}